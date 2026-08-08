"use client";

import clsx from "clsx";
import { WalkthroughStep } from "@/lib/types";

interface StepPillsProps {
  steps: WalkthroughStep[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export default function StepPills({ steps, activeIndex, onSelect }: StepPillsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {steps.map((step, i) => (
        <button
          key={step.stepId}
          type="button"
          onClick={() => onSelect(i)}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            i === activeIndex
              ? "border-indigo-400 bg-indigo-500/20 text-indigo-200"
              : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80"
          )}
        >
          {step.stepId}. {step.stepTitle}
        </button>
      ))}
    </div>
  );
}
