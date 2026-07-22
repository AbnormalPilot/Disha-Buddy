# Disha Buddy — project guide for AI agents and new teammates

Disha Buddy is a Telegram bot ("Disha") that helps Indian students (16-18)
find colleges: it remembers their marks/budget/deadlines, texts them first
when something needs attention, and speaks Hinglish. Entry for the India AI
Impact Festival 2026.

## Architecture (two containers + one managed DB)

```
Telegram <-> hermes container (bot gateway + agent, port 8300 internal only)
                 |  control plane API (X-Control-Token)      ^ CRM ingest (HTTP)
                 v                                           |
             web container (Next.js 14, port 3000) ----> Neon Postgres
             landing page + /crm dashboard + /hermes setup wizard
```

- **hermes/** — a fork of the Hermes agent gateway. Disha-specific code lives in
  `hermes/control_plane/` (setup wizard backend, gateway control, cron seeding),
  `hermes/disha/` (CRM client, student store, seed cron scripts), and
  `hermes/plugins/`. Upstream code is everything else — prefer minimal,
  well-commented diffs there and check `hermes/CUSTOMIZATIONS.md`.
- **web/** — Next.js 14 (App Router, Tailwind v3). Landing page (`app/Landing.tsx`,
  GSAP), CRM dashboard (`app/crm/`), setup wizard UI (`app/hermes/`), API routes
  (`app/api/`).
- **Neon Postgres** is the only CRM datastore (`students`, `events` tables;
  schema in `web/lib/db.ts`). **Only the web container talks to the DB.**
  Hermes reads/writes CRM data exclusively through the web API with
  `X-Ingest-Token` (see `hermes/disha/crm_client.py`). Keep it that way.
- `data/` — bind-mounted volume: `hermes-home/` (Hermes config/state) and
  `colleges/` (crawled college JSON). `crm.sqlite` is the pre-Neon store,
  kept only as a backup (migration: `web/scripts/migrate-sqlite-to-neon.mjs`).

## Everyday commands

```bash
make dev      # build + start everything (docker compose up -d --build)
make logs     # follow logs
make down     # stop
cd web && npx next build         # typecheck/build the web app locally
docker exec fest-hermes-1 hermes cron list   # inspect scheduled jobs
```

Local URLs: landing http://localhost:3000/ · CRM http://localhost:3000/crm ·
setup wizard http://localhost:3000/hermes

## Environment (.env at repo root, see .env.example)

- `CONTROL_TOKEN` — web -> hermes control-plane auth. Never sent to the browser
  (proxied via `web/app/api/hermes/[...path]/route.ts`).
- `CRM_INGEST_TOKEN` — hermes -> web CRM ingest auth.
- `NEON_CONNECTION_STRING` — Neon Postgres URL, mapped to `DATABASE_URL` in
  compose. The team shares one Neon project; use Neon branches for risky
  experiments.

Runtime bot config (Telegram token, Gemini key, model) lives in
`data/hermes-home/config.yaml` + `data/hermes-home/.env`, written by the
/hermes setup wizard through `hermes/control_plane/config_writer.py`. Edit via
the wizard or that writer, not by hand, so a wizard re-run can't silently
undo you.

## Conventions and gotchas

- **Students never see ops chrome.** `display.*` in config.yaml keeps progress
  bubbles/heartbeats off and `telegram.gateway_restart_notification: false`
  suppresses restart pings. Don't re-enable these globally.
- **Provider/model switches:** `model.provider` and `model.default` must match
  (a stale cross-provider `model.default` 404s every message; the wizard
  handles this now, see config_writer.py).
- **Gateway restarts drop in-flight turns.** The CRM open-access toggle and the
  wizard both restart the gateway; avoid restarting during demos.
- **CRM events are one-line summaries, never transcripts** (privacy rule).
  Event types are the `EVENT_TYPES` list in `web/lib/db.ts` — the ingest API
  rejects unknown types, so add new types there first.
- **Proactive messaging:** three seeded cron jobs (`hermes/control_plane/cron_seed.py`):
  deadline sweep 08:00 IST, nightly college refresh 02:00, engagement follow-up
  18:30 (selection policy in `web/app/api/students/follow-up-candidates/route.ts`
  — one ping/student/week max, 15/run cap, skips flagged students). Keep every
  proactive feature non-pushy: concrete reason per message, hard caps in code,
  never leave frequency to the LLM.
- **Safety scope:** minors-facing product. No terminal toolset for the chat
  agent, no document uploads, no caste/category questions, never guarantee
  admissions. Don't loosen `agent.disabled_toolsets` or the persona rules in
  `hermes/control_plane/persona.py` without an explicit decision.
- **Landing page** uses GSAP via `useGSAP` with `gsap.matchMedia()` gating all
  motion behind `prefers-reduced-motion`; keep that pattern for new animation.
  Demo chat content is hard-coded on purpose (deterministic, no student data).
- Timestamps: Postgres returns ISO-with-Z; old migrated rows may be naive UTC.
  Parse with `parseUtc()` from `web/app/crm/types.ts`, never `new Date(x + "Z")`.

## Where to look first

- `HANDOVER.md` — product decisions and section-numbered history.
- `hermes/control_plane/config_writer.py` — how wizard fields map to Hermes config.
- `web/lib/db.ts` — schema + the `q()` query helper.
- `hermes/disha/seed/scripts/` — the cron scripts that make Disha proactive.
