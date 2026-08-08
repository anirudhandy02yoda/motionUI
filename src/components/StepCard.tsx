"use client";

import { forwardRef } from "react";
import { Copy, Bookmark, ArrowUp, Zap } from "lucide-react";
import { WalkthroughStep } from "@/lib/types";

interface StepCardProps {
  step: WalkthroughStep;
  isActive: boolean;
}

/** A single reconstructed screen. Every interactive element carries a stable
 * data-role so the GSAP player (client) and Remotion renderer (server) can
 * both locate it deterministically, independent of the LLM's free-text
 * targetSelector string. */
const StepCard = forwardRef<HTMLDivElement, StepCardProps>(function StepCard(
  { step, isActive },
  ref
) {
  const { domStructure } = step;

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b12] shadow-2xl"
      style={{ opacity: 0 }}
      aria-hidden={!isActive}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        {domStructure.badgeText ? (
          <span
            data-role="badge"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-medium text-amber-300"
          >
            <Zap size={11} className="fill-amber-300" />
            {domStructure.badgeText}
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-role="copy"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Copy size={14} />
          </button>
          <button
            type="button"
            data-role="bookmark"
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Bookmark size={14} />
          </button>
        </div>
      </div>

      <div data-role="content" className="flex-1 overflow-y-auto px-6 py-5">
        <h3 className="mb-3 text-lg font-semibold text-white">{domStructure.headerTitle}</h3>
        <div
          className="prose-sm max-w-none text-white/70 [&_li]:my-0.5 [&_ul]:pl-4"
          dangerouslySetInnerHTML={{ __html: domStructure.contentHtml || "" }}
        />
      </div>

      <div className="border-t border-white/5 p-4">
        <div className="flex items-end gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <span
            data-role="input"
            className="min-h-[20px] flex-1 whitespace-pre-wrap text-sm text-white/90"
          />
          <button
            type="button"
            data-role="send"
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default StepCard;
