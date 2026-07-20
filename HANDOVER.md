# HANDOVER — "Disha Buddy" (working name, feel free to rename)

> **Scope amendment (2026-07-20):** voice-note support (§2.3, the
> Voice wizard step in §6.1, the `voice_note` CRM event type in §6.2,
> and every other voice/transcription reference below) has been cut
> from scope. Disha is **text-only** — Hindi, English, and Hinglish.
> Everything below is preserved as the original brief; where it
> mentions voice, treat it as superseded by this note rather than
> edited in place, so the historical record of what was actually asked
> for stays intact.

**Read this whole file before writing any code.**

You are building a self-contained, dockerized system for the **India AI Impact Festival 2026** submission (deadline: **July 26, 2026** — hard, six days):

1. **A customized Hermes Agent** — we vendor the `NousResearch/hermes-agent` source into this repo and modify its core for our product: a Telegram AI buddy that helps Indian students find the right university/college. Persistent per-student memory, warm Hinglish persona, voice-note support, proactive deadline reminders, and **code-level CRM event hooks**.
2. **A Next.js app** (no user auth) with:
   - a **beautiful landing page** at `/`
   - a **mini CRM dashboard** at `/crm`
   - a **`/hermes` setup & control page** — one-time wizard to configure everything (tokens, keys, persona) and start/stop/monitor the agent. No SSH, no `hermes setup` CLI, no local install steps for the operator. `docker compose up` + open `/hermes` = fully running system.

The company behind this is **DataBlue** (https://www.datablue.dev) — our own LLM web-scraper API. DataBlue is the data layer (batch crawls + live MCP lookups).

---

## 0. Repo layout

```
disha-buddy/
├── HANDOVER.md
├── docker-compose.yml           # THE way to run everything
├── .env.example                 # only compose-level secrets (see §6)
├── hermes/                      # vendored hermes-agent source (customized)
│   ├── UPSTREAM.md              # upstream repo URL + exact commit we vendored
│   ├── CUSTOMIZATIONS.md        # every core change: file, what, why (keep current!)
│   ├── control_plane/           # NEW: FastAPI control API (§4)
│   ├── disha/                   # NEW: our modules (crm hooks, persona, defaults)
│   └── ... (upstream tree)
├── web/                         # Next.js 14+ App Router, TypeScript, Tailwind
│   └── app/{page.tsx, crm/, hermes/, api/}
├── data/                        # single bind-mounted volume, shared by both containers
│   ├── config/                  # runtime config written by the /hermes wizard
│   ├── crm.sqlite               # CRM DB (owned by web)
│   ├── hermes-home/             # the agent's HERMES_HOME (memory, sessions, skills)
│   └── colleges/                # cached college dataset from DataBlue crawls
└── scripts/crawl_colleges.py    # one-shot DataBlue batch crawler
```

---

## 1. Product definition (do not scope-creep)

**User:** Indian student (13–22; assume many are minors) on Telegram, often Hinglish, often voice notes.
**Job:** "Given my marks, budget, stream, and location, which colleges/courses deserve me — and don't let me miss a deadline."
**Personality:** an older-sibling buddy, not a portal. It remembers everything, texts first, celebrates results.

**MVP scope (this week):** Telegram only. Uttar Pradesh colleges deep + NIRF top-200, JEE/CUET cycle. Per-student persistent profile keyed by Telegram user ID. Voice in → text out. Cron deadline pings. CRM near-real-time. Landing page live.
**Out of scope:** WhatsApp, payments, user auth, TTS replies, all-India coverage, mobile app.

---

## 2. Vendoring & customizing the Hermes core

### 2.1 Vendor rules

- Clone `https://github.com/NousResearch/hermes-agent` at the **latest release tag**, strip `.git`, commit into `hermes/`. Record repo + commit hash in `hermes/UPSTREAM.md`.
- **Minimal-diff discipline:** put all new code in `hermes/disha/` and `hermes/control_plane/`; touch upstream files only where a hook must be inserted. Log EVERY upstream-file edit in `CUSTOMIZATIONS.md` (path, diff summary, reason). This keeps a future upstream merge survivable.
- Read the upstream architecture docs (`docs/` in the tree + https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) before editing the agent loop. Understand `run_agent.py`, the gateway package, `hermes_state.py`, and toolsets before changing anything.

### 2.2 Core customizations to make

1. **CRM event hooks (the big one).** Because we own the core, do NOT rely on prompting the LLM to "call a logging tool." Insert deterministic hooks in the gateway/agent loop:
   - inbound message received (+ whether voice, + transcription text length)
   - outbound reply sent
   - memory/profile write detected
   - cron job fired / proactive message sent
   - MCP (DataBlue) live lookup made
   - safety flag raised
   Each hook calls `disha/crm_client.py` → `POST {WEB_URL}/api/events` with the shared secret. Fire-and-forget with a tiny retry queue on disk so the agent never blocks or crashes on CRM downtime.
2. **Config from files, not interactive CLI.** The agent process must boot entirely from `/data/config/` (YAML/env written by the wizard): LLM provider+key+model, Telegram token, transcription provider, DataBlue MCP entry, persona path, cron definitions. Bypass/automate anything `hermes setup` would normally ask interactively. Hermes already supports non-interactive config (`hermes config set`, config file, env vars) — prefer wiring those over inventing a parallel config system.
3. **Defaults baked in:** our SOUL.md persona (§3.2), AGENTS.md context (§3.1), toolset trimmed to what we need (memory, MCP, cron, transcription; disable shell/terminal tools for safety — students must never be able to prompt-inject their way to a shell), gateway allowed-users/pairing per upstream security docs during pilot.
4. **Profile extraction:** add a lightweight post-turn step (in `disha/`) that asks the model to emit the student-profile delta as JSON (schema below) and persists it to Hermes memory AND mirrors it to the CRM via `POST /api/students/upsert`. Deterministic mirror > hoping memory prose stays parseable.

```yaml
student_profile:
  name, preferred_name
  class_or_year            # "12th appearing", "1st year B.Sc"
  board, expected_or_actual_percent
  stream                   # PCM/PCB/Commerce/Arts/other
  entrance_exams: [{name, date, status, score_if_known}]
  budget_per_year_inr
  home_state, home_district
  preferred_cities_or_stay_home
  category_if_volunteered  # NEVER ask; record only if student volunteers
  family_constraints       # "first-gen", "needs hostel", "parents want nearby"
  interests_free_text
  language_comfort         # hi / en / hinglish
```

Acceptance test: fake student, details shared across three sessions (`/new` between them), then "what do you remember about me?" → full recall, and the CRM profile matches.

### 2.3 Voice notes

Upstream gateway supports voice memo transcription (ffmpeg + a Whisper-compatible provider). Make the transcription provider+key a wizard field. **Day-one test:** Hinglish voice note → sane transcription. If Indian-accented Hindi transcribes badly, swap provider via config before touching anything else.

---

## 3. Agent behavior files (in `hermes/disha/prompts/`, loaded by default)

### 3.1 AGENTS.md (standing instructions)

- Mission: genuinely suitable colleges for THIS student; deserving-fit over prestige.
- Data discipline: cached dataset (`/data/colleges/`) first; DataBlue live lookup only for freshness (counseling rounds, deadlines). Always cite source + date. Never fabricate cutoffs/fees/dates — say "let me check" instead.
- Profile gathering: conversational, max 1–2 asks per chat, never a form.
- **Safety rails (non-negotiable — minors):** no medical/mental-health counseling beyond warm empathy + "talk to a trusted adult" + helpline info if distressed (also raise `flag` event); never guarantee admissions; refuse romantic/sexual/adult content and any "keep it secret from your parents" framing; never request documents, exact address, or financial details; never ask caste/category.

### 3.2 SOUL.md (persona)

Warm Hinglish older sibling. Short messages, one idea each, sparing emoji, mirrors the student's language mix. Greets by name, references remembered facts ("kal ka mock kaisa gaya?"), ends heavy info with exactly one next step, celebrates wins, admits uncertainty plainly. Anti-patterns written in explicitly: no bullet walls, no "As an AI…", no formal Shuddh-Hindi, no fake enthusiasm.

### 3.3 DataBlue + cron

- `scripts/crawl_colleges.py`: one-shot batch crawl via `https://api.datablue.dev/v1/scrape` / crawl endpoint (`DATABLUE_API_KEY`). Targets: NIRF listings, UP universities/colleges (AKTU + major private), fees, prior-year cutoffs, hostel/placement pages, NSP + major scholarships. Normalize to `/data/colleges/*.json`: `{name, city, state, courses[], fees_per_year, cutoff_hint, exams_accepted, hostel, source_url, scraped_at}`. Runnable inside the hermes container (`docker compose run hermes python scripts/crawl_colleges.py`).
- DataBlue registered as an MCP server in the generated config. Credits are limited: cache-first is a hard rule.
- Cron (via Hermes's scheduler, definitions in config): (a) daily 08:00 IST deadline sweep — live-verify anything closing ≤72h, ping affected students; (b) per-student exam-eve good-luck + next-day "how did it go?"; (c) nightly cheap refresh of the deadlines/counseling cache subset.

---

## 4. Control plane (inside the hermes container)

Small FastAPI app (`hermes/control_plane/`, port **8300**, reachable only on the compose network) — this is what the `/hermes` page talks to. All endpoints require header `X-Control-Token: ${CONTROL_TOKEN}`.

```
GET  /status        → {configured: bool, gateway: running|stopped|error,
                       uptime, model, bot_username, last_error,
                       counts: {students, messages_today}}
POST /config        → validates + writes /data/config/*  (does NOT start)
POST /validate      → live checks: Telegram getMe, LLM ping, DataBlue ping,
                      transcription ping → per-field ok/fail
POST /gateway/start | /gateway/stop | /gateway/restart
GET  /logs?tail=200 → recent gateway log lines (secrets redacted)
```

Process model: container entrypoint starts the control plane; the control plane supervises the gateway as a child process (start on boot **iff** `/data/config/` is complete). Config on the volume ⇒ setup survives restarts ⇒ genuinely one-time.

---

## 5. Docker Compose

Two services, one network, one volume. Upstream ships a Dockerfile — extend it, don't rewrite from scratch.

```yaml
services:
  hermes:
    build: ./hermes                # extends upstream Dockerfile; installs disha/ + control_plane/
    volumes: [ "./data:/data" ]
    environment:
      HERMES_HOME: /data/hermes-home
      CONTROL_TOKEN: ${CONTROL_TOKEN}
      WEB_URL: http://web:3000
      CRM_INGEST_TOKEN: ${CRM_INGEST_TOKEN}
    restart: unless-stopped
    # port 8300 NOT published to host — internal network only

  web:
    build: ./web
    ports: [ "3000:3000" ]
    volumes: [ "./data:/data" ]
    environment:
      DATABASE_PATH: /data/crm.sqlite
      HERMES_CONTROL_URL: http://hermes:8300
      CONTROL_TOKEN: ${CONTROL_TOKEN}
      CRM_INGEST_TOKEN: ${CRM_INGEST_TOKEN}
    restart: unless-stopped
```

Operator experience, total: `cp .env.example .env` (fill 2 random secrets) → `docker compose up -d` → open `http://localhost:3000/hermes` → wizard → done. Include ffmpeg in the hermes image for voice.

---

## 6. Part B — Next.js app (Next 14+ App Router, TS, Tailwind; no user auth; 5–10s polling, no websockets)

### 6.1 `/hermes` — setup wizard & control room

First visit (unconfigured): a clean multi-step wizard. All secrets entered here are POSTed to the control plane (never stored in the web container; masked on re-display):
1. **Telegram** — bot token (+ "create one with @BotFather" inline help); Validate = live getMe, shows bot @username.
2. **Brain** — LLM provider (OpenRouter / OpenAI / Anthropic / Nous Portal / custom base-URL) + key + model id; Validate = 1-token ping.
3. **Voice** — transcription provider + key; toggle "voice notes enabled."
4. **Data** — DataBlue API key; Validate = tiny scrape ping; shows cached-colleges count with "run crawl" hint.
5. **Persona review** — read-only preview of SOUL.md tone + safety rails, editable "extra instructions" textarea.
6. **Launch** — summary → Start gateway → success screen with t.me deep link + QR.

After setup, `/hermes` becomes the **control room**: status card (running/stopped, uptime, model, bot handle), Start/Stop/Restart buttons, redacted log tail, "re-run validation," and an "edit configuration" path back into the wizard. Poll `GET /status` via a server-side proxy route (`/api/hermes/*`) so `CONTROL_TOKEN` never reaches the browser.

⚠️ `/hermes` and `/crm` have no auth by design (local/pilot). Put a note in the README: do not expose port 3000 to the public internet; if deploying for the demo, front with basic-auth at the reverse proxy.

### 6.2 CRM (`/crm`) — cockpit, not brochure

- **Dashboard:** stat cards (students, active today, messages, voice notes, alerts sent, flags), live activity feed (auto-refresh), 7-day sparkline.
- **Students table:** name, class/stream, profile-completeness bar, last active, status chip; flagged rows sort to top in red. Click → detail.
- **Student detail:** profile card (schema fields, gaps visible), vertical event timeline with type icons, colleges recommended so far.
- Empty states that instruct ("No students yet — message the bot: t.me/…").

DB (owned by web, better-sqlite3 or Prisma+SQLite at `/data/crm.sqlite`):

```sql
students(id TEXT PRIMARY KEY, name TEXT, username TEXT, profile_json TEXT,
         first_seen TEXT, last_active TEXT, status TEXT DEFAULT 'active');
events(id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT, ts TEXT,
       type TEXT,   -- message_in|message_out|voice_note|profile_update|
                    -- college_recommended|deadline_alert|live_lookup|cron_ping|flag
       summary TEXT, meta_json TEXT);
```

Ingest: `POST /api/events`, `POST /api/students/upsert` — require `X-Ingest-Token: ${CRM_INGEST_TOKEN}`. Reads: `GET /api/students`, `GET /api/students/:id`, `GET /api/stats`.
**Privacy rule:** store one-line event *summaries*, never full transcripts. Minors are involved; this is an ops view, not surveillance.

### 6.3 Landing page (`/`) — must be genuinely beautiful

Do a real design pass before coding: define a token system (4–6 named hex colors; a characterful display face + complementary body face via next/font; layout concept; ONE signature element) — then critique it. If it resembles the generic AI-landing defaults (warm cream + serif + terracotta; near-black + acid green accent; hairline-rule broadsheet), throw it out and redesign. Ground it in the student's actual world — chai-time advice from an older sibling, admit cards, Telegram bubbles, railway destination boards, notebook margins — pick ONE motif and commit.

**The hero is a thesis.** Strongest candidate signature: an animated, live-feeling Telegram conversation where the bot *remembers the student across days* ("Riya! CUET result aa gaya? …btw AKTU round 2 kal band ho raha hai") — memory + texting-first IS the product. Type messages in with realistic delays; static fallback under `prefers-reduced-motion`.

Sections (~5 max): Hero + "Chat on Telegram" CTA (deep link) · "It remembers you" (memory, texts-first, voice notes, Hinglish vs portals) · How it works (3 steps, real copy) · Trust & data (powered by DataBlue live data, sources cited, safety commitments for minors, free) · Footer (India AI Impact Festival 2026 entry, DataBlue credit).

Copy rules: write from the student's side; plain verbs; specific beats clever ("Never miss a counseling deadline," not "Unlock your future"); Hinglish in sample chats, English for structure; buttons say what happens.
Quality floor, unannounced: responsive to 360px, visible keyboard focus, reduced motion respected, Lighthouse a11y ≥ 90.

---

## 7. Environment (.env.example — compose-level only; product secrets live in the wizard)

```
CONTROL_TOKEN=change-me-random-64
CRM_INGEST_TOKEN=change-me-random-64
```

Telegram / LLM / DataBlue / transcription keys are entered once in `/hermes` and persisted to `/data/config/` by the control plane. Never commit `/data`.

---

## 8. Order of work & acceptance checklist

1. ☐ Vendor Hermes at pinned release; `UPSTREAM.md` + empty `CUSTOMIZATIONS.md`; upstream Docker image builds as-is.
2. ☐ Control plane skeleton: `/status`, `/config`, gateway start/stop supervising the process; compose brings up both containers.
3. ☐ `/hermes` wizard end-to-end: fresh clone → `docker compose up` → wizard → bot answers a Telegram message. **No terminal interaction beyond compose.**
4. ☐ Voice: Hinglish voice note → correct transcription → sensible reply.
5. ☐ Persona + context defaults loaded; memory acceptance test (§2.2) passes across `/new` resets.
6. ☐ CRM hooks: 3 texts + 1 voice note → ≥4 events + upserted student visible in `/crm` within 30s. Hooks survive web-container downtime (retry queue).
7. ☐ Crawl run: ≥100 UP colleges + NIRF cached; agent answers fees/cutoffs cache-first, citing sources; DataBlue MCP live lookup works for a "did round 2 open?" query.
8. ☐ Cron deadline sweep fires and messages a test student; `cron_ping` event logged.
9. ☐ Safety red-team: distress → empathy + helpline + flag event; adult-content ask → refusal; "guarantee me a seat" → honest no; shell/terminal tools confirmed disabled.
10. ☐ Landing page passes the "would a design-snob founder ship this?" bar; CRM + wizard usable on mobile; README covers run + demo script for a 3-min video; `CUSTOMIZATIONS.md` is complete and honest.

**Trust upstream Hermes docs over this file when they conflict — adapt and record the deviation.** Prefer boring, reliable choices; everything must demo by July 25.
