import { AbsoluteFill } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Meta, Reveal, useProgress } from "../components/type";
import { body, C, display, MARGIN, monoFont } from "../theme";
import { Caption } from "../timings";

// A drawn system diagram, in the order the data actually moves. Four coloured
// rows in a stack told you nothing about how the thing works. This does, and it
// gives the judges something to read while the narration is dense.

const Box: React.FC<{
  delay: number;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  title: string;
  sub?: string;
  strong?: boolean;
  children?: React.ReactNode;
}> = ({ delay, x, y, w, h, label, title, sub, strong, children }) => {
  const p = useProgress(delay, 18);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        border: `${strong ? 2 : 1}px solid ${strong ? C.ink : C.rule}`,
        background: strong ? C.paperDeep : "transparent",
        padding: "20px 24px",
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      <div
        style={{
          fontFamily: monoFont,
          fontSize: 17,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: strong ? C.accent : C.muted,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: display,
          fontSize: strong ? 42 : 34,
          fontWeight: 700,
          letterSpacing: -1,
          color: C.ink,
          marginTop: 8,
          lineHeight: 1.1,
        }}
      >
        {title}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: body,
            fontSize: 24,
            color: C.inkSoft,
            marginTop: 8,
            lineHeight: 1.32,
          }}
        >
          {sub}
        </div>
      )}
      {children}
    </div>
  );
};

const Link: React.FC<{ d: string; delay: number; dashed?: boolean }> = ({
  d,
  delay,
  dashed,
}) => {
  const p = useProgress(delay, 20);
  return (
    <path
      d={d}
      fill="none"
      stroke={C.ink}
      strokeWidth={1.5}
      pathLength={1}
      strokeDasharray={dashed ? "0.012 0.012" : 1}
      strokeDashoffset={dashed ? 0 : 1 - p}
      opacity={dashed ? p : 1}
    />
  );
};

export const Tech: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  return (
    <Frame>
      <AbsoluteFill>
        {/* Delays below are cut to Vivek's delivery, measured off his clip.
            See RECORDING-STATUS.md. Re-time these if the clip is re-recorded. */}
        <Reveal delay={8} style={{ position: "absolute", left: MARGIN, top: 150 }}>
          <div
            style={{
              fontFamily: display,
              fontSize: 74,
              fontWeight: 700,
              letterSpacing: -2.5,
              color: C.ink,
            }}
          >
            An agent, not a chatbot.
          </div>
        </Reveal>

        <svg
          width={1920}
          height={1080}
          style={{ position: "absolute", inset: 0 }}
        >
          <Link d="M 392 456 L 494 456" delay={48} />
          <Link d="M 884 420 L 950 420 L 950 322 L 1004 322" delay={104} />
          <Link d="M 884 540 L 950 540 L 950 611 L 1004 611" delay={298} />
          <Link d="M 690 610 L 690 662" delay={440} />
        </svg>

        <Box
          delay={34}
          x={MARGIN}
          y={402}
          w={260}
          h={108}
          label="in"
          title="Telegram"
          sub="the app she already has"
        />

        <Box
          delay={12}
          x={494}
          y={352}
          w={390}
          h={258}
          label="the agent"
          title="Disha"
          sub="Memory for every student. Decides when to look something up, and when to write to her first."
          strong
        />

        <Box
          delay={118}
          x={1004}
          y={246}
          w={420}
          h={152}
          label="retrieval"
          title="College dataset"
          sub="Crawled by us. Fees, cutoffs, dates, each with its source."
        />

        <Box
          delay={305}
          x={1004}
          y={518}
          w={420}
          h={252}
          label="store"
          title="One line per student"
        >
          <div style={{ marginTop: 12, fontFamily: monoFont, fontSize: 18 }}>
            {[
              "09:12  profile updated",
              "09:14  college suggested",
              "08:02  deadline alert sent",
            ].map((row, i) => (
              <Reveal key={row} delay={322 + i * 12} length={12}>
                <div
                  style={{
                    color: C.inkSoft,
                    padding: "4px 0",
                    borderBottom: `1px solid ${C.rule}`,
                  }}
                >
                  {row}
                </div>
              </Reveal>
            ))}
            <Meta delay={368} size={16} style={{ marginTop: 10 }}>
              never the conversation
            </Meta>
          </div>
        </Box>

        <Box
          delay={446}
          x={494}
          y={662}
          w={390}
          h={112}
          label="inference"
          title="Intel OpenVINO"
          sub="Runs on ordinary CPUs. No GPU to buy."
        />

        {/* the one honest caveat, stated as a strength */}
        <Meta
          delay={225}
          size={19}
          color={C.accent}
          style={{ position: "absolute", left: 1004, top: 430 }}
        >
          “Let me check” beats an invented cutoff
        </Meta>
      </AbsoluteFill>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
