"use client";

import { useLayoutEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { TextPlugin } from "gsap/TextPlugin";
import Scene from "./Scene";
import Cursor from "./Cursor";
import ControlBar from "./ControlBar";
import StepPills from "./StepPills";
import { AnalysisResult, Timeline } from "@/lib/types";
import { buildTimeline } from "@/lib/timeline";
import { computeStepMotion } from "@/lib/motionTiming";
import { describeActionPhase } from "@/lib/actionPhrase";
import { applyMutationInstant, findMotionEl, resyncSceneToStep } from "@/lib/sceneMutations";

const COMPLETE_MESSAGE = "Walkthrough complete! Click Restart to watch again or select a step.";
const STAGE_MAX_HEIGHT = 560;

if (typeof window !== "undefined") {
  gsap.registerPlugin(TextPlugin);
}

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
  const motion = computeStepMotion(step);
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
  const sceneRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipLabelRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const lastSyncedIndexRef = useRef<number>(-1);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);

  // Discontinuous jumps (step pills, scrub, restart) can't rely on GSAP's
  // forward-playback callbacks — those fire unreliably in reverse. Instead,
  // explicitly reset the persistent scene to baseHtml and replay every
  // mutation up to the target step, deterministically, before seeking the
  // timeline itself (so cursor position, read live off the DOM, is correct
  // the instant we land).
  const syncToIndex = useCallback(
    (targetIndex: number) => {
      const sceneEl = sceneRef.current;
      if (!sceneEl) return;
      resyncSceneToStep(sceneEl, analysis.baseHtml, analysis.steps, targetIndex);
      lastSyncedIndexRef.current = targetIndex;
    },
    [analysis.baseHtml, analysis.steps]
  );

  useLayoutEffect(() => {
    if (!stageRef.current || !sceneRef.current) return;

    const ctx = gsap.context(() => {
      const timeline = buildTimeline(analysis);
      const sceneEl = sceneRef.current!;
      const stageEl = stageRef.current!;

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

      gsap.set(cursorRef.current, { opacity: 0, x: 40, y: 40 });
      gsap.set(rippleRef.current, { opacity: 0 });
      gsap.set(tooltipRef.current, { opacity: 0 });
      sceneEl.innerHTML = analysis.baseHtml;
      lastSyncedIndexRef.current = -1;

      timeline.steps.forEach((step) => {
        const t0 = step.startMs / 1000;
        tl.addLabel(`step-${step.stepId}`, t0);

        const motion = computeStepMotion(step);
        const moveStart = t0 + motion.moveStartMs / 1000;
        const moveDuration = motion.moveDurationMs / 1000;
        const actionStart = t0 + motion.actionStartMs / 1000;
        const actionDuration = motion.actionDurationMs / 1000;
        const reactionStart = t0 + motion.reactionStartMs / 1000;

        const { actionType, targetId, typeText, tooltipText } = step.userAction;
        // Resolved lazily (not at build time): a step's target may be an
        // element a PRIOR step's addElement mutation only just introduced,
        // so it doesn't exist in the DOM yet when this timeline is built.
        const resolveTarget = () => (targetId ? findMotionEl(sceneEl, targetId) : null);

        if (targetId) {
          tl.to(cursorRef.current, { opacity: 1, duration: 0.2 }, moveStart - 0.15);
          tl.to(
            cursorRef.current,
            {
              duration: moveDuration,
              ease: "power2.inOut",
              x: () => {
                const el = resolveTarget();
                if (!el) return gsap.getProperty(cursorRef.current, "x") as number;
                const r = el.getBoundingClientRect();
                const sr = stageEl.getBoundingClientRect();
                return r.left - sr.left + r.width / 2 - 10;
              },
              y: () => {
                const el = resolveTarget();
                if (!el) return gsap.getProperty(cursorRef.current, "y") as number;
                const r = el.getBoundingClientRect();
                const sr = stageEl.getBoundingClientRect();
                return r.top - sr.top + r.height / 2 - 10;
              },
            },
            moveStart
          );
        }

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

        // A step's mutations split into two causal groups: the ones on the
        // SAME element the action targets (typed text, its own style) play
        // concurrently with the action; everything else is the system's
        // response to it and plays a beat later — trigger, then effect,
        // never simultaneously (spec: never fold click -> arbitrary change
        // into one generic transition).
        const actionMutations = step.mutations.filter((m) => m.targetId && m.targetId === targetId);
        const reactionMutations = step.mutations.filter((m) => !(m.targetId && m.targetId === targetId));

        if (actionType === "type" && targetId) {
          const typeMutation = actionMutations.find((m) => m.op === "setText");
          const otherActionMutations = actionMutations.filter((m) => m !== typeMutation);

          tl.call(
            () => {
              const el = resolveTarget();
              if (el) el.textContent = "";
              otherActionMutations.forEach((m) => applyMutationInstant(sceneEl, m));
            },
            undefined,
            actionStart
          );

          if (typeMutation) {
            const finalText = typeMutation.text || typeText;
            const state = { p: 0 };
            tl.to(
              state,
              {
                p: 1,
                duration: actionDuration,
                ease: "none",
                onUpdate: () => {
                  const el = resolveTarget();
                  if (el) el.textContent = finalText.slice(0, Math.round(finalText.length * state.p));
                },
              },
              actionStart
            );
          }
        } else if ((actionType === "click" || actionType === "hover") && targetId) {
          tl.call(
            () => {
              const el = resolveTarget();
              if (el) gsap.to(el, { scale: 0.94, duration: 0.1, yoyo: true, repeat: 1, transformOrigin: "50% 50%" });
              actionMutations.forEach((m) => applyMutationInstant(sceneEl, m));
            },
            undefined,
            actionStart
          );
          tl.fromTo(
            rippleRef.current,
            { opacity: 0.6, scale: 0.3 },
            { opacity: 0, scale: 2.4, duration: 0.55, ease: "power1.out" },
            actionStart
          );
        } else if (actionType === "scroll") {
          tl.to(
            sceneEl,
            { scrollTop: () => sceneEl.scrollHeight, duration: actionDuration, ease: "power1.inOut" },
            actionStart
          );
        }

        // The system's reaction: new content appears, removed content exits,
        // unrelated elements update — animated in place in the SAME
        // persistent scene, nothing swapped or replaced.
        if (reactionMutations.length > 0) {
          tl.call(
            () => {
              reactionMutations.forEach((m) => {
                if (m.op === "addElement") {
                  const el = applyMutationInstant(sceneEl, m);
                  if (el) {
                    gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, ease: "power2.out" });
                    gsap.to(sceneEl, {
                      scrollTop: () => Math.max(0, el.offsetTop - 24),
                      duration: 0.6,
                      ease: "power2.inOut",
                      delay: 0.05,
                    });
                  }
                } else if (m.op === "removeElement") {
                  const el = findMotionEl(sceneEl, m.targetId);
                  if (el) {
                    gsap.to(el, {
                      opacity: 0,
                      duration: 0.3,
                      ease: "power1.in",
                      onComplete: () => el.remove(),
                    });
                  }
                } else {
                  applyMutationInstant(sceneEl, m);
                }
              });
            },
            undefined,
            reactionStart
          );
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
    syncToIndex(0);
    tlRef.current?.pause(0, false);
    // GSAP's seek/pause-to-time fast-forwards through every tween between
    // the old and new position, including earlier steps' typing/mutation
    // callbacks — which re-render THEIR completed state and can stomp on
    // a later step's already-applied DOM changes. Re-sync after, so the
    // final DOM always wins over whatever the fast-forward replayed.
    syncToIndex(0);
    setIsPlaying(true);
  }, [syncToIndex]);

  const handleScrub = useCallback(
    (p: number) => {
      setIsPlaying(false);
      const tl = tlRef.current;
      if (!tl) return;
      const tMs = p * tl.totalDuration() * 1000;
      const timeline = buildTimeline(analysis);
      const idx = timeline.steps.findIndex((s) => tMs >= s.startMs && tMs < s.startMs + s.durationMs);
      const targetIndex = idx === -1 ? analysis.steps.length - 1 : idx;
      syncToIndex(targetIndex);
      // suppressEvents defaults to true in GSAP, which would skip onUpdate and
      // leave the step label/progress UI stuck at its last played position.
      tl.progress(p, false);
      syncToIndex(targetIndex);
    },
    [analysis, syncToIndex]
  );

  const handleStepSelect = useCallback(
    (index: number) => {
      setIsPlaying(false);
      const step = analysis.steps[index];
      if (!step) return;
      syncToIndex(index);
      // The "step-N" label sits at the step's very start, before its own
      // cursor-move/action tweens even begin — seeking there would leave the
      // cursor resting wherever the PREVIOUS step's action left it, while the
      // DOM (via syncToIndex, which settles through this step's mutations)
      // already reflects this step as done. Seek deep enough into the step's
      // own timeline for its move+action+settle tweens to have fully played,
      // so cursor position agrees with DOM state.
      const timeline = buildTimeline(analysis);
      const timedStep = timeline.steps[index];
      const motion = computeStepMotion(step);
      const settledMs = timedStep.startMs + motion.totalMs - 1;
      tlRef.current?.seek(settledMs / 1000, false);
      syncToIndex(index);
    },
    [analysis, syncToIndex]
  );

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

      <div ref={stageRef} className="relative w-full" style={{ maxHeight: STAGE_MAX_HEIGHT }}>
        <Scene ref={sceneRef} html={analysis.baseHtml} />
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
