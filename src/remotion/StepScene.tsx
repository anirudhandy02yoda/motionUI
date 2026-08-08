import React, { forwardRef } from "react";
import { WalkthroughStep } from "@/lib/types";
import { CARD_HEIGHT } from "./layout";

interface StepSceneProps {
  step: WalkthroughStep;
  opacity: number;
}

/** Renders the model's contentHtml verbatim, edge-to-edge — the entire
 * reconstructed screen, exactly like StepCard.tsx in the live player. No
 * chrome, icons, or fields are added around it. */
const StepScene = forwardRef<HTMLDivElement, StepSceneProps>(function StepScene(
  { step, opacity },
  ref
) {
  return (
    <div style={{ position: "absolute", inset: 0, height: CARD_HEIGHT, opacity }}>
      <div
        ref={ref}
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
        }}
        dangerouslySetInnerHTML={{ __html: step.domStructure.contentHtml || "" }}
      />
    </div>
  );
});

export default StepScene;
