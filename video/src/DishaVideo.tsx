import { AbsoluteFill, Audio, Sequence, Series, staticFile } from "remotion";
import { Caption, scenes } from "./timings";
import { segments, segmentWindow } from "./presenters";
import { Presenter } from "./components/Presenter";
import { C } from "./theme";
import { Intro } from "./scenes/Intro";
import { Problem } from "./scenes/Problem";
import { Solution } from "./scenes/Solution";
import { Demo } from "./scenes/Demo";
import { Tech } from "./scenes/Tech";
import { Future } from "./scenes/Future";
import { Team } from "./scenes/Team";

const sceneComponents: Record<
  string,
  React.FC<{ captions: Caption[]; durationInFrames: number }>
> = {
  intro: Intro,
  problem: Problem,
  solution: Solution,
  demo: Demo,
  tech: Tech,
  future: Future,
  team: Team,
};

// Scenes that have a generated TTS clip in public/audio/. Preview only: the
// festival forbids an AI voiceover, so the shipped film uses the team's own
// recordings from public/clips/ (see presenters.ts).
const VOICED_SCENES = new Set([
  "intro",
  "problem",
  "solution",
  "demo",
  "tech",
  "future",
]);

export const DishaVideo: React.FC<{ voiced?: boolean }> = ({
  voiced = false,
}) => {
  // Once real clips are wired in they carry the narration, so the TTS preview
  // track is suppressed rather than played on top of your voice.
  const anyRealVoice = segments.some((s) => s.clip || s.audio);

  return (
    <AbsoluteFill style={{ backgroundColor: C.paper }}>
      <Series>
        {scenes.map((sc) => {
          const Comp = sceneComponents[sc.id];
          return (
            <Series.Sequence key={sc.id} durationInFrames={sc.durationInFrames}>
              <Comp
                captions={sc.captions}
                durationInFrames={sc.durationInFrames}
              />
              {voiced && !anyRealVoice && VOICED_SCENES.has(sc.id) && (
                <Audio src={staticFile(`audio/${sc.id}.wav`)} />
              )}
            </Series.Sequence>
          );
        })}
      </Series>

      {/* The speaker, in the corner, for the length of their section. Lives
          above the <Series> so it survives scene cuts inside one part. */}
      {segments.map((seg) => {
        const w = segmentWindow(seg);
        return (
          <Sequence
            key={`${seg.person}-${seg.scenes.join("-")}`}
            from={w.from}
            durationInFrames={w.durationInFrames}
          >
            <Presenter segment={seg} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
