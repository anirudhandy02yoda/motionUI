"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import StepCard from "./StepCard";
import Cursor from "./Cursor";
import ControlBar from "./ControlBar";
import StepPills from "./StepPills";
import { AnalysisResult } from "@/lib/types";
import { buildTimeline } from "@/lib/timeline";
import { resolveTargetRole } from "@/lib/actionTarget";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin);
}

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `0:${String(s).padStart(2, "0")}`;
}

interface WalkthroughStageProps {
  analysis: AnalysisResult;
  onExport: () => void;
  isExporting: boolean;
}

export default function WalkthroughStage({ analysis, onExport, isExporting }: WalkthroughStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipLabelRef = useRef<HTMLSpanElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);

  useLayoutEffect(() => {
    if (!stageRef.current) return;

    const ctx = gsap.context(() => {
      const timeline = buildTimeline(analysis);
      const tl = gsap.timeline({
        paused: true,
        onUpdate: () => {
          const totalSec = tl.totalDuration();
          const t = tl.time();
          setProgress(totalSec ? t / totalSec : 0);
          setElapsedMs(t * 1000);
          const idx = timeline.steps.findIndex(
            (s) => t * 1000 >= s.startMs && t * 1000 < s.startMs + s.durationMs
          );
          if (idx !== -1) setCurrentStepIndex(idx);
        },
        onComplete: () => setIsPlaying(false),
      });

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.set(el, { opacity: i === 0 ? 1 : 0, y: 0 });
      });
      gsap.set(cursorRef.current, { opacity: 0, x: 40, y: 40 });
      gsap.set(rippleRef.current, { opacity: 0 });
      gsap.set(tooltipRef.current, { opacity: 0 });

      const stageEl = stageRef.current!;

      timeline.steps.forEach((step, i) => {
        const t0 = step.startMs / 1000;
        const cardEl = cardRefs.current[i];
        const prevCardEl = i > 0 ? cardRefs.current[i - 1] : null;
        if (!cardEl) return;

        if (i > 0 && prevCardEl) {
          tl.to(prevCardEl, { opacity: 0, y: -10, duration: 0.35, ease: "power2.inOut" }, t0);
          tl.fromTo(
            cardEl,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" },
            t0
          );
        }

        // Label lands after the crossfade settles so step-pill scrubbing jumps
        // straight to a fully-visible destination card, not a mid-transition frame.
        tl.addLabel(`step-${step.stepId}`, i === 0 ? t0 : t0 + 0.46);

        const role = resolveTargetRole(step.userAction);
        const targetEl = cardEl.querySelector<HTMLElement>(`[data-role="${role}"]`);

        // Seed the input box with its resting text; overwritten by the typewriter
        // tween below when this step's own action is what types it.
        const inputEl = cardEl.querySelector<HTMLElement>('[data-role="input"]');
        if (inputEl) {
          tl.set(inputEl, { text: step.domStructure.inputText || "" }, t0);
        }

        const moveStart = i === 0 ? t0 + 0.35 : t0 + 0.5;
        const moveDuration = 0.6;

        if (targetEl) {
          tl.to(cursorRef.current, { opacity: 1, duration: 0.2 }, moveStart - 0.15);
          tl.to(
            cursorRef.current,
            {
              duration: moveDuration,
              ease: "power2.inOut",
              x: () => {
                const r = targetEl.getBoundingClientRect();
                const sr = stageEl.getBoundingClientRect();
                return r.left - sr.left + r.width / 2 - 10;
              },
              y: () => {
                const r = targetEl.getBoundingClientRect();
                const sr = stageEl.getBoundingClientRect();
                return r.top - sr.top + r.height / 2 - 10;
              },
            },
            moveStart
          );
        }

        const actionStart = moveStart + moveDuration + 0.05;
        const stepEnd = t0 + step.durationMs / 1000;
        const remaining = Math.max(0.3, stepEnd - actionStart - 0.2);
        const { actionType, typeText, tooltipText } = step.userAction;

        if (tooltipText) {
          tl.call(
            () => {
              if (tooltipLabelRef.current) tooltipLabelRef.current.textContent = tooltipText;
            },
            undefined,
            actionStart
          );
          tl.to(tooltipRef.current, { opacity: 1, duration: 0.2 }, actionStart);
          tl.to(tooltipRef.current, { opacity: 0, duration: 0.2 }, actionStart + Math.min(remaining, 1.1));
        }

        if (actionType === "type" && targetEl) {
          tl.set(targetEl, { text: "" }, actionStart);
          const typeDuration = Math.min(remaining, Math.max(0.5, typeText.length * 0.032));
          tl.to(targetEl, { duration: typeDuration, text: typeText, ease: "none" }, actionStart + 0.15);
        } else if ((actionType === "click" || actionType === "hover") && targetEl) {
          tl.to(
            targetEl,
            { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1, transformOrigin: "50% 50%" },
            actionStart
          );
          tl.fromTo(
            rippleRef.current,
            { opacity: 0.6, scale: 0.3 },
            { opacity: 0, scale: 2.4, duration: 0.55, ease: "power1.out" },
            actionStart
          );
        } else if (actionType === "scroll") {
          const contentEl = cardEl.querySelector<HTMLElement>('[data-role="content"]');
          if (contentEl) {
            tl.to(
              contentEl,
              { scrollTop: () => contentEl.scrollHeight, duration: Math.min(remaining, 1.2), ease: "power1.inOut" },
              actionStart
            );
          }
        }
      });

      tl.to({}, { duration: 0.01 }, timeline.totalDurationMs / 1000);

      tlRef.current = tl;
      setTotalDurationMs(timeline.totalDurationMs);
      setCurrentStepIndex(0);
      setProgress(0);
      setElapsedMs(0);
    }, stageRef);

    return () => {
      ctx.revert();
      tlRef.current = null;
    };
  }, [analysis]);

  useLayoutEffect(() => {
    if (!tlRef.current) return;
    if (isPlaying) tlRef.current.play();
    else tlRef.current.pause();
  }, [isPlaying]);

  useLayoutEffect(() => {
    tlRef.current?.timeScale(speed);
  }, [speed]);

  const handleRestart = useCallback(() => {
    tlRef.current?.pause(0);
    setIsPlaying(true);
  }, []);

  const handleScrub = useCallback((p: number) => {
    setIsPlaying(false);
    tlRef.current?.progress(p);
  }, []);

  const handleStepSelect = useCallback((index: number) => {
    setIsPlaying(false);
    const step = analysis.steps[index];
    if (step) tlRef.current?.seek(`step-${step.stepId}`);
  }, [analysis.steps]);

  const activeStep = analysis.steps[currentStepIndex];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white/90">{analysis.projectTitle}</h2>
          <p className="text-xs text-white/40">
            Step {currentStepIndex + 1} of {analysis.steps.length} · {formatTime(elapsedMs)} / {formatTime(totalDurationMs)}
          </p>
        </div>
        <StepPills steps={analysis.steps} activeIndex={currentStepIndex} onSelect={handleStepSelect} />
      </div>

      <div ref={stageRef} className="relative aspect-[16/10] w-full">
        {analysis.steps.map((step, i) => (
          <StepCard
            key={step.stepId}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            step={step}
            isActive={i === currentStepIndex}
          />
        ))}
        <Cursor
          cursorRef={cursorRef}
          rippleRef={rippleRef}
          tooltipRef={tooltipRef}
          tooltipLabelRef={tooltipLabelRef}
        />
      </div>

      {activeStep && (
        <p className="mt-3 min-h-[20px] text-center text-sm text-white/60">{activeStep.caption}</p>
      )}

      <div className="mt-4">
        <ControlBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((p) => !p)}
          onRestart={handleRestart}
          speed={speed}
          onSpeedChange={setSpeed}
          progress={progress}
          onScrub={handleScrub}
          onExport={onExport}
          isExporting={isExporting}
        />
      </div>
    </div>
  );
}
