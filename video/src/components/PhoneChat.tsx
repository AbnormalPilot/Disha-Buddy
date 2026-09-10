import { interpolate, useCurrentFrame } from "remotion";
import { body, C, devanagari, monoFont } from "../theme";
import { EASE } from "./type";

// The phone is the only lit surface in the film, so it has to survive being
// looked at. Everything here is modelled on the real Telegram dark client:
// bubble tails, delivery ticks, a date divider, a live input bar.
//
// If you ever record the real bot, drop the capture in and delete this. A real
// screen recording always beats a rebuilt one.

export type Msg =
  | {
      kind?: "msg";
      from: "student" | "disha";
      appear: number;
      text: React.ReactNode;
      time: string;
      read?: boolean;
      card?: { name: string; meta: string; source: string };
    }
  | { kind: "divider"; appear: number; label: string };

const Ticks: React.FC = () => (
  <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
    <path
      d="M1 6.5 4.5 10 11.5 2"
      stroke="#6BB6DE"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 8.6 10.5 10 17.5 2"
      stroke="#6BB6DE"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Tail: React.FC<{ mine: boolean }> = ({ mine }) => (
  <svg
    width="12"
    height="18"
    viewBox="0 0 12 18"
    style={{
      position: "absolute",
      bottom: 0,
      [mine ? "right" : "left"]: -7,
      transform: mine ? undefined : "scaleX(-1)",
    }}
  >
    <path
      d="M0 0v18C0 18 1 8 12 4 6 4 0 0 0 0Z"
      fill={mine ? C.screenMine : C.screenBubble}
    />
  </svg>
);

const Bubble: React.FC<{ m: Extract<Msg, { kind?: "msg" }> }> = ({ m }) => {
  const frame = useCurrentFrame();
  if (frame < m.appear) return null;

  const mine = m.from === "student";
  const p = interpolate(frame, [m.appear, m.appear + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });

  return (
    <div
      style={{
        display: "flex",
        justifyContent: mine ? "flex-end" : "flex-start",
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "82%",
          background: mine ? C.screenMine : C.screenBubble,
          color: C.screenText,
          fontFamily: body,
          fontSize: 24,
          lineHeight: 1.42,
          padding: "13px 16px 9px",
          borderRadius: 14,
          [mine ? "borderBottomRightRadius" : "borderBottomLeftRadius"]: 4,
        }}
      >
        <Tail mine={mine} />
        <div>{m.text}</div>

        {m.card && (
          // Telegram renders a link preview as an indented block with a rule
          // down its left edge. This is that, carrying the citation.
          <div
            style={{
              marginTop: 10,
              paddingLeft: 14,
              borderLeft: `3px solid #6BB6DE`,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 24 }}>{m.card.name}</div>
            <div style={{ fontSize: 22, opacity: 0.86, marginTop: 3 }}>
              {m.card.meta}
            </div>
            <div
              style={{
                fontFamily: monoFont,
                fontSize: 18,
                color: "#7FBBDD",
                marginTop: 7,
              }}
            >
              {m.card.source}
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 6,
            marginTop: 4,
            fontFamily: body,
            fontSize: 17,
            color: mine ? "#8FC0E0" : C.screenMuted,
          }}
        >
          {m.time}
          {mine && m.read && <Ticks />}
        </div>
      </div>
    </div>
  );
};

const Divider: React.FC<{ label: string; appear: number }> = ({
  label,
  appear,
}) => {
  const frame = useCurrentFrame();
  if (frame < appear) return null;
  const p = interpolate(frame, [appear, appear + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div style={{ display: "flex", justifyContent: "center", opacity: p }}>
      <div
        style={{
          background: "rgba(0,0,0,0.34)",
          color: C.screenText,
          fontFamily: body,
          fontSize: 18,
          padding: "5px 14px",
          borderRadius: 999,
        }}
      >
        {label}
      </div>
    </div>
  );
};

const Typing: React.FC<{ show: number; hide: number }> = ({ show, hide }) => {
  const frame = useCurrentFrame();
  if (frame < show || frame > hide) return null;
  const dot = (i: number) => ({
    width: 9,
    height: 9,
    borderRadius: "50%",
    background: C.screenMuted,
    display: "inline-block",
    transform: `translateY(${Math.sin((frame + i * 7) / 5) * 3}px)`,
  });
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          background: C.screenBubble,
          padding: "16px 18px",
          borderRadius: 14,
          borderBottomLeftRadius: 4,
          display: "flex",
          gap: 7,
          alignItems: "center",
        }}
      >
        <span style={dot(0)} />
        <span style={dot(1)} />
        <span style={dot(2)} />
      </div>
    </div>
  );
};

export const PhoneChat: React.FC<{
  messages: Msg[];
  typing?: { show: number; hide: number };
  scrollAt?: { frame: number; by: number };
}> = ({ messages, typing, scrollAt }) => {
  const frame = useCurrentFrame();
  const scroll = scrollAt
    ? interpolate(
        frame,
        [scrollAt.frame, scrollAt.frame + 26],
        [0, -scrollAt.by],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE }
      )
    : 0;

  return (
    <div
      style={{
        width: 540,
        height: 830,
        borderRadius: 46,
        background: "#1A1D20",
        padding: 9,
        // Warm shadow, tinted to the paper. A pure black drop shadow on a warm
        // ground is the giveaway that nothing was actually lit.
        boxShadow:
          "0 2px 0 rgba(255,255,255,0.35) inset, 0 46px 90px -30px rgba(60,44,24,0.55), 0 10px 26px -12px rgba(60,44,24,0.4)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 38,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: C.screen,
        }}
      >
        {/* status bar */}
        <div
          style={{
            background: C.screenPanel,
            padding: "12px 24px 0",
            display: "flex",
            justifyContent: "space-between",
            fontFamily: body,
            fontSize: 18,
            fontWeight: 600,
            color: C.screenText,
          }}
        >
          <span>9:41</span>
          <span style={{ letterSpacing: 2 }}>4G ▮</span>
        </div>

        {/* chat header */}
        <div
          style={{
            background: C.screenPanel,
            padding: "12px 22px 14px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <svg width="13" height="22" viewBox="0 0 13 22" fill="none">
            <path
              d="M11 1 2 11l9 10"
              stroke="#6BB6DE"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "#2F7DB0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: devanagari,
              fontWeight: 600,
              fontSize: 26,
              color: "#fff",
            }}
          >
            दि
          </div>
          <div style={{ fontFamily: body, color: C.screenText }}>
            <div style={{ fontSize: 25, fontWeight: 600 }}>Disha</div>
            <div style={{ fontSize: 19, color: "#6BB6DE" }}>online</div>
          </div>
        </div>

        {/* messages */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            background: `linear-gradient(180deg, #0E1418 0%, #101A21 100%)`,
          }}
        >
          <div
            style={{
              padding: "20px 18px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              justifyContent: "flex-end",
              minHeight: "100%",
              transform: `translateY(${scroll}px)`,
            }}
          >
            {messages.map((m, i) =>
              m.kind === "divider" ? (
                <Divider key={i} label={m.label} appear={m.appear} />
              ) : (
                <Bubble key={i} m={m} />
              )
            )}
            {typing && <Typing show={typing.show} hide={typing.hide} />}
          </div>
        </div>

        {/* input bar */}
        <div
          style={{
            background: C.screenPanel,
            padding: "16px 22px 22px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: body,
            fontSize: 22,
            color: C.screenMuted,
          }}
        >
          <span style={{ flex: 1 }}>Message</span>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"
              stroke="#6BB6DE"
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
