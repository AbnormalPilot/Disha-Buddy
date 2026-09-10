// ---------------------------------------------------------------------------
// THE RECORDINGS.
//
// Each teammate records ONE clip covering their section of script-3voice.md.
// That clip does two jobs: its audio is the narration, and its picture is the
// circle in the bottom-right corner.
//
// A clip can be cut into more than one SEGMENT if the person's material has to
// skip something (Vivek's does: he recorded an extra "how do we use Disha" bit
// that the film has no slot for, so his clip is used as two segments with the
// middle dropped). Segments belonging to the same `person` share one circle and
// one name, and only the first one fades in.
//
// See RECORDING-STATUS.md for what is recorded and what is still missing.
// ---------------------------------------------------------------------------

import { FPS, scenes, sceneStart } from "./timings";

export interface Segment {
  person: "a" | "b" | "c"; // who this is. Segments of one person share a circle.
  name: string; // shown under the circle
  scenes: string[]; // which scenes this segment covers
  clip: string | null; // e.g. "clips/vivek.mp4". null renders a placeholder.
  audio: string | null; // only if voice was recorded separately from picture
  trimBefore: number; // frames to skip at the head of the clip (30 = 1s)
  trimAfter: number | null; // frame in the clip to stop at
  offset: number; // nudge the whole segment later (+) / earlier (-)
  mirror: boolean; // true if the selfie camera flipped you
  fadeIn: boolean; // false for a continuation of the same person
  // false = voice only. Their narration plays, no circle appears on screen.
  // Use this when someone sends audio without usable footage.
  showCircle: boolean;
  photo: string | null; // still portrait for the closing card, e.g. "photos/x.png"
  // How the face sits in the circle. zoom 1 = the raw square crop.
  // Check with: npx remotion still src/index.ts DishaVideo out/check.png --frame=2300
  framing: { zoom: number; x: number; y: number };
}

// Vivek's clip is 44.5s. Measured contents:
//   0.0  - 3.9   self-introduction        (unused, no slot in the film)
//   3.9  - 22.0  the tech section         -> "tech" scene
//   22.0 - 34.0  "how do we use Disha"    (unused, no slot in the film)
//   34.0 - 43.6  the close                -> "future" scene
const VIVEK = {
  person: "c" as const,
  name: "Vivek",
  clip: "clips/vivek.mp4",
  audio: null,
  mirror: false,
  showCircle: true,
  photo: "photos/vivek.png",
  framing: { zoom: 1.5, x: 0, y: 14 },
};

export const segments: Segment[] = [
  {
    // SYNTHETIC NARRATION, not a recording. Generated locally from a consented
    // voice sample of Sujan (Chatterbox, watermarked). Voice only, no circle.
    // Replace `audio` with a real recording and delete this note when one exists.
    person: "a",
    name: "Sujan",
    scenes: ["problem"], // 0:07 - 0:28.5
    clip: null,
    audio: "clips/problem.m4a",
    trimBefore: 0,
    trimAfter: null,
    offset: 0,
    mirror: false,
    fadeIn: true,
    showCircle: false,
    photo: "photos/person-a.png",
    framing: { zoom: 1, x: 0, y: 0 },
  },
  {
    // SYNTHETIC NARRATION, as above.
    person: "a",
    name: "Sujan",
    scenes: ["solution"], // 0:28.5 - 0:53
    clip: null,
    audio: "clips/solution.m4a",
    trimBefore: 0,
    trimAfter: null,
    offset: 0,
    mirror: false,
    fadeIn: false,
    showCircle: false,
    photo: "photos/person-a.png",
    framing: { zoom: 1, x: 0, y: 0 },
  },
  {
    // RECORDED. 26.1s clip against a 26.0s slot, and he starts speaking
    // immediately, so there is no head trim and almost no slack. Do not change
    // the demo scene's duration without re-cutting his captions.
    person: "b",
    name: "Himanshu",
    scenes: ["demo"], // 0:53 - 1:19
    clip: "clips/person-b.mp4",
    audio: null,
    trimBefore: 0,
    trimAfter: null,
    offset: 0,
    mirror: false, // Photo Booth did not flip this one: the shirt logo reads correctly
    fadeIn: true,
    showCircle: true,
    photo: "photos/person-b.png", // closing card uses the still, not the clip
    framing: { zoom: 1.45, x: 0, y: 8 },
  },
  {
    ...VIVEK,
    scenes: ["tech"], // 1:15 - 1:33.5
    trimBefore: Math.round(3.833 * FPS),
    trimAfter: Math.round(22.1 * FPS),
    offset: 0,
    fadeIn: true,
  },
  {
    ...VIVEK,
    scenes: ["future"], // 1:33.5 - 1:44
    trimBefore: Math.round(34.0 * FPS),
    trimAfter: null, // play to the end of the clip
    offset: 0,
    fadeIn: false, // continuation of the same person, so no re-entrance
  },
];

const durationOf = (ids: string[]) =>
  ids.reduce(
    (acc, id) => acc + (scenes.find((s) => s.id === id)?.durationInFrames ?? 0),
    0
  );

// Absolute window each segment occupies in the finished film.
export const segmentWindow = (seg: Segment) => ({
  from: sceneStart[seg.scenes[0]] + seg.offset,
  durationInFrames: durationOf(seg.scenes),
});

// The closing card is its own list, not derived from who narrates. Sujan is on
// the team and belongs on the card even though he has no speaking part.
export const team = [
  { name: "Sujan", photo: "photos/person-a.png" },
  { name: "Himanshu", photo: "photos/person-b.png" },
  { name: "Vivek", photo: "photos/vivek.png" },
];

// The circle. Fixed for the whole film so it never moves between speakers.
// Every scene composition keeps this corner clear.
export const BUBBLE = {
  size: 232,
  right: 132, // matches the film margin
  bottom: 228, // sits above the caption rule
};
