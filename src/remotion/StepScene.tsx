import React, { forwardRef } from "react";
import { WalkthroughStep } from "@/lib/types";
import { CARD_HEIGHT } from "./layout";

interface StepSceneProps {
  step: WalkthroughStep;
  opacity: number;
  blurPx: number;
}

/** Renders the model's contentHtml verbatim, edge-to-edge — the entire
 * reconstructed screen, exactly like StepCard.tsx in the live player.
 * Top-anchored at its own natural content height (capped to CARD_HEIGHT,
 * scrolling internally beyond that) rather than stretched to fill it, and
 * dissolves in/out (opacity + blur) rather than sliding — this reads as one
 * continuous interactive UI updating itself, not a slideshow of same-size
 * frames. */
const StepScene = forwardRef<HTMLDivElement, StepSceneProps>(function StepScene(
  { step, opacity, blurPx },
  ref
) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        maxHeight: CARD_HEIGHT,
        opacity,
        filter: `blur(${blurPx}px)`,
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      <div
        ref={ref}
        data-role="content"
        style={{ width: "100%", maxHeight: CARD_HEIGHT, background: "#fff", overflowY: "auto" }}
        dangerouslySetInnerHTML={{ __html: step.domStructure.contentHtml || "" }}
      />
    </div>
  );
});

export default StepScene;
