import { Composition } from "remotion";
import { DishaVideo } from "./DishaVideo";
import { FPS, WIDTH, HEIGHT, TOTAL_FRAMES } from "./timings";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Festival-compliant master: captions only, no voiceover. */}
      <Composition
        id="DishaVideo"
        component={DishaVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ voiced: false }}
      />
      {/* Optional voiced version (TTS narration). Not for final submission. */}
      <Composition
        id="DishaVideoVoiced"
        component={DishaVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={{ voiced: true }}
      />
    </>
  );
};
