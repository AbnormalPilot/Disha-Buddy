#!/usr/bin/env python3
"""Nightly cheap cache refresh (HANDOVER.md §3.3c) — seeded to
$HERMES_HOME/scripts/nightly_refresh.py, run by a --no-agent cron job
at a low-traffic hour. Re-crawls only the NIRF rankings page (cheap,
1 page, no deep crawl) rather than the full college dataset — the
point is catching a ranking/listing change, not re-scraping every
college's own site nightly (that's what the manual, operator-run
scripts/crawl_colleges.py is for).

Imports from scripts/crawl_colleges.py, which lives in the TOP-LEVEL
scripts/ directory (bind-mounted to /opt/hermes/scripts by
docker-compose.yml) rather than $HERMES_HOME/scripts/ where THIS file
lives — two different "scripts" namespaces (one for cron's --script
convention, one for the operator-run manual crawler), reconciled here
with an explicit sys.path append.
"""
from __future__ import annotations

import sys

sys.path.insert(0, "/opt/hermes/scripts")

try:
    from crawl_colleges import SEEDS, poll_crawl, start_crawl, normalize, slugify, OUTPUT_DIR
except ImportError as exc:
    print(f"nightly_refresh: could not import crawl_colleges.py — {exc}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    nirf_seed = next((s for s in SEEDS if "nirfindia" in s["url"]), None)
    if nirf_seed is None:
        print("nightly_refresh: no NIRF seed configured, nothing to do")
        return
    print(f"Refreshing {nirf_seed['url']} ...")
    try:
        job_id = start_crawl(nirf_seed["url"], max_pages=nirf_seed["max_pages"], max_depth=nirf_seed["max_depth"])
        pages = poll_crawl(job_id)
    except Exception as exc:
        print(f"nightly_refresh FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
    saved = 0
    for raw_page in pages:
        record = normalize(raw_page)
        if record is None:
            continue
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        (OUTPUT_DIR / f"{slugify(record['name'])}.json").write_text(__import__("json").dumps(record, indent=2))
        saved += 1
    print(f"nightly_refresh: {saved} record(s) refreshed")


if __name__ == "__main__":
    main()
