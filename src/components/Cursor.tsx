"use client";

import { RefObject } from "react";
import { MousePointer2 } from "lucide-react";

interface CursorProps {
  cursorRef: RefObject<HTMLDivElement | null>;
  rippleRef: RefObject<HTMLDivElement | null>;
  tooltipRef: RefObject<HTMLDivElement | null>;
  tooltipLabelRef: RefObject<HTMLSpanElement | null>;
}

/** Virtual SVG mouse cursor + click ripple + hover tooltip. Purely
 * presentational — all motion is driven externally by GSAP tweening the
 * refs' transform/opacity. */
export default function Cursor({ cursorRef, rippleRef, tooltipRef, tooltipLabelRef }: CursorProps) {
  return (
    <div
      ref={cursorRef}
      className="pointer-events-none absolute left-0 top-0 z-30 will-change-transform"
      style={{ opacity: 0 }}
    >
      <div
        ref={tooltipRef}
        className="absolute -top-9 left-3 whitespace-nowrap rounded-md bg-white px-2 py-1 text-[11px] font-medium text-black shadow-lg"
        style={{ opacity: 0 }}
      >
        <span ref={tooltipLabelRef} />
      </div>
      <div
        ref={rippleRef}
        className="absolute left-0 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-400"
        style={{ opacity: 0 }}
      />
      <MousePointer2
        size={22}
        className="-translate-x-[3px] -translate-y-[2px] fill-white text-indigo-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
      />
    </div>
  );
}
