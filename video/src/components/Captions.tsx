import { interpolate, useCurrentFrame } from "remotion";
import { body, C, MARGIN } from "../theme";
import { Caption, captionText } from "../timings";
import { EASE } from "./type";

// Every scene keeps its composition above this band. The caption band is fixed
// for the whole film, so the subtitle never lands in a different place from one
// scene to the next.
export const CAPTION_BAND = 196;

// Returns the index of the caption showing at `frame`, and the frame it began.
// Two modes: chunks with an explicit `from` (cut to a real recording) or plain
// strings (split evenly, for parts nobody has recorded yet).
const active = (captions: Caption[], frame: number, duration: number) => {
  const timed = captions.some((c) => typeof c !== "string");

  if (timed) {
    let index = -1;
    let start = 0;
    captions.forEach((c, i) => {
      const from = typeof c === "string" ? 0 : c.from;
      if (frame >= from) {
        index = i;
        start = from;
      }
    });
    return { index, start };
  }

  const slot = duration / captions.length;
  const index = Math.min(captions.length - 1, Math.floor(frame / slot));
  return { index, start: index * slot };
};

// Burned-in English subtitles. Set flush left on the same margin as the rest of
// the film, under a hairline. No floating pill, no blur panel, no border.
export const Captions: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  const frame = useCurrentFrame();
  if (captions.length === 0) return null;

  const { index, start } = active(captions, frame, durationInFrames);
  if (index < 0) return null;

  // Short mask wipe on the swap. Reads as a cut, not a cross-fade.
  const p = interpolate(frame - start, [0, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: MARGIN,
        right: MARGIN,
        bottom: 62,
      }}
    >
      <div style={{ height: 1, background: C.rule, marginBottom: 26 }} />
      <div
        style={{
          height: 104,
          clipPath: `inset(${(1 - p) * 100}% 0 -0.2em 0)`,
          transform: `translateY(${(1 - p) * 8}px)`,
        }}
      >
        <div
          style={{
            fontFamily: body,
            fontSize: 37,
            lineHeight: 1.34,
            fontWeight: 500,
            color: C.ink,
            maxWidth: 1480,
          }}
        >
          {captionText(captions[index])}
        </div>
      </div>
    </div>
  );
};
