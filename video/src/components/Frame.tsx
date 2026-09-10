import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { C, MARGIN, monoFont } from "../theme";

// Paper tooth. A static SVG-noise fill multiplied over the ground so the flat
// colour reads as stock rather than as a CSS background. Static on purpose:
// per-frame noise flickers and doubles render time.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E\")";

// The ground every scene sits on. A running head at the top left ties the
// frames together the way a slug line ties spreads together in print.
export const Frame: React.FC<{
  children?: React.ReactNode;
  head?: boolean;
}> = ({ children, head = true }) => {
  const frame = useCurrentFrame();

  // Scene-to-scene transition. The paper ground and the speaker's circle are
  // continuous across every cut, so only the scene's own content dissolves up.
  // Doing it this way costs no frames, which matters: the caption timings are
  // measured off a real recording and must not shift.
  const enter = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.33, 1, 0.68, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          backgroundImage: GRAIN,
          backgroundSize: "300px 300px",
          opacity: 0.16,
          mixBlendMode: "multiply",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [1.012, 1])})`,
        }}
      >
      {head && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: MARGIN,
            right: MARGIN,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: monoFont,
            fontSize: 19,
            letterSpacing: 1.5,
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          <span>Disha Buddy</span>
          <span>India AI Impact Festival 2026</span>
        </div>
      )}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
