import { AbsoluteFill } from "remotion";
import { Captions } from "../components/Captions";
import { Frame } from "../components/Frame";
import { Meta, Reveal, Rule } from "../components/type";
import { body, C, display, MARGIN } from "../theme";
import { Caption } from "../timings";

// Nearly empty on purpose. One argument and one name, with room around both.
//
// Order follows Vivek's delivery: he opens on the counsellor-vs-software
// contrast and closes on the tagline. The roadmap never gets spoken, so it sits
// underneath as a quiet graphic rather than competing for the same beat.
export const Future: React.FC<{
  captions: Caption[];
  durationInFrames: number;
}> = ({ captions, durationInFrames }) => {
  const next = [
    "Every state",
    "More languages",
    "WhatsApp",
    "Scholarship matching",
  ];

  return (
    <Frame>
      <AbsoluteFill>
        <div style={{ position: "absolute", left: MARGIN, top: 188 }}>
          <Reveal delay={30}>
            <div
              style={{
                fontFamily: display,
                fontSize: 66,
                fontWeight: 500,
                letterSpacing: -2,
                color: C.muted,
              }}
            >
              A counsellor can hold thirty students.
            </div>
          </Reveal>
          <Reveal delay={109} style={{ marginTop: 14 }}>
            <div
              style={{
                fontFamily: display,
                fontSize: 96,
                fontWeight: 700,
                letterSpacing: -4,
                color: C.accent,
                lineHeight: 1.02,
              }}
            >
              Software can hold thirty lakh.
            </div>
          </Reveal>

          <Rule delay={158} style={{ marginTop: 62, width: 1300 }} />

          {/* not spoken: on screen for the judges to read */}
          <div style={{ display: "flex", gap: 40, marginTop: 34 }}>
            {next.map((n, i) => (
              <Reveal key={n} delay={166 + i * 7}>
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 32,
                    color: C.inkSoft,
                    paddingRight: 40,
                    borderRight:
                      i < next.length - 1 ? `1px solid ${C.rule}` : "none",
                  }}
                >
                  {n}
                </div>
              </Reveal>
            ))}
          </div>

          <div
            style={{
              marginTop: 78,
              display: "flex",
              alignItems: "baseline",
              gap: 26,
            }}
          >
            <Reveal delay={206}>
              <div
                style={{
                  fontFamily: display,
                  fontSize: 56,
                  fontWeight: 700,
                  letterSpacing: -2,
                  color: C.ink,
                }}
              >
                Disha Buddy
              </div>
            </Reveal>
            <Reveal delay={222}>
              <div
                style={{
                  fontFamily: body,
                  fontSize: 38,
                  color: C.inkSoft,
                }}
              >
                sahi disha, sahi decision
              </div>
            </Reveal>
          </div>

        </div>
      </AbsoluteFill>

      <Captions captions={captions} durationInFrames={durationInFrames} />
    </Frame>
  );
};
