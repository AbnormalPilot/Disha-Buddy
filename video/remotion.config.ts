import { Config } from "@remotion/cli/config";

// h264 MP4, sized to stay comfortably under the 60 MB festival cap.
Config.setVideoImageFormat("jpeg");
Config.setCodec("h264");
Config.setCrf(26);
Config.overrideWebpackConfig((c) => c);
