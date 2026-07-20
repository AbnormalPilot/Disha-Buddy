#!/usr/bin/env python3
"""One-shot batch crawler: NIRF top-ranked engineering colleges + UP/AKTU
colleges, normalized into /data/colleges/*.json.

Run inside the hermes container (scripts/ is bind-mounted there, not
baked into the image, so this can be edited/re-run without a rebuild):

    docker compose run hermes python scripts/crawl_colleges.py

Requires DATABLUE_API_KEY in the environment — the /hermes wizard's Data
step writes this to $HERMES_HOME/.env via `hermes config set`, and
`docker compose run` inherits the same environment as the hermes
service, so this Just Works once the wizard's been through.

DataBlue's crawl API is job-based and async (confirmed live against
https://docs.datablue.dev on 2026-07-20 — see hermes/CUSTOMIZATIONS.md-
style research note below): POST /v1/crawl starts a job and returns a
job_id; GET /v1/crawl/{job_id} polls for status, with completed results
in a paginated `data` array. Both endpoints use
`Authorization: Bearer <key>`. When a `scrape_options.extract` block
(prompt + JSON schema) is included, each result page carries the
schema-matched object under `extract` (confirmed via the single-page
/v1/scrape example, which is the same underlying extraction engine).

Cache-first is a hard product rule (AGENTS.md's Data discipline
section) — DataBlue credits are limited, and this script is meant to
run occasionally (a cron-refreshed subset, or a manual re-run), not on
every chat turn. The gateway/agent side reads the JSON files this
script writes; it never calls DataBlue directly for facts that don't
need live freshness.
"""
from __future__ import annotations

import json
import os
import re
import sys
import time
from pathlib import Path

import httpx

DATABLUE_API_KEY = os.environ.get("DATABLUE_API_KEY", "")
BASE_URL = "https://api.datablue.dev"
OUTPUT_DIR = Path(os.environ.get("DISHA_COLLEGES_DIR", "/data/colleges"))

_TIMEOUT = 60.0
_POLL_INTERVAL_S = 5.0
_POLL_TIMEOUT_S = 900.0

# Matches the normalized college record shape from HANDOVER.md §3.3:
# {name, city, state, courses[], fees_per_year, cutoff_hint,
#  exams_accepted, hostel, source_url, scraped_at}
EXTRACT_SCHEMA = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "city": {"type": "string"},
        "state": {"type": "string"},
        "courses": {"type": "array", "items": {"type": "string"}},
        "fees_per_year": {"type": "string"},
        "cutoff_hint": {"type": "string"},
        "exams_accepted": {"type": "array", "items": {"type": "string"}},
        "hostel": {"type": "boolean"},
    },
}
EXTRACT_PROMPT = (
    "If this page is about a specific college or university, extract its "
    "name, city, state, the courses/branches it offers, approximate "
    "annual fees, any cutoff rank or percentile mentioned, which "
    "entrance exams it accepts (e.g. JEE Main, JEE Advanced, CUET, UPCET), "
    "and whether hostel accommodation is available. If the page is not "
    "about a specific college (e.g. a rankings index or nav page), leave "
    "fields blank rather than guessing."
)

# Seed URLs — real, verified sources (checked live 2026-07-20):
#   - NIRF: India's official Ministry of Education engineering rankings
#   - AKTU: Uttar Pradesh's technical university, affiliates most UP
#     engineering colleges (this is a shallow crawl from the homepage;
#     AKTU doesn't publish one canonical affiliated-colleges directory
#     page, so depth/page-count here is a starting point, not
#     comprehensive — see the README note this script prints at the end).
SEEDS = [
    {
        "url": "https://www.nirfindia.org/Rankings/2025/EngineeringRanking.html",
        "max_pages": 1,
        "max_depth": 0,
    },
    {
        "url": "https://aktu.ac.in",
        "max_pages": 80,
        "max_depth": 2,
    },
]


def _headers() -> dict:
    if not DATABLUE_API_KEY:
        print(
            "ERROR: DATABLUE_API_KEY is not set. Configure DataBlue in the "
            "/hermes wizard's Data step first.",
            file=sys.stderr,
        )
        sys.exit(1)
    return {"Authorization": f"Bearer {DATABLUE_API_KEY}", "Content-Type": "application/json"}


def start_crawl(seed_url: str, *, max_pages: int, max_depth: int) -> str:
    body = {
        "url": seed_url,
        "max_pages": max_pages,
        "max_depth": max_depth,
        "concurrency": 4,
        "crawl_strategy": "bfs",
        "allow_external_links": False,
        "respect_robots_txt": True,
        "scrape_options": {
            "formats": ["markdown"],
            "only_main_content": True,
            "extract": {"prompt": EXTRACT_PROMPT, "schema": EXTRACT_SCHEMA},
        },
    }
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(f"{BASE_URL}/v1/crawl", headers=_headers(), json=body)
        resp.raise_for_status()
        data = resp.json()
    if not data.get("success"):
        raise RuntimeError(f"crawl start failed: {data}")
    return data["job_id"]


def poll_crawl(job_id: str) -> list[dict]:
    deadline = time.monotonic() + _POLL_TIMEOUT_S
    results: list[dict] = []
    page = 1
    with httpx.Client(timeout=_TIMEOUT) as client:
        while time.monotonic() < deadline:
            resp = client.get(
                f"{BASE_URL}/v1/crawl/{job_id}", headers=_headers(), params={"page": page}
            )
            resp.raise_for_status()
            data = resp.json()
            status = data.get("status")
            if status == "completed":
                page_results = data.get("data", [])
                results.extend(page_results)
                total = data.get("total_results", len(results))
                if len(results) >= total or not page_results:
                    return results
                page += 1
                continue
            if status in ("failed", "cancelled"):
                raise RuntimeError(f"crawl job {job_id} ended with status={status}")
            print(
                f"  ...{job_id}: {data.get('completed_pages', 0)}/"
                f"{data.get('total_pages', '?')} pages ({status})"
            )
            time.sleep(_POLL_INTERVAL_S)
    raise TimeoutError(f"crawl job {job_id} did not complete within {_POLL_TIMEOUT_S}s")


def normalize(raw_page: dict) -> dict | None:
    extract = raw_page.get("extract") or {}
    name = (extract.get("name") or "").strip()
    if not name:
        return None  # non-college page (index, nav, etc.) — extract prompt asked it to skip these
    return {
        "name": name,
        "city": extract.get("city"),
        "state": extract.get("state"),
        "courses": extract.get("courses") or [],
        "fees_per_year": extract.get("fees_per_year"),
        "cutoff_hint": extract.get("cutoff_hint"),
        "exams_accepted": extract.get("exams_accepted") or [],
        "hostel": extract.get("hostel"),
        "source_url": raw_page.get("url"),
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80] or "unnamed"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    total_saved = 0
    total_skipped = 0

    for seed in SEEDS:
        print(f"Crawling {seed['url']} (max_pages={seed['max_pages']}, max_depth={seed['max_depth']}) ...")
        try:
            job_id = start_crawl(seed["url"], max_pages=seed["max_pages"], max_depth=seed["max_depth"])
            pages = poll_crawl(job_id)
        except Exception as exc:
            print(f"  FAILED: {exc}", file=sys.stderr)
            continue

        saved_here = 0
        for raw_page in pages:
            record = normalize(raw_page)
            if record is None:
                total_skipped += 1
                continue
            out_path = OUTPUT_DIR / f"{slugify(record['name'])}.json"
            out_path.write_text(json.dumps(record, indent=2))
            saved_here += 1
        total_saved += saved_here
        print(f"  {len(pages)} pages crawled, {saved_here} college records saved")

    print(f"\nDone: {total_saved} college records written to {OUTPUT_DIR} ({total_skipped} non-college pages skipped)")
    if total_saved < 100:
        print(
            "NOTE: fewer than 100 records — the AKTU seed is a shallow "
            "homepage crawl, not a canonical affiliated-colleges "
            "directory (AKTU doesn't publish one single page listing "
            "all affiliates). Widen SEEDS with more specific UP college "
            "directory/list pages to reach full coverage (HANDOVER.md §8 "
            "checklist item 7 targets >=100 UP colleges + NIRF).",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
