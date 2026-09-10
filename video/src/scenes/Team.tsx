import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Frame } from "../components/Frame";
import { Meta, Reveal, Rule } from "../components/type";
import { team } from "../presenters";
import { body, C, display, MARGIN, monoFont } from "../theme";
import { Caption } from "../timings";

// Closing card. All three of us at once, which is the only place in the film we
// appear together, since we shot in three different rooms.
//
// Three stills. Everyone on the team appears here, including anyone who has no
// speaking part in the film.

const SIZE = 268;

const Portrait: React.FC<{
  index: number;
  name: string;
  photo: string;
}> = ({ index, name, photo }) => {
  const frame = useCurrentFrame();
  const delay = 10 + index * 12;
  const p = Math.min(1, Math.max(0, (frame - delay) / 20));

  return (
    <div
      style={{
        opacity: p,
        transform: `translateY(${(1 - p) * 16}px)`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: SIZE,
          height: SIZE,
          borderRadius: "50%",
          overflow: "hidden",
          background: C.paperDeep,
          border: `2px solid ${C.ink}`,
          boxShadow: "0 26px 44px -24px rgba(60,44,24,0.5)",
        }}
      >
        <Img
          src={staticFile(photo)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: display,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: -0.5,
          color: C.ink,
        }}
      >
        {name}
      </div>
    </div>
  );
};

export const Team: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = () => {
  return (
    <Frame head={false}>
      <AbsoluteFill>
        <Meta delay={0} style={{ position: "absolute", top: 56, left: MARGIN }}>
          The team
        </Meta>

        <div
          style={{
            position: "absolute",
            top: 250,
            left: MARGIN,
            right: MARGIN,
            display: "flex",
            justifyContent: "center",
            gap: 92,
          }}
        >
          {team.map((p, i) => (
            <Portrait key={p.name} index={i} name={p.name} photo={p.photo} />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: MARGIN,
            right: MARGIN,
            bottom: 190,
            textAlign: "center",
          }}
        >
          <Rule delay={60} style={{ marginBottom: 34 }} />
          <Reveal delay={66}>
            <div
              style={{
                fontFamily: display,
                fontSize: 60,
                fontWeight: 700,
                letterSpacing: -2,
                color: C.ink,
              }}
            >
              Disha Buddy
            </div>
          </Reveal>
          <Reveal delay={74} style={{ marginTop: 10 }}>
            <div style={{ fontFamily: body, fontSize: 34, color: C.inkSoft }}>
              sahi disha, sahi decision
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
