# Recording status

What is in the film, what is still missing, and the exact words left to say.

Film is **116s** (cap is 120s). Rendered to `out/disha-buddy-final.mp4`.

> ### ⚠️ 0:07 to 0:53 is a synthetic voice, not a recording
> The problem and solution sections are generated audio, cloned from a sample of
> Sujan's voice with his agreement. Everything from 0:53 onward is real people.
> Details and the replacement path are in the section at the bottom of this file.
> **Read that before submitting anything.**

---

## Where we stand

| Part | Who | Time in film | Length | Source | Status |
|------|-----|--------------|--------|--------|--------|
| title card | — | 0:00 – 0:07 | 7s | no narration by design | ✅ |
| problem | Sujan | 0:07 – 0:28.5 | 21.5s | **synthetic voice** | ⚠️ generated |
| solution | Sujan | 0:28.5 – 0:53 | 24.5s | **synthetic voice** | ⚠️ generated |
| demo | **Himanshu** | 0:53 – 1:19 | 26s | real recording | ✅ |
| tech | **Vivek** | 1:19 – 1:37.5 | 18.5s | real recording | ✅ |
| future | **Vivek** | 1:37.5 – 1:48 | 10.5s | real recording | ✅ |
| team card | all three | 1:48 – 1:56 | 8s | three photos | ✅ |

All four narrated sections sit within 1.4 dB of each other (-15.5 to -16.9 LUFS),
so no speaker jumps out.

------|-----|--------------|--------|-------|--------|
| A | **Sujan** | 0:00 – 0:49 | 49s | **voice only**, no filming (`script-person-A.md`) | ❌ not recorded |
| B | **Himanshu** | 0:49 – 1:15 | 26s | voice + video | ✅ **done** |
| C | **Vivek** | 1:15 – 1:44 | 28.5s | voice + video | ✅ **done** |
| closing card | all three | 1:44 – 1:52 | 8s | faces only, no speech | ✅ all three |

Parts B and C are **one clip doing both jobs**: the audio is the narration, the
picture is the circle in the bottom-right corner.

**Part A is voice only.** There is no usable footage of him, so his circle has been
removed from the film entirely — the opening 49 seconds run without a presenter
bubble, which the scenes carry fine on their own. He appears on the closing card
as a still photo instead (`public/photos/person-a.png`, already in place). He only
needs to send a 49-second voice note.

Right now **0:00 to 0:49 is silent**. Person A's voice note is the only thing
left. Everything from 0:49 to the end is finished.

Names are set: Sujan, Himanshu, Vivek. The closing card carries a photo for Sujan
and Himanshu and a live frame for Vivek (every still of his clip has him reading
down at the script, so the moving one looks better).

---

## ✅ Part C — Vivek (recorded)

Source: `public/clips/vivek.mp4` (44.5s). Wired up in `src/presenters.ts`.

### What he actually said, and what we used

| In his clip | Words | Used |
|---|---|---|
| 0:00 – 3.9s | "Hello everyone, this is Vivek from Project Disha Bot." | ✂️ cut, no slot for a self-introduction |
| 3.9s – 22.0s | the tech section | ✅ → `tech` scene, 1:15 – 1:33.5 |
| 22.0s – 34.0s | "So how do we use Disha? It's very simple, you just have to send a message to the Disha bot and start chatting and you will get the answers that you need." | ✂️ cut, the demo section at 0:49 already covers this and belongs to Part B |
| 34.0s – 44.5s | the close | ✅ → `future` scene, 1:33.5 – 1:44 |

His clip is used as **two segments with the middle dropped**. The join is at
1:33.5 and both sides land on sentence boundaries, so it reads as a normal cut.

### Captions cut to his delivery

Measured off the audio, frame by frame, in `src/timings.ts`. The subtitles land
about a third of a second before each phrase, which is how subtitles are meant to
sit.

> Disha is an agent, not a chatbot. Memory for every student. Answers from a
> college dataset we crawled ourselves, and "let me check" instead of an invented
> cutoff. We store one line per student, never a full conversation. And it runs
> GPU-free on Intel's OpenVINO.
>
> A counsellor can hold around 30 students, but software can hold 30 lakh.
> Disha Buddy. Sahi disha, sahi decision.

Small cleanups in the subtitles versus the raw audio, which is standard practice:
"one line **for** a student" is captioned "one line **per** student", and "runs
**on GPU, free on Intel's** OpenVINO" is captioned "runs **GPU-free on** Intel's
OpenVINO".

### ⚠️ One thing to check

At 0:39 in his clip he says the number that the film captions as **"30 lakh"**.
Speech-to-text hears it as "39". Please listen once and confirm. If he said
something else, fix the caption in `src/timings.ts` (`future` scene, chunk 2) and
the on-screen line in `src/scenes/Future.tsx`.

---

## ❌ Part A — Sujan, still to record (0:00 – 0:49, 49 seconds)

**Voice only. No filming.** Send him `script-person-A.md`, which has this plus
pacing and recording notes. A phone voice memo is all that's needed. Read it as
written: the burned-in subtitles are already set to these words.

### 0:00 – 0:10 · the hook

> "Bhaiya, seventy-eight percent aaye. Ab kya karun?"
>
> *(beat)*
>
> Fifteen lakh Indian students ask that question every year.
> Almost none of them get an answer.

Say the Hinglish line the way a nervous 17-year-old would text it, not as a
narrator reading a quote. Then stop for a full beat. That silence is the hook.

### 0:10 – 0:29 · why nobody answers

> Ninety-three percent of Indian schools have no career counsellor.
> Where there is one, they carry three thousand students.
> India needs about fourteen lakh counsellors. It has under ten thousand.
> So the students who need guidance most, first-generation, small-town, no money
> for private counselling, get none of it.

Four flat facts, no adjectives. Slow down on "under ten thousand" and let the last
sentence land heavier than the rest.

### 0:29 – 0:49 · what we built

> So we built Disha.
> It lives on Telegram, talks like students talk, and remembers what matters:
> marks, budget, stream, every deadline.
> It names colleges that fit, with the source and date next to every number.
> And it doesn't wait to be asked. Before a round closes, Disha texts you first.

"Disha texts you first" is the sentence the whole film is built on. Small pause
before it, then say it plainly and stop. No lift at the end.

**Clip must run at least 53 seconds** (49s of section plus the silence you leave
at each end).

---

## ✅ Part B — Himanshu (recorded)

Source: `clips-raw/person-b.mov` (26.1s, Photo Booth), levelled into
`public/clips/person-b.mp4`. He read the script as written.

His clip is 26.1s against a 26.0s slot, so there is almost no slack: he starts
speaking immediately and there is no head trim. **Do not change the demo scene's
duration** without re-cutting his caption frames.

Captions and every chat beat in the demo (her message, the typing dots, the reply,
the "2 days later" divider, the proactive message, both annotations) are cut to
his delivery, measured by silence detection rather than guessed.

Two small caption fixes to match what he actually says: "where each number
**comes** from" (not "came"), and "**This** is the whole product" (not "That is").

What he said:

> Riya types one line. Seventy-eight percent, budget one lakh, UP.
> Seconds later she has colleges she can actually get into, with fees, cutoffs,
> and a link to where each number comes from.
> Two days later, Disha messages her first:
> "Riya, AKTU round two kal band ho raha hai."
> Nobody asked it to. This is the whole product.

---

## How to record (Part A, if anyone else needs it)

- **Landscape, 1080p.** Phone propped up, not handheld.
- Light in **front** of your face, a window or a lamp. Nothing bright behind your head.
- **Chest up, centred.** The film crops you to a circle, so leave room around your head.
- Plain wall, plain clothes, no logos or stripes.
- Quiet room. No fan, no AC, notifications off.
- Start recording, **wait 2 seconds**, then speak. Leave 2 seconds at the end too.
- Send the **original file**. Not through WhatsApp, it wrecks the audio.
- Same phone / same mic type as each other if you can. Mismatched room tone is what
  makes a stitched voiceover sound stitched.


## Audio levelling (why `npm run prep:clips` exists)

People record on different devices in different rooms and the gap is big. Vivek's
clip arrived at **-15.7 LUFS**, Person B's Photo Booth clip at **-37.2 LUFS**. That
is a 21 dB difference: one gain pass over the finished film cannot fix it, it just
leaves one person shouting and the other inaudible.

So originals live in `clips-raw/` (never bundled) and `npm run prep:clips` levels
each one to -18 LUFS into `public/clips/`, which is what the film uses. In the
finished film both speakers now measure within 0.4 dB of each other.

Run `npm run prep:clips` whenever a new recording arrives, then `npm run build`.

## How to wire a clip in

1. Drop the file in `video/public/clips/`.
2. In `src/presenters.ts`, fill in that person's `name`, `clip`, and `trimBefore`
   (frames of dead air to skip at the head; 30 frames = 1 second).
3. Check the framing of the circle:
   `npx remotion still src/index.ts DishaVideo out/check.png --frame=400`
   Adjust `framing: { zoom, x, y }` until the face is centred. Vivek's is
   `{ zoom: 1.5, x: 0, y: 14 }` as a starting point.
4. `npm run build` (renders, then normalises the audio to broadcast level).

If the recording drifts against the captions, change `offset` on that segment
rather than touching anything else. `offset: 12` starts that person 0.4s later.

**If someone's delivery is a different length from the slot**, tell me and I will
re-cut the caption timings to their actual audio, the way Part C was done. Do not
just let it drift.

## When all three are in

- Set the real names in `src/presenters.ts` (Part A and B still say "Name A" /
  "Name B", and those strings appear on screen under the circles).
- Re-render, then check the closing card at 1:44: all three circles should have
  faces in them.
- Submit `out/disha-buddy-final.mp4`, not `out/disha-buddy.mp4`. The final one has
  the audio normalised and the peaks limited.
- Do **not** submit `out/disha-buddy-voiced.mp4`. That is the old version with an
  AI voice on it, which the festival rules forbid.


---

## The synthetic narration (0:07 – 0:53)

**What it is.** The problem and solution sections are not a recording. They are
generated speech, cloned from an 18-second sample of Sujan's real voice taken from
a video of him speaking at an event. Sujan agreed to this. **Keep that agreement in
writing** — it is the only thing that makes this legitimate, and neither he nor the
team should have to rely on memory later.

**How it was made.** Locally, with
[Chatterbox](https://github.com/resemble-ai/chatterbox) (Resemble AI, MIT
licensed) on this machine. Nothing was uploaded to a third-party service. The
reference sample was denoised first, because the source was recorded on a noisy
event floor and a clone reproduces whatever it hears.

- reference sample: built from `/Users/himanshu/Downloads/3F196EA0-...MP4`, first 18s
- generated audio: `public/clips/problem.m4a`, `public/clips/solution.m4a`
- one sentence generated per file, then assembled with measured pauses so the
  captions and on-screen panels land on the words

**It is watermarked.** Chatterbox embeds a Perth provenance watermark in
everything it generates. The watermark is inaudible and does not affect quality in
any way, but the audio is machine-identifiable as synthetic. It was left in place
deliberately. Anyone with a Perth detector can tell this is generated speech.

**Two things to weigh before submitting.**

1. The festival forbids AI-generated voiceover. This is AI-generated voiceover.
   That rule is quoted in `README.md`. If the entry is checked, this section is
   what would be found, and the watermark makes finding it straightforward.
2. It is a replica of a real, named person's voice. It carries his name on the
   closing card. That is fine because he agreed — and only because he agreed.

**How to replace it with a real recording.** This is a five-minute job and it
removes both problems above:

1. Sujan (or anyone) records the two sections. Scripts are already written:
   the problem and solution text in this file, or `script-himanshu-part-A.md`.
2. `npm run prep:clips` to level it.
3. In `src/presenters.ts`, swap `audio: "clips/problem.m4a"` for the real file on
   the two Sujan segments.
4. Tell me the new audio and the caption frames get re-cut to it, the same way
   Himanshu's and Vivek's were.

The scene durations (21.5s and 24.5s) are sized to the generated audio. A real
recording will be a different length, so those need adjusting too — do not just
drop a file in and render.
