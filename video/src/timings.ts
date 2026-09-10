// Central timing + caption source of truth.
//
// Captions are the burned-in English subtitles AND the narration cue sheet.
// See RECORDING-STATUS.md for what is recorded and what is still a placeholder.
//
// A caption can be a plain string (the scene's duration is split evenly across
// its chunks) or {text, from} where `from` is a frame offset inside the scene.
// Use the timed form for scenes cut to a real recording, so the subtitle lands
// on the word instead of on an average.
//
// Total must stay <= 120s (3600 frames @ 30fps). Current total: 116s.

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const s = (sec: number) => Math.round(sec * FPS);

export type Caption = string | { text: string; from: number };

export interface Scene {
  id: string;
  durationInFrames: number;
  captions: Caption[];
}

export const captionText = (c: Caption) => (typeof c === "string" ? c : c.text);

export const scenes: Scene[] = [
  {
    // Title card only. The spoken hook was cut, so this carries no subtitle and
    // needs nobody to record it.
    id: "intro",
    durationInFrames: s(7),
    captions: [],
  },
  {
    // Narration is a synthetic voice (see RECORDING-STATUS.md). Caption frames
    // are measured off the generated audio, so do not change this duration
    // without regenerating public/clips/problem.m4a.
    id: "problem",
    durationInFrames: s(21.5),
    captions: [
      { text: "93% of Indian schools have no career counsellor.", from: 3 },
      { text: "Where there is one, they carry 3,000 students.", from: 112 },
      {
        text: "India needs about 14 lakh counsellors. It has under 10,000.",
        from: 223,
      },
      {
        text: "So the students who need guidance most, first generation, small town, no money for private counselling, get none of it.",
        from: 366,
      },
    ],
  },
  {
    // Synthetic voice, same as above. Cut to public/clips/solution.m4a.
    id: "solution",
    durationInFrames: s(24.5),
    captions: [
      { text: "So we built Disha.", from: 3 },
      {
        text: "It lives on Telegram, talks like students talk, and remembers what matters: marks, budget, stream, every deadline.",
        from: 86,
      },
      {
        text: "It names colleges that fit, with the source and date next to every number.",
        from: 354,
      },
      {
        text: "And it doesn’t wait to be asked. Before a round closes, Disha texts you first.",
        from: 494,
      },
    ],
  },
  {
    // RECORDED — Person B. Caption frames are measured off his clip by
    // silence detection, so do not change this duration without re-cutting them.
    id: "demo",
    durationInFrames: s(26),
    captions: [
      { text: "Riya types one line. 78%, budget 1 lakh, UP.", from: 0 },
      {
        text: "Seconds later she has colleges she can actually get into,",
        from: 151,
      },
      {
        text: "with fees, cutoffs, and a link to where each number comes from.",
        from: 295,
      },
      { text: "Two days later, Disha messages her first.", from: 432 },
      { text: "“Riya, AKTU round 2 kal band ho raha hai.”", from: 519 },
      { text: "Nobody asked it to.", from: 653 },
      { text: "This is the whole product.", from: 701 },
    ],
  },
  {
    // RECORDED — Vivek. Timings below are measured off his clip, so do not
    // change this duration without re-cutting public/clips/vivek.mp4.
    id: "tech",
    durationInFrames: s(18.5),
    captions: [
      { text: "Disha is an agent, not a chatbot.", from: 10 },
      { text: "Memory for every student.", from: 72 },
      { text: "Answers from a college dataset we crawled ourselves,", from: 110 },
      { text: "and “let me check” instead of an invented cutoff.", from: 225 },
      { text: "We store one line per student, never a full conversation.", from: 305 },
      { text: "And it runs GPU-free on Intel’s OpenVINO.", from: 446 },
    ],
  },
  {
    // RECORDED — Vivek. 10.5s is the length of his close (34.0s to the end of
    // his clip). Any longer and the circle runs dry.
    id: "future",
    durationInFrames: s(10.5),
    captions: [
      { text: "A counsellor can hold around 30 students,", from: 26 },
      { text: "but software can hold 30 lakh.", from: 109 },
      { text: "Disha Buddy. Sahi disha, sahi decision.", from: 206 },
    ],
  },
  {
    id: "team",
    durationInFrames: s(8),
    captions: [],
  },
];

// SUM = 7+21.5+24.5+26+18.5+10.5+8 = 116s (< 120s cap).
export const TOTAL_FRAMES = scenes.reduce(
  (acc, sc) => acc + sc.durationInFrames,
  0
);

// Absolute start frame of each scene, for anything that sits above the
// <Series> (the presenter bubble, the voiceover clips).
export const sceneStart: Record<string, number> = {};
scenes.reduce((acc, sc) => {
  sceneStart[sc.id] = acc;
  return acc + sc.durationInFrames;
}, 0);
