import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Counter, EASE, Meta, Reveal, Rule } from "../components/type";
import { body, C, display, MARGIN, monoFont } from "../theme";
import { Caption } from "../timings";

// Four held frames instead of three cards in a row. Each fact gets the whole
// screen for five seconds, which is how you make a number land.

const Big: React.FC<{ children: React.ReactNode; size?: number }> = ({
  children,
  size = 300,
}) => (
  <Reveal delay={4} length={26}>
    <div
      style={{
        fontFamily: display,
        fontSize: size,
        fontWeight: 700,
        letterSpacing: -12,
        lineHeight: 0.86,
        color: C.ink,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </div>
  </Reveal>
);

const Says: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Reveal delay={14} style={{ marginTop: 34, maxWidth: 1150 }}>
    <div
      style={{
        fontFamily: body,
        fontSize: 48,
        lineHeight: 1.3,
        color: C.inkSoft,
      }}
    >
      {children}
    </div>
  </Reveal>
);

// 3,000 dots and one of them is the counsellor. Drawn as a tiled background so
// it costs two DOM nodes instead of three thousand.
const DotField: React.FC = () => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [10, 58], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  const one = interpolate(frame, [62, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "relative", width: 1400, height: 420 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `inset(0 ${wipe}% 0 0)`,
          backgroundImage: `radial-gradient(circle at 7px 7px, ${C.inkSoft} 2.6px, transparent 2.9px)`,
          backgroundSize: "14px 14px",
        }}
      />
      {/* the one counsellor */}
      <div
        style={{
          position: "absolute",
          left: 861,
          top: 189,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: C.accent,
          transform: `scale(${one})`,
        }}
      />
      {/* the leader runs up out of the field so the label sits on clean paper */}
      <div
        style={{
          position: "absolute",
          left: 869,
          top: -54,
          width: 1,
          height: 247,
          background: C.accent,
          transformOrigin: "bottom center",
          transform: `scaleY(${one})`,
        }}
      />
      <Meta
        delay={70}
        color={C.accent}
        style={{ position: "absolute", left: 812, top: -92 }}
      >
        1 counsellor
      </Meta>
      <Meta
        delay={40}
        style={{ position: "absolute", left: 0, top: 452 }}
      >
        3,000 students
      </Meta>
    </div>
  );
};

const Source: React.FC<{ children: React.ReactNode; delay?: number }> = ({
  children,
  delay = 30,
}) => (
  <Meta delay={delay} size={19} style={{ marginTop: 40 }}>
    {children}
  </Meta>
);

export const Problem: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  // Panel boundaries are the caption frames, so each fact appears as it is
  // spoken rather than on an even quarter split.
  const cut = [0, 112, 223, 366];
  const len = (i: number) =>
    (i === cut.length - 1 ? durationInFrames : cut[i + 1]) - cut[i];

  return (
    <Frame>
      {/* 93% */}
      <Sequence from={cut[0]} durationInFrames={len(0)}>
        <AbsoluteFill style={{ padding: `260px ${MARGIN}px 0` }}>
          <Big>
            <Counter to={93} delay={4} length={34} suffix="%" />
          </Big>
          <Says>of Indian schools have no career counsellor</Says>
          <Source>Infigon Futures / Higher Education Digest</Source>
        </AbsoluteFill>
      </Sequence>

      {/* 1 : 3,000 */}
      <Sequence from={cut[1]} durationInFrames={len(1)}>
        <AbsoluteFill style={{ padding: `210px ${MARGIN}px 0` }}>
          <DotField />
        </AbsoluteFill>
      </Sequence>

      {/* the gap, shown at true relative scale */}
      <Sequence from={cut[2]} durationInFrames={len(2)}>
        <AbsoluteFill style={{ padding: `230px ${MARGIN}px 0` }}>
          <Big size={236}>
            <Counter to={1400000} delay={4} length={40} indian />
          </Big>
          <Reveal delay={14} style={{ marginTop: 22 }}>
            <div
              style={{
                fontFamily: body,
                fontSize: 42,
                color: C.inkSoft,
              }}
            >
              counsellors India needs
            </div>
          </Reveal>
          <Rule delay={34} style={{ margin: "46px 0 34px", width: 820 }} />
          <Reveal delay={40}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 24,
              }}
            >
              <span
                style={{
                  fontFamily: display,
                  fontSize: 62,
                  fontWeight: 700,
                  color: C.alert,
                  letterSpacing: -2,
                }}
              >
                under 10,000
              </span>
              <span
                style={{ fontFamily: body, fontSize: 34, color: C.muted }}
              >
                is what it has
              </span>
            </div>
          </Reveal>
        </AbsoluteFill>
      </Sequence>

      {/* who pays for it */}
      <Sequence from={cut[3]} durationInFrames={len(3)}>
        <AbsoluteFill style={{ padding: `250px ${MARGIN}px 0` }}>
          <Reveal delay={4}>
            <div
              style={{
                fontFamily: display,
                fontSize: 92,
                fontWeight: 700,
                letterSpacing: -3,
                lineHeight: 1.08,
                color: C.ink,
                maxWidth: 1320,
              }}
            >
              First generation. Small town.
              <br />
              No money for private counselling.
            </div>
          </Reveal>
          <Rule delay={40} style={{ margin: "48px 0 30px", width: 1320 }} />
          <Reveal delay={46}>
            <div
              style={{
                fontFamily: body,
                fontSize: 44,
                color: C.inkSoft,
              }}
            >
              The students who need guidance most get none of it.
            </div>
          </Reveal>
        </AbsoluteFill>
      </Sequence>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
