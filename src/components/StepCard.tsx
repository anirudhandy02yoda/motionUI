"use client";

import { forwardRef } from "react";
import { WalkthroughStep } from "@/lib/types";

interface StepCardProps {
  step: WalkthroughStep;
  isActive: boolean;
}

/** A single reconstructed screen. Renders the model's contentHtml verbatim,
 * edge-to-edge — this is the ENTIRE screen (header, badges, icons, input,
 * everything), not a slot inside app chrome we invent. The only thing not
 * present in the original screenshot is the outer rounded/bordered frame,
 * a purely decorative "device bezel" around the recreation, not a UI element
 * within it. The interactive element for this step's action is located at
 * runtime via the model-provided `data-action-target="true"` attribute
 * somewhere inside contentHtml. */
const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  { step, isActive },
  ref
) {
  return (
    <div
      ref={ref}
      className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
      aria-hidden={!isActive}
    >
      <div
        data-role="content"
        className="h-full w-full overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: step.domStructure.contentHtml || "" }}
      />
    </div>
  );
});

export default StepCard;
