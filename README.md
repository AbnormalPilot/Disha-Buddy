# Disha Buddy

A Telegram AI buddy that helps Indian students find colleges and courses
that fit them — built on a customized [Hermes Agent](https://github.com/NousResearch/hermes-agent)
core, with a Next.js control room, CRM, and landing page. Built for the
India AI Impact Festival 2026. See [`HANDOVER.md`](./HANDOVER.md) for
the full product spec and [`hermes/CUSTOMIZATIONS.md`](./hermes/CUSTOMIZATIONS.md)
for exactly what was changed in the vendored agent core and why.

## Running it

```bash
cp .env.example .env
# edit .env: replace both change-me-random-64 placeholders with real
# random values (e.g. `openssl rand -hex 32`)

docker compose up -d
```

Then open **http://localhost:3000/hermes** and go through the setup
wizard — Telegram bot token, an LLM provider key, and a DataBlue API
key for college data. Each step validates live against the real
provider before you can continue. On the last step, "Save & start"
launches the gateway and shows a `t.me/<your_bot>` link plus a QR code.

Disha is text-only for now — Hindi, English, and Hinglish, no voice
notes.

No SSH, no CLI setup, no local installs beyond Docker. That one wizard
pass is the entire operator experience; config persists on the `./data`
volume, so restarting the containers doesn't lose it.

- **Landing page**: http://localhost:3000/
- **CRM dashboard**: http://localhost:3000/crm
- **Hermes control room**: http://localhost:3000/hermes (also the setup
  wizard, before it's configured)

If port 3000 is already taken on your machine, set `WEB_PORT` before
bringing the stack up: `WEB_PORT=3001 docker compose up -d`.

### Populating real college data

The wizard's Data step stores your DataBlue key, but it doesn't run a
crawl automatically. Do that separately, once you have a key:

```bash
docker compose run hermes python scripts/crawl_colleges.py
```

This seeds `./data/colleges/` from NIRF's official rankings and AKTU
(Uttar Pradesh's technical university) — see the script's own docstring
for exactly what it does and its current coverage limits.

## What's verified vs. what needs a live run

Everything in this repo has been tested as far as possible **without**
real Telegram/LLM/DataBlue credentials — which is most of it: the
control plane's config-write pipeline (caught and fixed several real
bugs this way — stale credentials surviving a provider switch, a
YAML-list value silently stored as a string, an env-var name that
can't contain the dots a nested config path produced), the per-student
memory provider (cross-session recall and cross-student isolation
confirmed directly against the actual provider interface), the CRM
ingest→dashboard pipeline (confirmed end-to-end by POSTing the exact
payloads the Hermes-side hooks send), cron job registration and
scheduling (confirmed correct IST-adjusted run times and dynamic
per-student job creation), and the shell/terminal-disabled safety
requirement (confirmed at the tool-definition level, not just config —
the model literally cannot see those tools).

What still needs a real Telegram bot + LLM key to confirm, because
there's no way around actually running a conversation:

- The bot answering a real Telegram message end-to-end.
- The safety red-team conversations (does the model actually respond
  with empathy + a helpline on distress, actually refuse adult content,
  actually give an honest non-guarantee) — the rules are written into
  `hermes/disha/prompts/AGENTS.md` and the flag-detection plumbing is
  built and unit-tested, but whether the model reliably follows them is
  an LLM behavior question, not a plumbing one.
- The DataBlue MCP server actually connecting and exposing tools inside
  a running gateway session.
- Full college-data coverage (≥100 UP colleges) — the crawler is built
  and tested against DataBlue's real, confirmed API shape, but hasn't
  been run for real without a paid key.

## Demo script (~3 minutes)

1. **Fresh clone → running system** (30s). `cp .env.example .env`, fill
   in two random secrets, `docker compose up -d`. While it builds,
   explain: two containers, one vendored-and-customized open-source
   agent core, one Next.js app — no other moving parts.
2. **The wizard** (45s). Open `/hermes`. Walk through Telegram → Brain →
   Data → Persona → Launch. Pause on a Validate button actually failing
   against a wrong key, then succeeding against a real one — this is a
   real live check against each provider's API, not a form that accepts
   anything. Show the QR code on the Launch screen.
3. **Talk to the bot** (60s). Open the `t.me/` link the wizard gave you.
   Introduce yourself with marks/stream/budget, in Hindi, English, or
   both mixed together. Ask about a college. Run `/new`, come back, ask
   "what do you remember about me?" — full recall, from a fresh
   session, because memory is keyed per-student, not per-conversation.
4. **The CRM** (30s). Open `/crm` in another tab. Point at the events
   that just appeared — the messages you sent, the profile fields it
   extracted — landing within seconds, not on a delay.
5. **The landing page** (15s). Open `/`. The hero conversation is the
   pitch: memory + texting first, made concrete instead of asserted.

## Repo layout

```
disha-buddy/
├── HANDOVER.md                  # full product spec
├── docker-compose.yml
├── hermes/                      # vendored hermes-agent + our additions
│   ├── UPSTREAM.md              # exact upstream commit vendored
│   ├── CUSTOMIZATIONS.md        # every upstream-file edit, logged
│   ├── control_plane/           # FastAPI service the /hermes page talks to
│   └── disha/                   # our product code (memory, CRM hooks, cron, persona)
├── web/                         # Next.js app: landing page, /crm, /hermes wizard
├── scripts/crawl_colleges.py    # manual DataBlue batch crawler
└── data/                        # bind-mounted volume (gitignored), created at runtime
```

## A note on `/hermes` and `/crm` having no login

This is intentional for a local/pilot deployment — see `HANDOVER.md`
§6.1. If you expose this beyond localhost (e.g. for a demo), put it
behind basic auth at a reverse proxy first; don't publish port 3000
directly.
