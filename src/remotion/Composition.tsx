import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { AnalysisResult } from "@/lib/types";
import { buildTimeline, timelineToFrames, msToFrames } from "@/lib/timeline";
import { computeStepMotion, SLIDE_MS } from "@/lib/motionTiming";
import { CANVAS_WIDTH, CANVAS_HEIGHT, VIDEO_FPS, CARD_HEIGHT, CURSOR_HOME } from "./layout";
import StepScene from "./StepScene";
import CursorLayer from "./CursorLayer";

export interface WalkthroughCompositionProps extends Record<string, unknown> {
  analysis: AnalysisResult;
}

// Secondary visual-effect durations (ripple, tooltip hold) — short, self
// contained, and always well within a step's actionDuration+hold budget, so
// they're kept as local frame constants rather than routed through the
// shared motion model.
const TOOLTIP_HOLD_FRAMES = 26;

export const calculateWalkthroughMetadata: CalculateMetadataFunction<
  WalkthroughCompositionProps
> = ({ props }) => {
  const frames = timelineToFrames(buildTimeline(props.analysis), VIDEO_FPS);
  return {
    durationInFrames: Math.max(1, frames.totalFrames),
    fps: VIDEO_FPS,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  };
};

type Point = { x: number; y: number };

function measureActionTarget(root: HTMLElement | null, stageEl: HTMLElement): Point | null {
  const target = root?.querySelector<HTMLElement>("[data-action-target]");
  if (!target) return null;
  const r = target.getBoundingClientRect();
  const sr = stageEl.getBoundingClientRect();
  return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
}

export const WalkthroughComposition: React.FC<WalkthroughCompositionProps> = ({ analysis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frames = timelineToFrames(buildTimeline(analysis), fps);
  const steps = frames.steps;

  const stageRef = useRef<HTMLDivElement>(null);
  const currentSceneRef = useRef<HTMLDivElement>(null);
  const prevSceneRef = useRef<HTMLDivElement>(null);
  const [currentTargetPos, setCurrentTargetPos] = useState<Point | null>(null);
  const [prevTargetPos, setPrevTargetPos] = useState<Point | null>(null);
  const measuredCurrentIndex = useRef<number>(-1);
  const measuredPrevIndex = useRef<number>(-2);

  let index = 0;
  if (steps.length > 0) {
    const found = steps.findIndex((s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames);
    index = found === -1 ? (frame < steps[0].startFrame ? 0 : steps.length - 1) : found;
  }

  const step = steps[index];
  const prevStep = index > 0 ? steps[index - 1] : null;

  // Every phase's timing comes from the same motion model buildTimeline()
  // used to size this step's total duration in the first place, so the
  // action always has genuine settle time before the next step cuts in
  // instead of racing to finish right as the step ends.
  const motion = step ? computeStepMotion(step, index === 0) : null;
  const slideFrames = msToFrames(SLIDE_MS, fps);
  const moveStart = step && motion ? step.startFrame + msToFrames(motion.moveStartMs, fps) : 0;
  const moveEnd = step && motion ? moveStart + msToFrames(motion.moveDurationMs, fps) : 0;
  const actionStart = step && motion ? step.startFrame + msToFrames(motion.actionStartMs, fps) : 0;
  const actionDurationFrames = motion ? msToFrames(motion.actionDurationMs, fps) : 0;

  // Real-DOM measurement of the model-provided data-action-target element —
  // screens are the model's arbitrary exact recreation, so target positions
  // can't be hard-coded; they're read from the actual rendered layout, the
  // same instrumentation attribute the live GSAP player relies on. Position
  // is locked once the cursor finishes arriving (matching the live player,
  // where the move tween's target is only evaluated once) so it doesn't
  // drift if the target element's box changes size while typing.
  useLayoutEffect(() => {
    if (!step || !stageRef.current) return;
    const stageEl = stageRef.current;

    if (measuredCurrentIndex.current !== index || frame <= moveEnd) {
      const pos = measureActionTarget(currentSceneRef.current, stageEl);
      if (pos) {
        setCurrentTargetPos(pos);
        measuredCurrentIndex.current = index;
      }
    }

    if (prevStep) {
      if (measuredPrevIndex.current !== index) {
        setPrevTargetPos(measureActionTarget(prevSceneRef.current, stageEl));
        measuredPrevIndex.current = index;
      }
    } else if (measuredPrevIndex.current !== index) {
      setPrevTargetPos(null);
      measuredPrevIndex.current = index;
    }

    if (step.userAction.actionType === "type") {
      const target = currentSceneRef.current?.querySelector<HTMLElement>("[data-action-target]");
      if (target) {
        const full = step.userAction.typeText || "";
        const charCount = Math.floor(
          interpolate(frame, [actionStart, actionStart + actionDurationFrames], [0, full.length], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        );
        target.textContent = full.slice(0, charCount);
      }
    } else if (step.userAction.actionType === "scroll") {
      // Scrolls the same wrapper the live GSAP player scrolls (data-role
      // "content"), not data-action-target — the model marks the cursor's
      // resting spot there, but the actual scroll container is our own
      // wrapper around its recreated HTML.
      const scrollEl = currentSceneRef.current;
      if (scrollEl) {
        const maxScroll = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        const scrollProgress = interpolate(frame, [actionStart, actionStart + actionDurationFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.ease),
        });
        scrollEl.scrollTop = maxScroll * scrollProgress;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, index]);

  if (!step) return <AbsoluteFill style={{ background: "#05050a" }} />;

  const sinceStart = frame - step.startFrame;
  // Screens slide in/out edge-to-edge (translateX) instead of crossfading in
  // place — two differently laid-out screens blended at partial opacity on
  // top of each other read as a broken "double exposure", not a transition.
  const slideT =
    index > 0
      ? interpolate(sinceStart, [0, slideFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.ease),
        })
      : 1;
  const prevXPercent = -100 * slideT;
  const currentXPercent = index === 0 ? 0 : 100 * (1 - slideT);

  const easing = Easing.inOut(Easing.ease);
  const fromPos = prevTargetPos ?? CURSOR_HOME;
  const toPos = currentTargetPos ?? fromPos;

  const cursorX = interpolate(frame, [moveStart, moveEnd], [fromPos.x, toPos.x], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const cursorY = interpolate(frame, [moveStart, moveEnd], [fromPos.y, toPos.y], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const firstAppearFrame = moveStart - 6;
  const cursorOpacity = currentTargetPos
    ? interpolate(frame, [firstAppearFrame, firstAppearFrame + 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const { actionType, tooltipText } = step.userAction;

  let rippleOpacity = 0;
  let rippleScale = 0.3;
  if (actionType === "click" || actionType === "hover") {
    rippleOpacity = interpolate(frame, [actionStart, actionStart + 4, actionStart + 18], [0.6, 0.5, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    rippleScale = interpolate(frame, [actionStart, actionStart + 18], [0.3, 2.4], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.ease),
    });
  }

  const tooltipOpacity = tooltipText
    ? interpolate(
        frame,
        [actionStart, actionStart + 4, actionStart + TOOLTIP_HOLD_FRAMES, actionStart + TOOLTIP_HOLD_FRAMES + 6],
        [0, 1, 1, 0],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
      )
    : 0;

  return (
    <AbsoluteFill style={{ background: "#05050a", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <div
        ref={stageRef}
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: CARD_HEIGHT, overflow: "hidden" }}
      >
        {prevStep && slideT < 1 && <StepScene ref={prevSceneRef} step={prevStep} xPercent={prevXPercent} />}
        <StepScene ref={currentSceneRef} step={step} xPercent={currentXPercent} />
        <CursorLayer
          x={cursorX}
          y={cursorY}
          opacity={cursorOpacity}
          rippleOpacity={rippleOpacity}
          rippleScale={rippleScale}
          tooltipOpacity={tooltipOpacity}
          tooltipText={tooltipText}
        />
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(255,255,255,0.55)",
          fontSize: 15,
          padding: "0 80px",
        }}
      >
        {step.caption}
      </div>
    </AbsoluteFill>
  );
};
