import { Audio, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { BUBBLE, Segment } from "../presenters";
import { C, monoFont } from "../theme";
import { useProgress } from "./type";

// The speaker, in a circle in the bottom-right corner, for the length of their
// section. Their clip's audio is the narration.
//
// Deliberately not a glassy floating card: a plain ink ring and a shadow tinted
// to the paper, so it reads as a hole cut in the page rather than a widget
// pasted on top.
export const Presenter: React.FC<{ segment: Segment }> = ({ segment }) => {
  const frame = useCurrentFrame();
  const entrance = useProgress(6, 20);
  // A continuation segment is already on screen; it must not re-animate.
  const p = segment.fadeIn ? entrance : 1;
  const src = segment.clip ? staticFile(segment.clip) : null;
  const { zoom, x, y } = segment.framing;

  // Voice only: their narration plays, nothing is drawn. The corner stays empty
  // rather than showing a placeholder nobody is going to fill.
  if (!segment.showCircle) {
    return segment.audio ? <Audio src={staticFile(segment.audio)} /> : null;
  }

  return (
    <div
      style={{
        position: "absolute",
        right: BUBBLE.right,
        bottom: BUBBLE.bottom,
        width: BUBBLE.size,
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div
        style={{
          width: BUBBLE.size,
          height: BUBBLE.size,
          borderRadius: "50%",
          overflow: "hidden",
          background: C.paperDeep,
          border: `2px solid ${C.ink}`,
          boxShadow: "0 26px 44px -22px rgba(60,44,24,0.55)",
        }}
      >
        {src ? (
          <OffthreadVideo
            src={src}
            trimBefore={segment.trimBefore || undefined}
            trimAfter={segment.trimAfter ?? undefined}
            muted={Boolean(segment.audio)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${zoom}) translate(${x}%, ${y}%)${
                segment.mirror ? " scaleX(-1)" : ""
              }`,
            }}
          />
        ) : (
          <Placeholder id={segment.person} frame={frame} />
        )}
      </div>

      <div
        style={{
          marginTop: 12,
          textAlign: "center",
          fontFamily: monoFont,
          fontSize: 18,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          color: C.muted,
        }}
      >
        {segment.name}
      </div>

      {segment.audio && <Audio src={staticFile(segment.audio)} />}
    </div>
  );
};

// Shown until a real clip is dropped into public/clips/.
const Placeholder: React.FC<{ id: string; frame: number }> = ({ id, frame }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundImage: `repeating-linear-gradient(45deg, ${C.paperDeep} 0 12px, ${C.paper} 12px 24px)`,
      backgroundPositionX: (frame * 0.4) % 24,
      fontFamily: monoFont,
      color: C.muted,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 40, color: C.ink }}>{id.toUpperCase()}</div>
    <div style={{ fontSize: 15, letterSpacing: 1, maxWidth: 150 }}>
      clip goes here
    </div>
  </div>
);
