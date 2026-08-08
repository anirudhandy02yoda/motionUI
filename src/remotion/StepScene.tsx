import React, { forwardRef } from "react";
import { WalkthroughStep } from "@/lib/types";
import { CARD_HEIGHT } from "./layout";

interface StepSceneProps {
  step: WalkthroughStep;
  xPercent: number;
}

/** Renders the model's contentHtml verbatim, edge-to-edge — the entire
 * reconstructed screen, exactly like StepCard.tsx in the live player. No
 * chrome, icons, or fields are added around it. Screens slide in/out via
 * xPercent (translateX) rather than crossfading, since two differently
 * laid-out screens overlapping at partial opacity read as a broken "double
 * exposure" rather than a walkthrough transition. */
const StepScene = forwardRef<HTMLDivElement, StepSceneProps>(function StepScene(
  { step, xPercent },
  ref
) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        height: CARD_HEIGHT,
        transform: `translateX(${xPercent}%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <div
          ref={ref}
          data-role="content"
          style={{ position: "absolute", inset: 0, background: "#fff", overflowY: "auto" }}
          dangerouslySetInnerHTML={{ __html: step.domStructure.contentHtml || "" }}
        />
      </div>
    </div>
  );
});

export default StepScene;
