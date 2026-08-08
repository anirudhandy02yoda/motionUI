import { Config } from "@remotion/cli/config";
import { withAntigravityConfig } from "./src/remotion/webpackOverride";

Config.overrideWebpackConfig(withAntigravityConfig);
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
