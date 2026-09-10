import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, monoFont } from "../theme";

// One easing curve for the entire film. Everything decelerates the same way,
// which is what makes cuts feel authored instead of bouncy-by-default.
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const useProgress = (delay: number, length = 22) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
};

// Type reveal: the line rises out from behind a mask edge, the way set type
// comes off a press. No fade-and-float, no spring overshoot.
export const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  length?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, length = 24, style }) => {
  const p = useProgress(delay, length);
  return (
    <div
      style={{
        clipPath: `inset(${(1 - p) * 100}% 0 -0.2em 0)`,
        transform: `translateY(${(1 - p) * 0.16}em)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// A hairline that draws itself. Used only where it separates real content.
export const Rule: React.FC<{
  delay?: number;
  length?: number;
  color?: string;
  thickness?: number;
  style?: React.CSSProperties;
}> = ({ delay = 0, length = 26, color = C.rule, thickness = 1, style }) => {
  const p = useProgress(delay, length);
  return (
    <div
      style={{
        height: thickness,
        background: color,
        transform: `scaleX(${p})`,
        transformOrigin: "left center",
        ...style,
      }}
    />
  );
};

// Small mono label. Not an eyebrow above a headline: used for data, sources
// and timestamps, where monospace is doing real work.
export const Meta: React.FC<{
  children: React.ReactNode;
  delay?: number;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, color = C.muted, size = 22, style }) => {
  const p = useProgress(delay, 18);
  return (
    <div
      style={{
        opacity: p,
        fontFamily: monoFont,
        fontSize: size,
        letterSpacing: 1.2,
        color,
        textTransform: "uppercase",
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// Indian digit grouping: 1500000 -> 15,00,000. Worth the six lines. A film for
// Indian students that formats its numbers the American way is a tell.
export const groupIndian = (n: number) => {
  const s = Math.round(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
};

export const Counter: React.FC<{
  to: number;
  delay?: number;
  length?: number;
  indian?: boolean;
  suffix?: string;
}> = ({ to, delay = 0, length = 40, indian = false, suffix = "" }) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [delay, delay + length], [0, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE,
  });
  return (
    <span>
      {indian ? groupIndian(v) : Math.round(v)}
      {suffix}
    </span>
  );
};
