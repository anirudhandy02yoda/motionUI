"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import StepCard from "./StepCard";
import Cursor from "./Cursor";
import ControlBar from "./ControlBar";
import StepPills from "./StepPills";
import { AnalysisResult, Timeline } from "@/lib/types";
import { buildTimeline } from "@/lib/timeline";
import { computeStepMotion, SLIDE_MS } from "@/lib/motionTiming";
import { describeActionPhase } from "@/lib/actionPhrase";

const COMPLETE_MESSAGE = "Walkthrough complete! Click Restart to watch again or select a step.";

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin);
}

const SLIDE_DURATION = SLIDE_MS / 1000;

function formatTime(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `0:${String(s).padStart(2, "0")}`;
}

/** Pure function of "where is the playhead right now" — used instead of
 * scheduling GSAP .call()s at fixed times, since those fire unreliably when
 * scrubbing/seeking backward across them. Reads as "Step N: <caption>"
 * while the screen settles in, swaps to a live status line once the
 * action itself starts, and shows a completion message once the whole
 * timeline has played through — correct for any time you jump to directly. */
function deriveCaptionText(timeline: Timeline, tMs: number): string {
  if (timeline.steps.length === 0) return "";
  if (tMs >= timeline.totalDurationMs) return COMPLETE_MESSAGE;

  const idx = timeline.steps.findIndex((s) => tMs >= s.startMs && tMs < s.startMs + s.durationMs);
  const step = timeline.steps[idx === -1 ? timeline.steps.length - 1 : idx];
  const motion = computeStepMotion(step, step === timeline.steps[0]);
  const actionStartMs = step.startMs + motion.actionStartMs;

  if (tMs >= actionStartMs) {
    const phase = describeActionPhase(step.userAction);
    if (phase) return phase;
  }
  return `Step ${step.stepId}: ${step.caption}`;
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
  const captionRef = useRef<HTMLParagraphElement>(null);
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
          if (captionRef.current) captionRef.current.textContent = deriveCaptionText(timeline, t * 1000);
        },
        onComplete: () => setIsPlaying(false),
      });

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        // Cards slide in/out edge-to-edge instead of crossfading in place —
        // opacity-blending two screens with different layouts/heights on top
        // of each other produced an incoherent "double exposure" look.
        gsap.set(el, { xPercent: i === 0 ? 0 : 100 });
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
          tl.to(prevCardEl, { xPercent: -100, duration: SLIDE_DURATION, ease: "power2.inOut" }, t0);
          tl.to(cardEl, { xPercent: 0, duration: SLIDE_DURATION, ease: "power2.inOut" }, t0);
        }

        // Label lands after the slide settles so step-pill scrubbing jumps
        // straight to a fully-visible destination card, not a mid-transition frame.
        tl.addLabel(`step-${step.stepId}`, i === 0 ? t0 : t0 + SLIDE_DURATION + 0.01);

        // Located via the model-provided instrumentation attribute (see the
        // Gemini prompt) — the real element within the model's own exact
        // recreation, not an element we invented. Absent entirely if the
        // model omitted it; the step just plays without a cursor that beat.
        const targetEl = cardEl.querySelector<HTMLElement>("[data-action-target]");
        // Captured before any tween runs, so it reflects exactly what the
        // model baked into contentHtml for this step (the "final" typed text).
        const bakedTargetText = targetEl?.textContent ?? "";

        // Every phase's timing comes from the same motion model buildTimeline()
        // used to size this step's total duration in the first place, so the
        // action always has genuine settle time before the next step cuts in
        // instead of racing to finish right as the step ends.
        const motion = computeStepMotion(step, i === 0);
        const moveStart = t0 + motion.moveStartMs / 1000;
        const moveDuration = motion.moveDurationMs / 1000;
        const actionStart = t0 + motion.actionStartMs / 1000;
        const actionDuration = motion.actionDurationMs / 1000;

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
          tl.to(tooltipRef.current, { opacity: 0, duration: 0.2 }, actionStart + Math.min(actionDuration + 0.6, 1.6));
        }

        if (actionType === "type" && targetEl) {
          const finalText = bakedTargetText || typeText;
          tl.set(targetEl, { text: "" }, actionStart);
          tl.to(targetEl, { duration: actionDuration, text: finalText, ease: "none" }, actionStart);
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
              { scrollTop: () => contentEl.scrollHeight, duration: actionDuration, ease: "power1.inOut" },
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
    tlRef.current?.pause(0, false);
    setIsPlaying(true);
  }, []);

  const handleScrub = useCallback((p: number) => {
    setIsPlaying(false);
    // suppressEvents defaults to true in GSAP, which would skip onUpdate and
    // leave the step label/progress UI stuck at its last played position.
    tlRef.current?.progress(p, false);
  }, []);

  const handleStepSelect = useCallback((index: number) => {
    setIsPlaying(false);
    const step = analysis.steps[index];
    if (step) tlRef.current?.seek(`step-${step.stepId}`, false);
  }, [analysis.steps]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white/90">
            {analysis.projectTitle}
            <span className="text-white/40">— Interactive Feature Walkthrough</span>
            <span className="inline-flex items-center rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Live Demo
            </span>
          </h2>
          <p className="text-xs text-white/40">
            Step {currentStepIndex + 1} of {analysis.steps.length} · {formatTime(elapsedMs)} / {formatTime(totalDurationMs)}
          </p>
        </div>
        <StepPills steps={analysis.steps} activeIndex={currentStepIndex} onSelect={handleStepSelect} />
      </div>

      <p ref={captionRef} className="mb-3 min-h-[20px] text-center text-sm text-white/60">
        {analysis.steps[0] && `Step ${analysis.steps[0].stepId}: ${analysis.steps[0].caption}`}
      </p>

      <div ref={stageRef} className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
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
