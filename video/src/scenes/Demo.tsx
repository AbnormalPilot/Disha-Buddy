import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Msg, PhoneChat } from "../components/PhoneChat";
import { EASE, Meta, Reveal } from "../components/type";
import { body, C, display } from "../theme";
import { Caption } from "../timings";

// The phone gets the whole 26 seconds. No dashboard cutaway, no split screen.
// Annotations are set in the margin and joined by a hairline, the way a printed
// diagram is labelled, so nothing is pasted on top of the product.

const messages: Msg[] = [
  {
    from: "student",
    appear: 12,
    time: "9:41",
    read: true,
    text: "Bhaiya, 78% aaye 😅 budget ~1 lakh, UP mein hoon. Kaunsa college milega?",
  },
  {
    from: "disha",
    appear: 163,
    time: "9:41",
    text: "Tumhare marks aur budget dono is par fit baithte hain:",
    card: {
      name: "MMMUT, Gorakhpur",
      meta: "B.Tech CSE · ₹95,000/yr · JEE Main or UPCET",
      source: "mmmut.ac.in · checked 22 Jul 2026",
    },
  },
  { kind: "divider", appear: 442, label: "2 days later" },
  {
    from: "disha",
    appear: 526,
    time: "8:02",
    text: "Riya, AKTU round 2 kal band ho raha hai ⏰ Choices lock kar do. Main saath baithun?",
  },
];

const Note: React.FC<{
  delay: number;
  top: number;
  title: string;
  sub?: string;
  accent?: boolean;
}> = ({ delay, top, title, sub, accent }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 22], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <div style={{ position: "absolute", left: 856, top, width: 700 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 22,
          width: 84,
          height: 1,
          background: accent ? C.alert : C.rule,
          transformOrigin: "left center",
          transform: `scaleX(${p})`,
        }}
      />
      <div
        style={{
          marginLeft: 108,
          opacity: p,
          transform: `translateX(${(1 - p) * -10}px)`,
        }}
      >
        <div
          style={{
            fontFamily: display,
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: -1,
            color: accent ? C.alert : C.ink,
            lineHeight: 1.15,
          }}
        >
          {title}
        </div>
        {sub && (
          <div
            style={{
              fontFamily: body,
              fontSize: 28,
              color: C.inkSoft,
              marginTop: 8,
              maxWidth: 560,
              lineHeight: 1.35,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

export const Demo: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  const frame = useCurrentFrame();

  // A slow push in across the whole scene. Barely visible per second, but it
  // stops the frame feeling like a still with things appearing on it.
  const zoom = interpolate(frame, [0, durationInFrames], [0.95, 0.99], {
    extrapolateRight: "clamp",
  });

  return (
    <Frame>
      <AbsoluteFill>
        <div
          style={{
            position: "absolute",
            left: 300,
            top: 56,
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          <PhoneChat
            messages={messages}
            typing={{ show: 60, hide: 158 }}
            scrollAt={{ frame: 526, by: 96 }}
          />
        </div>

        <Note
          delay={306}
          top={318}
          title="Every number carries its source"
          sub="and the date it was last checked. If Disha does not know, it says so and goes to look."
        />

        <Note
          delay={660}
          top={556}
          accent
          title="Disha opened this chat"
          sub="Riya did not. A cron job read her deadline and wrote to her the morning before it closed."
        />

        <Meta
          delay={706}
          size={19}
          style={{ position: "absolute", left: 964, top: 760 }}
        >
          No app. No form. No English requirement.
        </Meta>
      </AbsoluteFill>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
