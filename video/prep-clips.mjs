// Level every raw recording to the same loudness before it goes into the film.
//
// People record on different phones in different rooms, and the gap is large:
// Person B's Photo Booth clip came in at -37 LUFS against Vivek's -16, which is
// 21 dB. One gain pass over the finished film cannot fix that, it just makes the
// quiet person quiet and the loud person loud. So each clip is normalised on its
// own first, and only then does the film get its final polish.
//
//   raw recordings ->  clips-raw/          (not bundled, keep the originals)
//   levelled        ->  public/clips/      (what the film actually uses)
//
// Usage: npm run prep:clips

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";

const RAW = "clips-raw";
const OUT = path.join("public", "clips");

// Target for a single speaker. The film's final pass sits at -16 LUFS; leaving
// the individual clips a touch below keeps headroom for the mix.
const TARGET_LUFS = -18;
const TRUE_PEAK = -2;

if (!existsSync(RAW)) {
  console.error(`No ${RAW}/ directory. Put the original recordings there.`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const clips = readdirSync(RAW).filter((f) => /\.(mp4|mov|m4v|m4a|wav|mp3)$/i.test(f));

if (clips.length === 0) {
  console.error(`No recordings found in ${RAW}/`);
  process.exit(1);
}

// ffmpeg prints the loudness summary on stderr, not stdout.
const measure = (file) => {
  const { stderr } = spawnSync(
    "ffmpeg",
    ["-v", "info", "-i", file, "-af", "loudnorm=print_format=summary", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const m = stderr.match(/Input Integrated:\s*(-?[\d.]+) LUFS/);
  return m ? Number(m[1]).toFixed(1) : "?";
};

for (const clip of clips) {
  const src = path.join(RAW, clip);
  const isAudioOnly = /\.(m4a|wav|mp3)$/i.test(clip);
  const dest = path.join(OUT, clip.replace(/\.[^.]+$/, isAudioOnly ? ".m4a" : ".mp4"));

  const before = measure(src);

  execFileSync("ffmpeg", [
    "-y", "-v", "error",
    "-i", src,
    ...(isAudioOnly ? [] : ["-c:v", "copy"]),
    "-af", `loudnorm=I=${TARGET_LUFS}:TP=${TRUE_PEAK}:LRA=11`,
    // Pin the rate. loudnorm resamples to 192k internally and the encoder will
    // happily follow it up to 96k, which most players refuse to decode and play
    // as silence. This line is the whole reason that bug does not come back.
    "-ar", "48000",
    "-ac", "2",
    "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    dest,
  ]);

  const after = measure(dest);
  console.log(
    `${clip.padEnd(22)} ${String(before).padStart(7)} LUFS -> ${String(after).padStart(7)} LUFS   ${dest}`
  );
}
