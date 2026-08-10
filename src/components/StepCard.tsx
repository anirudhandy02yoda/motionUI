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
 * somewhere inside contentHtml.
 *
 * Top-anchored at its own natural content height (capped to the stage's
 * height, scrolling internally beyond that) rather than stretched to fill
 * it — a compact empty-state screen and a tall full-page answer should
 * both look like screenshots of the same app, not two panels forced to
 * identical size. */
const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  { step, isActive },
  ref
) {
  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 top-0 max-h-full overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl"
      aria-hidden={!isActive}
    >
      <div
        data-role="content"
        className="max-h-full w-full overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: step.domStructure.contentHtml || "" }}
      />
    </div>
  );
});

export default StepCard;
