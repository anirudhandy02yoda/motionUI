import React from "react";
import { Composition } from "remotion";
import { WalkthroughComposition, calculateWalkthroughMetadata } from "./Composition";
import { CANVAS_WIDTH, CANVAS_HEIGHT, VIDEO_FPS } from "./layout";
import { sampleAnalysis } from "@/lib/sampleData";
import "./style.css";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Walkthrough"
      component={WalkthroughComposition}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      fps={VIDEO_FPS}
      durationInFrames={450}
      defaultProps={{ analysis: sampleAnalysis }}
      calculateMetadata={calculateWalkthroughMetadata}
    />
  );
};
