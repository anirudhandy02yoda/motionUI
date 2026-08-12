"use client";

import { forwardRef, memo } from "react";

interface SceneProps {
  html: string;
}

/** The ONE persistent UI scene, mounted once and never swapped or
 * replaced — every step animates it in place via mutations (see
 * lib/sceneMutations.ts), not by unmounting and remounting a new tree.
 * `html` never changes after first render, but the parent (WalkthroughStage)
 * re-renders constantly as GSAP's onUpdate drives progress/step-index state —
 * and React recommits dangerouslySetInnerHTML on every one of those renders
 * regardless of whether the string changed, which would wipe out every
 * GSAP-driven imperative mutation. `memo` skips re-rendering this component
 * (and thus the recommit) as long as `html` is referentially/value equal. */
const Scene = memo(
  forwardRef<HTMLDivElement, SceneProps>(function Scene({ html }, ref) {
    return (
      <div
        ref={ref}
        className="relative max-h-full w-full overflow-y-auto rounded-2xl border border-white/10 bg-white shadow-2xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  })
);

export default Scene;
