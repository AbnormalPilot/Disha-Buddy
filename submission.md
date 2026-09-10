# India AI Impact Festival 2026 — Submission (Disha Buddy)

> Copy-paste answers, one per field. Word counts noted; all within limits.
> Last updated 26 Jul 2026, against the built system and the finished film.
>
> **Read `#pre-submission-checks` at the bottom before you paste any of this.**
> Two claims below depend on a step that has not been run yet.

---

## B1. Title (≤5 words)

Disha: India's AI College Counsellor

*(5 words. Alternative if a product name alone is preferred: "Disha Buddy: AI College Mentor".)*

---

## B2. Problem Statement and its evidence through citations (≤150 words)

Every year around 15 lakh Indian students sit a single college-entrance cycle — CUET-UG 2024 alone drew **14.99 lakh candidates across 283 universities** [NTA/News on Air]. Almost none of them get advice. **93% of Indian schools have no career counsellor**, and where one exists they carry roughly **3,000 students against a global norm of 250** [Infigon Futures; Higher Education Digest]. India needs an estimated **14 lakh counsellors and has under 10,000** — a shortfall of more than 99%.

The gap falls hardest on first-generation and small-town students. They miss counselling rounds they never knew had opened, guess at cutoffs and fees, and cannot afford private counselling costing tens of thousands of rupees. Existing "college finder" portals are English-only forms that put every burden on the student: to search, to understand, to remember, to come back. The result is life-defining decisions made blind, and capable students under-placed or dropping out entirely.

**(149 words)**

**Citations:**
- NTA / News on Air — CUET-UG 2024, 14.99 lakh candidates: https://www.newsonair.gov.in/nta-declares-common-university-entrance-test-ug-2024
- Higher Education Digest — "Why India Needs about 1.5 million Career Counselors": https://www.highereducationdigest.com/why-india-needs-about-1-5-million-career-counselors/
- Infigon Futures — "Future of Career Counselling in India: What the Numbers Say": https://www.infigonfutures.com/blogs/posts/career-counselling-india-future

---

## B3. Target audience affected by the problem (≤100 words)

Indian students aged **16–18** — classes 11–12 and gap-year aspirants — preparing for boards and entrance tests (CUET, JEE, state counselling). The core audience is **first-generation college-goers from tier-2 and tier-3 towns and lower-income families**: no counsellor at school, none they can afford privately, and parents who cannot navigate the admissions maze on their behalf. Most are more fluent in **Hinglish or Hindi** than in formal English, and reach the internet through a shared or entry-level smartphone where Telegram is already installed. The pilot focuses on **Uttar Pradesh** (AKTU and affiliated institutions) alongside nationally ranked NIRF engineering colleges.

**(99 words)**

---

## B4. Your solution (≤50 words)

**Disha** is a free Telegram counsellor that remembers each student — marks, budget, stream, every deadline — and **messages them first** before a counselling round closes. It names colleges that genuinely fit, with the source and date beside every number, and speaks like a warm Hinglish older sibling. No app. No forms.

**(50 words)**

---

## B5. How does it work (≤250 words)

**Software only, no hardware.** Two Docker containers and one managed Postgres database.

**1. The agent.** A custom agent runtime bridges Telegram to an LLM, with **persistent per-student memory** so context survives weeks, not just a session. A Hinglish persona and hard minors-safety rails live in its system prompts.

**2. Conversation, not a form.** A student texts naturally — *"12th mein 78%, budget 1 lakh"* — and Disha extracts a structured profile and asks at most one or two questions. Replies are short, one idea each, ending in a single next step.

**3. Grounding.** A crawled college dataset (NIRF rankings, AKTU institutions: courses, fees, cutoff hints, exams) is queried **cache-first**. Live lookups are spent only on time-sensitive facts — open rounds, deadlines. Every fact carries its source and the date checked. The prompt requires "let me check" over a guess.

**4. It goes first.** Three scheduled jobs make Disha proactive: an **08:00 IST deadline sweep**, a **02:00 dataset refresh**, and an **18:30 engagement follow-up**. Frequency is enforced in code, never left to the model: one ping per student per week, 15 per run, and anyone safety-flagged in the last 14 days is skipped.

**5. Operations.** A Next.js app serves the landing page, a CRM dashboard and a setup wizard. Only the web tier touches the database.

**6. Runs on CPUs.** The agent speaks a standard OpenAI-compatible API, so inference can be served by **Intel's OpenVINO™ Model Server** on ordinary Intel CPUs and NPUs — no GPU, enabling data-sovereign hosting inside a school.

**(243 words)**

---

## B6. Latest AI advancements used — select:

- ✅ **AI Agents** — a custom agent runtime with persistent per-student memory, tool use, and autonomous scheduled action (it initiates contact; the student never has to)
- ✅ **Generative AI** — LLM-driven Hinglish conversation and structured profile extraction from free-form chat
- ✅ **RAG** — cache-first retrieval over our own crawled college dataset, with live lookups reserved for freshness-critical facts, every answer carrying source and date
- ✅ **Other — Intel OpenVINO™** — an OpenAI-compatible inference layer lets the model be served by OpenVINO Model Server for GPU-free CPU/NPU inference and affordable edge deployment

Leave **Multimodal AI** unchecked — the product is deliberately text-only. See `#pre-submission-checks` regarding the submission film's narration.

---

## B7. Dataset used — how and why (≤100 words)

We build our own **college knowledge base** rather than relying on a third-party API. A crawler seeded on the **NIRF 2025 engineering rankings** and **aktu.ac.in** (depth-2, 80 pages) normalises each page into JSON: name, city, courses, fees, cutoff hint, exams accepted, source URL, scrape date. A nightly job re-crawls the rankings cheaply to catch changes.

**Why:** grounding the model in verified, dated facts is the single thing that stops hallucinated cutoffs and fees — and these are minors acting on the advice. We store no sensitive personal data; the only student data is what a student volunteers in chat.

**(100 words)**

---

## B8. Accessibility / inclusive features (≤100 words)

**It meets students where they already are.** Runs entirely inside **Telegram** — nothing to download, works on entry-level phones and weak connections. **Trilingual by design:** Hindi, English and Hinglish, mirroring the student's own language mix instead of demanding formal English. **No forms and no literacy barrier** — everything is conversation, one or two questions at a time. **Texting first** means a student who forgets to come back still gets reminded before a deadline closes. **Free**, removing the cost barrier that makes private counselling a middle-class privilege. The landing page honours `prefers-reduced-motion` and keyboard focus, works at 360px, and targets Lighthouse accessibility ≥ 90.

**(100 words)**

---

## B9. Societal & environmental impact (≤50 words)

A counsellor can hold thirty students; software can hold thirty lakh. Disha gives first-generation and low-income students the guidance they currently have none of, before deadlines pass rather than after. **Environmentally light:** text over an existing app, cache-first data, no video, no dedicated app — minimal data, compute and energy.

**(50 words)**

---

## B10. SDGs

- **First:** SDG 4 — Quality Education
- **Second:** SDG 10 — Reduced Inequalities

---

## B11. Responsible AI principle

**Safety & Reliability** — a minors-facing product built for it: hard-coded safety rails, no admission guarantees, distress routed to empathy plus a helpline plus a safety flag, no shell or terminal tools exposed to the chat agent, and source-cited answers in place of confident fabrication.

---

## B12. Measures for ethics / privacy (≤100 words)

Disha is **minors-facing and engineered for it.** It **never asks caste or category**, never requests documents, address or financial details, and never guarantees an admission or a cutoff. Distress triggers empathy, a helpline and a `[DISHA_FLAG]` marker for human review — not amateur counselling. The chat agent has **no terminal toolset**, closing the prompt-injection path to the host. The CRM stores **one line per event and never a conversation transcript** — an operations view, not surveillance. Bot and model tokens never reach the browser; only the web tier touches the database, over authenticated APIs. The model cites dated sources and admits uncertainty.

**(100 words)**

---

## B13. Current project stage

**A working prototype, built end-to-end.** Telegram bot, agent runtime with per-student memory, crawler, CRM dashboard and setup wizard are integrated and running under Docker Compose against a managed Postgres. Proactive scheduling is seeded and verifiable (`hermes cron list`). Not yet a public deployment: the pilot is scoped to Uttar Pradesh for the first cohort.

---

## Submission film

- **File:** `video/out/disha-buddy-final.mp4`
- **Runtime:** 116 seconds (within the 120s cap) · 1920×1080 H.264 · under 6 MB
- **Subtitles:** burned-in English throughout
- **Team on camera:** all three members appear — two narrating on camera, and the closing card at 1:48 carries all three
- **Structure:** title → the problem (93%, 1:3,000, 14 lakh vs 10,000) → what Disha does → a live Telegram conversation including the unprompted deadline message → system architecture → close

---

## Pre-submission checks

Three things to settle before this is submitted. The first two affect whether the answers above are true.

### 1. The college dataset has not been built ⚠️

`data/colleges/` is **empty**. The crawler (`scripts/crawl_colleges.py`) is real and wired up, but it has never been run on this machine — so right now there is nothing for the agent to be "cache-first" about, and a live demo would fall through to lookups or to nothing.

B5 and B7 above both describe this dataset, and the film says *"answers from a college dataset we crawled ourselves."*

**Fix:** set `DATABLUE_API_KEY` (the /hermes wizard's Data step) and run the crawler, then confirm `data/colleges/` has JSON in it. Until that is done, B7 describes a capability rather than a corpus.

### 2. B7 previously overstated the sources

The earlier draft claimed NIRF top-200, "major private institutes", hostel and placement pages, and national/state scholarship schemes. The crawler's actual seeds are **the NIRF 2025 engineering ranking page** and **aktu.ac.in**. B7 has been rewritten to what the code does. If you widen `SEEDS` before submitting, widen B7 to match — not the other way round.

### 3. The film's narration, 0:07–0:53

That stretch is a **synthetic voice**, generated from a consented sample of Sujan's voice; everything from 0:53 is real recordings. The festival brief forbids AI-generated voiceover, and the generated audio carries an inaudible but machine-readable provenance watermark. If any submission field asks how the video was produced, answer it accurately. Replacing those 46 seconds with a real recording removes the issue entirely — see `video/RECORDING-STATUS.md`.

### Smaller items

- Confirm the Lighthouse accessibility score in B8 (`≥ 90` is a target; measure it and state the real number).
- B13 says "not yet a public deployment" — if the bot is live and reachable by judges, say so and give the handle.
