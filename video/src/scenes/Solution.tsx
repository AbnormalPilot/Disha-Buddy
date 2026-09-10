import { AbsoluteFill } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Meta, Reveal, Rule } from "../components/type";
import { body, C, display, MARGIN, monoFont } from "../theme";
import { Caption } from "../timings";

// Left: three plain statements separated by hairlines. No cards, no icons.
// Right: the memory, drawn as a filing card that fills in while we talk. The
// product's whole claim is that it keeps this, so we show it being kept.

const Point: React.FC<{
  delay: number;
  title: string;
  body_: string;
  rule?: boolean;
}> = ({ delay, title, body_, rule = true }) => (
  <div>
    {rule && <Rule delay={delay - 6} style={{ marginBottom: 26 }} />}
    <Reveal delay={delay}>
      <div
        style={{
          fontFamily: display,
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -2,
          color: C.ink,
        }}
      >
        {title}
      </div>
    </Reveal>
    <Reveal delay={delay + 6} style={{ marginTop: 10, marginBottom: 34 }}>
      <div
        style={{
          fontFamily: body,
          fontSize: 31,
          lineHeight: 1.36,
          color: C.inkSoft,
          maxWidth: 810,
        }}
      >
        {body_}
      </div>
    </Reveal>
  </div>
);

const CardLine: React.FC<{
  delay: number;
  label: string;
  value: string;
  alert?: boolean;
}> = ({ delay, label, value, alert }) => (
  <Reveal delay={delay} length={14}>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        borderBottom: `1px solid ${C.rule}`,
        padding: "13px 0 11px",
        fontFamily: monoFont,
        fontSize: 21,
      }}
    >
      <span style={{ color: C.muted, letterSpacing: 0.5 }}>{label}</span>
      <span
        style={{
          color: alert ? C.alert : C.ink,
          fontWeight: 500,
        }}
      >
        {value}
      </span>
    </div>
  </Reveal>
);

export const Solution: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  return (
    <Frame>
      <AbsoluteFill>
        {/* one statement per caption, cut to the narration: 86 / 354 / 494 */}
        <div style={{ position: "absolute", left: MARGIN, top: 206 }}>
          <Point
            delay={86}
            rule={false}
            title="It remembers."
            body_="Marks, budget, stream, and every date that matters to this one student."
          />
          <Point
            delay={354}
            title="It cites."
            body_="The source and the date sit next to every number it hands you."
          />
          <Point
            delay={494}
            title="It goes first."
            body_="Before a counselling round closes, Disha opens the chat."
          />
        </div>

        {/* the memory, as a card in a drawer */}
        <div
          style={{
            position: "absolute",
            left: 1064,
            top: 168,
            width: 496,
            transform: "rotate(-1.4deg)",
            background: C.paperDeep,
            border: `1px solid ${C.rule}`,
            boxShadow: "0 24px 44px -26px rgba(60,44,24,0.5)",
            padding: "30px 34px 34px",
          }}
        >
          <Meta delay={10} size={18} color={C.accent}>
            Student memory
          </Meta>
          <Reveal delay={16} style={{ marginTop: 10, marginBottom: 20 }}>
            <div
              style={{
                fontFamily: display,
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: -1,
                color: C.ink,
              }}
            >
              Riya S.
            </div>
          </Reveal>

          <CardLine delay={100} label="class 12 (PCM)" value="78%" />
          <CardLine delay={132} label="budget / year" value="₹1,00,000" />
          <CardLine delay={164} label="wants" value="B.Tech CSE" />
          <CardLine delay={196} label="state" value="Uttar Pradesh" />
          <CardLine delay={368} label="CUET result" value="11 Jul" />
          <CardLine
            delay={508}
            label="AKTU round 2 closes"
            value="26 Jul"
            alert
          />

          <Meta delay={560} size={17} style={{ marginTop: 22 }}>
            kept across every chat
          </Meta>
        </div>
      </AbsoluteFill>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
