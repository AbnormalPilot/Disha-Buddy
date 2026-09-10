// Design system for the film.
//
// The old deck was dark-with-coloured-glows, which is the look every generated
// pitch video has. This one is set like print: warm newsprint ground, ink type,
// ONE signal accent. The only lit surface in the whole film is the phone
// screen, because that is the actual product.

import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadPlex } from "@remotion/google-fonts/IBMPlexSans";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";
import { loadFont as loadDeva } from "@remotion/google-fonts/IBMPlexSansDevanagari";

const { fontFamily: archivo } = loadArchivo("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});
const { fontFamily: plex } = loadPlex("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const { fontFamily: mono } = loadMono("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});
const { fontFamily: deva } = loadDeva("normal", {
  weights: ["400", "500", "600"],
  subsets: ["devanagari", "latin"],
});

export const display = `${archivo}, "Helvetica Neue", sans-serif`;
export const body = `${plex}, "Helvetica Neue", sans-serif`;
export const monoFont = `${mono}, ui-monospace, monospace`;
export const devanagari = `${deva}, ${plex}, sans-serif`;

export const C = {
  paper: "#EFE9DD", // warm newsprint ground
  paperDeep: "#E5DDCD", // banded / recessed areas
  ink: "#17181C",
  inkSoft: "#3E3F42",
  muted: "#7B7568",
  rule: "#CBC2B0",

  accent: "#134E86", // the single accent, used everywhere, never swapped
  alert: "#B33A22", // semantic only: a deadline is closing. twice in 112s.

  screen: "#0E1418", // Telegram dark, the product surface
  screenPanel: "#17212B",
  screenBubble: "#1F2B36",
  screenMine: "#2B5278",
  screenText: "#EDF1F5",
  screenMuted: "#7D8E9E",
};

// One margin for the whole film. Every scene aligns to it.
export const MARGIN = 132;
