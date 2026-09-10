import { AbsoluteFill } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Meta, Reveal, Rule } from "../components/type";
import { body, C, devanagari, display, MARGIN, monoFont } from "../theme";
import { Caption } from "../timings";

// A masthead, not a centred logo over a glow. The title sets flush left on the
// film's margin, with the Hindi word it comes from glossed beside it, because
// "disha" meaning direction is the whole idea and it is worth four seconds.
export const Intro: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  return (
    <Frame head={false}>
      <AbsoluteFill>
        <Meta delay={0} style={{ position: "absolute", top: 56, left: MARGIN }}>
          India AI Impact Festival 2026
        </Meta>
        <div
          style={{
            position: "absolute",
            top: 56,
            right: MARGIN,
            fontFamily: monoFont,
            fontSize: 19,
            letterSpacing: 1.5,
            color: C.muted,
            textTransform: "uppercase",
          }}
        >
          Submission film
        </div>

        <div style={{ position: "absolute", top: 224, left: MARGIN }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 48 }}>
            <div>
              <Reveal delay={8}>
                <div
                  style={{
                    fontFamily: display,
                    fontSize: 168,
                    fontWeight: 700,
                    letterSpacing: -6,
                    lineHeight: 0.94,
                    color: C.ink,
                  }}
                >
                  Disha
                </div>
              </Reveal>
              <Reveal delay={18}>
                <div
                  style={{
                    fontFamily: display,
                    fontSize: 168,
                    fontWeight: 700,
                    letterSpacing: -6,
                    lineHeight: 0.94,
                    color: C.ink,
                  }}
                >
                  Buddy
                </div>
              </Reveal>
            </div>

            {/* the gloss */}
            <div style={{ paddingTop: 30 }}>
              <Reveal delay={34}>
                <div
                  style={{
                    fontFamily: devanagari,
                    fontSize: 76,
                    fontWeight: 500,
                    color: C.accent,
                    lineHeight: 1.2,
                  }}
                >
                  दिशा
                </div>
              </Reveal>
              <Meta delay={46} size={20} style={{ marginTop: 12 }}>
                noun. direction
              </Meta>
            </div>
          </div>

          <Rule delay={54} style={{ marginTop: 56, width: 940 }} />
          <Reveal delay={62} style={{ marginTop: 28 }}>
            <div
              style={{
                fontFamily: body,
                fontSize: 42,
                fontWeight: 400,
                color: C.inkSoft,
              }}
            >
              A college mentor on Telegram that texts you first.
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
