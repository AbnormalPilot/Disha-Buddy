// Builds the OPTIONAL voiced version by muxing the TTS narration onto the
// silent master with ffmpeg. We do NOT use Remotion's <Audio> embedding here —
// its mp4 edit-list/faststart quirks made the track inaudible in some players.
// This produces a clean, loud, universally-compatible AAC track instead.
//
// Prereqs: `npm run build:audio` (writes public/audio/*.wav) and a rendered
// out/disha-buddy.mp4 (silent master). Run: `npm run build:voiced`.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

// Scene order + seconds — MUST match src/timings.ts. Team has no narration.
const SCENES = [
  ["intro", 10],
  ["problem", 19],
  ["solution", 20],
  ["demo", 26],
  ["tech", 17],
  ["future", 12],
  ["team", 8],
];
const TOTAL = SCENES.reduce((a, [, s]) => a + s, 0); // 112

if (!existsSync("out/disha-buddy.mp4")) {
  console.error("Missing out/disha-buddy.mp4 — run `npm run render` first.");
  process.exit(1);
}

// Compute each narrated scene's start offset (ms) and build the filtergraph.
let offset = 0;
const inputs = [];
const filters = [];
const labels = [];
let idx = 0;
for (const [id, sec] of SCENES) {
  if (existsSync(`public/audio/${id}.wav`)) {
    inputs.push("-i", `public/audio/${id}.wav`);
    const ms = Math.round(offset * 1000);
    filters.push(`[${idx}:a]adelay=${ms}|${ms}[a${idx}]`);
    labels.push(`[a${idx}]`);
    idx++;
  }
  offset += sec;
}
if (!labels.length) {
  console.error("No narration wavs found — run `npm run build:audio` first.");
  process.exit(1);
}

const graph =
  filters.join(";") +
  ";" +
  labels.join("") +
  `amix=inputs=${labels.length}:normalize=0,` +
  `loudnorm=I=-14:TP=-1.5,aresample=48000,apad,atrim=0:${TOTAL}[out]`;

console.log("Building narration track…");
execSync(
  `ffmpeg -y ${inputs.join(" ")} -filter_complex ${JSON.stringify(graph)} ` +
    `-map "[out]" -ac 2 -ar 48000 out/narration.m4a`,
  { stdio: "inherit" }
);

console.log("Muxing onto silent master…");
execSync(
  `ffmpeg -y -i out/disha-buddy.mp4 -i out/narration.m4a ` +
    `-map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest ` +
    `out/disha-buddy-voiced.mp4`,
  { stdio: "inherit" }
);

console.log("\n✓ out/disha-buddy-voiced.mp4 ready (voiced, for preview only).");
