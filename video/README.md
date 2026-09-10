# Disha Buddy — submission film (Remotion)

A 112-second film for the India AI Impact Festival 2026, built with
[Remotion](https://remotion.dev). Seven scenes (intro · problem · solution ·
demo · tech · future · team), burned-in English subtitles, and a slot for each
teammate's recording.

---

## Send us your clip (this is the only step left)

Each of the three of us records **one clip** covering our own section of
`script-3voice.md`. That single clip does two jobs: its **sound is the
narration**, and its **picture is the circle in the bottom-right corner** for
the length of that section.

| Part | Who | Time in the film | Covers |
|------|-----|------------------|--------|
| A | first speaker | 0:00 – 0:49 | hook, problem, solution |
| B | second speaker | 0:49 – 1:15 | the demo |
| C | third speaker | 1:15 – 1:44 | how it's built, close |

**How to record**

- **Landscape, 1080p**, phone propped up, not handheld.
- Light in front of your face (window or lamp). Nothing bright behind your head.
- Frame from **chest up**, centred, eyes about a third down the frame. The film
  crops your clip to a circle, so leave room around your head.
- Plain wall behind you, plain clothes, no logos or stripes.
- Quiet room, no fan or AC. Read your part from `script-3voice.md`.
- Start recording, wait 2 seconds, then speak. Leave 2 seconds of silence at the
  end too.
- **Your clip must be at least as long as your section** (A needs 49s+, B 26s+,
  C 29s+), counting the silence you trim off the front with `trimBefore`. If it
  runs short the picture freezes on its last frame. Record a bit long, not tight.
- Send the **original file**. Do not send it through WhatsApp, it wrecks the audio.

**How to wire it in**

1. Drop the files into `public/clips/` (any names: `a.mp4`, `riya.mov`, …).
2. Open `src/presenters.ts` and fill in `name` and `clip` for each part.
3. `npm run render`.

```ts
{
  id: "a",
  name: "Aarav Mehta",        // shown under the circle
  scenes: ["intro", "problem", "solution"],
  clip: "clips/a.mp4",        // <- your file
  audio: null,                // only if you recorded sound separately
  trimBefore: 45,             // skip 1.5s of dead air at the head (30 = 1 second)
  offset: 0,                  // nudge the whole part later (+) or earlier (-)
  mirror: false,              // true if the selfie camera flipped you
}
```

Until a clip is set, that part renders a labelled placeholder circle, so the film
always builds.

**If your recording drifts out of sync with the captions**, change `offset` on
that part. `offset: 12` starts you 12 frames (0.4s) later. Nothing else moves.

**If you recorded voice and picture separately**, set `audio` as well
(`"clips/vo-a.wav"`). The clip's own sound is then muted in favour of the audio
file.

The closing card at 1:44 shows all three of you in circles at once, pulled from
the same clips. Nobody has to film together.

---

## Compliance notes

- **No AI voiceover.** The narration must be your real voices. The TTS track in
  `build-audio.mjs` is a **preview only** and is automatically suppressed the
  moment any real clip is wired in.
- **Team on camera.** Satisfied by the corner circles plus the closing card. You
  are on camera for 104 of the 112 seconds.
- **Length.** 112s, under the 120s cap. Durations live in `src/timings.ts`.
- **Size / format.** H.264 MP4, well under the 60 MB cap.

## Commands

```bash
npm install            # once
npm run studio         # live preview + scrub in the browser
npm run render         # render -> out/disha-buddy.mp4
npm run typecheck      # tsc --noEmit
npm run build:audio    # TTS preview track (never submit this)
```

Render one frame to check a change without waiting for the whole film:

```bash
npx remotion still src/index.ts DishaVideo out/check.png --frame=1400
```

---

## Design notes (read before changing anything visual)

The film is set like print, not like a pitch deck. The rules that keep it from
looking generated:

- **Ink on paper, one accent.** Warm newsprint ground, near-black type, a single
  deep blue (`C.accent`). Red (`C.alert`) is semantic only: it means a deadline
  is closing, and it appears twice in 112 seconds. Do not add a third colour.
- **The phone is the only lit surface** in the whole film, because it is the
  actual product. Nothing else gets a dark background.
- **Every scene has a different composition.** No scene repeats another's layout.
  There is no shared "eyebrow + headline + row of cards" template, on purpose:
  that repetition is what made the first version look machine-made.
- **One margin** (`MARGIN` in `theme.ts`) and one caption band. Every scene
  aligns to both, and keeps the bottom-right corner clear for the speaker circle
  (`BUBBLE` in `presenters.ts`).
- **One easing curve** (`EASE` in `components/type.tsx`) for the entire film.
  Type reveals with a mask wipe, never a fade-and-float. Numbers count. Diagram
  lines draw in the order the data moves.
- **No emoji as iconography.** Emoji appear only inside chat bubbles, where a
  real student would actually type them.
- Type is Archivo (display), IBM Plex Sans (body), IBM Plex Mono (data, sources,
  timestamps) and IBM Plex Sans Devanagari (the one Hindi word).

## Project structure

```
src/
  timings.ts        # scene order, durations, captions. Single source of truth.
  presenters.ts     # YOUR CLIPS. names, files, trims, offsets.
  theme.ts          # palette, fonts, margin
  DishaVideo.tsx    # the <Series>, plus the presenter overlay
  components/
    Frame.tsx       # paper ground, grain, running head
    Captions.tsx    # burned-in subtitles
    type.tsx        # Reveal / Rule / Meta / Counter + the shared easing
    PhoneChat.tsx   # the Telegram surface
    Presenter.tsx   # the corner circle
  scenes/           # Intro, Problem, Solution, Demo, Tech, Future, Team
public/clips/       # your recordings go here
out/                # rendered film + check stills
```

## Editing the captions

Captions are in `src/timings.ts` and are the burned-in subtitles **and** the
narration cue sheet. They track `script-3voice.md` line for line. Change one,
change both. The subtitle band splits a scene's duration evenly across its
caption chunks, so adding a chunk shortens the others.
