import React, { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { AnalysisResult } from "@/lib/types";
import { buildTimeline, timelineToFrames, msToFrames } from "@/lib/timeline";
import { computeStepMotion } from "@/lib/motionTiming";
import { describeActionPhase } from "@/lib/actionPhrase";
import { applyMutationInstant, findMotionEl, resyncSceneToStep } from "@/lib/sceneMutations";
import { CANVAS_WIDTH, CANVAS_HEIGHT, VIDEO_FPS, CARD_HEIGHT, CURSOR_HOME } from "./layout";
import Scene from "@/components/Scene";
import CursorLayer from "./CursorLayer";

export interface WalkthroughCompositionProps extends Record<string, unknown> {
  analysis: AnalysisResult;
}

// Secondary visual-effect durations — short, self contained, and always
// well within a step's actionDuration+hold budget, so they're kept as
// local frame constants rather than routed through the shared motion model.
const TOOLTIP_HOLD_FRAMES = 26;
const ADD_FADE_FRAMES = 14;
const REMOVE_FADE_FRAMES = 9;

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

function measure(root: HTMLElement, stageEl: HTMLElement, motionId: string): Point | null {
  const el = findMotionEl(root, motionId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const sr = stageEl.getBoundingClientRect();
  return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
}

/** Remotion has no "persistent DOM across time" the way a live browser
 * session does — every frame can render fresh, and concurrent rendering can
 * even split frame ranges across separate browser workers. So unlike the
 * GSAP live player (which mutates one long-lived DOM as playback proceeds),
 * every frame here rebuilds the scene deterministically from scratch:
 * resync to the end of the previous step, then apply exactly as much of
 * the current step's action/reaction as this frame's position warrants. */
export const WalkthroughComposition: React.FC<WalkthroughCompositionProps> = ({ analysis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frames = timelineToFrames(buildTimeline(analysis), fps);
  const steps = frames.steps;

  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [currentPos, setCurrentPos] = useState<Point | null>(null);
  const [prevPos, setPrevPos] = useState<Point | null>(null);

  let index = 0;
  if (steps.length > 0) {
    const found = steps.findIndex((s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames);
    index = found === -1 ? (frame < steps[0].startFrame ? 0 : steps.length - 1) : found;
  }

  const step = steps[index];
  const motion = step ? computeStepMotion(step) : null;
  const moveStart = step && motion ? step.startFrame + msToFrames(motion.moveStartMs, fps) : 0;
  const moveEnd = step && motion ? moveStart + msToFrames(motion.moveDurationMs, fps) : 0;
  const actionStart = step && motion ? step.startFrame + msToFrames(motion.actionStartMs, fps) : 0;
  const actionDurationFrames = motion ? msToFrames(motion.actionDurationMs, fps) : 0;
  const reactionStart = step && motion ? step.startFrame + msToFrames(motion.reactionStartMs, fps) : 0;

  useLayoutEffect(() => {
    const sceneEl = sceneRef.current;
    const stageEl = stageRef.current;
    if (!sceneEl || !stageEl || !step) return;

    // Settle every step BEFORE this one — exactly the state the live GSAP
    // player would show at the moment this step began.
    resyncSceneToStep(sceneEl, analysis.baseHtml, steps, index - 1);

    const prevStep = index > 0 ? steps[index - 1] : null;
    const prevTargetId = prevStep?.userAction.targetId ?? "";
    setPrevPos(prevTargetId ? measure(sceneEl, stageEl, prevTargetId) : null);

    const { actionType, targetId, typeText } = step.userAction;
    const actionMutations = step.mutations.filter((m) => m.targetId && m.targetId === targetId);
    const reactionMutations = step.mutations.filter((m) => !(m.targetId && m.targetId === targetId));

    if (frame >= actionStart) {
      if (actionType === "type") {
        const typeMutation = actionMutations.find((m) => m.op === "setText");
        actionMutations.filter((m) => m !== typeMutation).forEach((m) => applyMutationInstant(sceneEl, m));
        if (typeMutation) {
          const full = typeMutation.text || typeText;
          const charCount = Math.floor(
            interpolate(frame, [actionStart, actionStart + actionDurationFrames], [0, full.length], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          );
          const el = findMotionEl(sceneEl, targetId);
          if (el) el.textContent = full.slice(0, charCount);
        }
      } else if (actionType === "click" || actionType === "hover") {
        actionMutations.forEach((m) => applyMutationInstant(sceneEl, m));
      } else if (actionType === "scroll") {
        const maxScroll = Math.max(0, sceneEl.scrollHeight - sceneEl.clientHeight);
        const p = interpolate(frame, [actionStart, actionStart + actionDurationFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.inOut(Easing.ease),
        });
        sceneEl.scrollTop = maxScroll * p;
      }
    }

    setCurrentPos(targetId ? measure(sceneEl, stageEl, targetId) : null);

    if (frame >= reactionStart) {
      reactionMutations.forEach((m) => {
        if (m.op === "addElement") {
          const el = applyMutationInstant(sceneEl, m);
          if (el) {
            const t = interpolate(frame, [reactionStart, reactionStart + ADD_FADE_FRAMES], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            el.style.opacity = String(t);
            el.style.transform = `translateY(${12 * (1 - t)}px)`;
            sceneEl.scrollTop = Math.max(0, el.offsetTop - 24) * t;
          }
        } else if (m.op === "removeElement") {
          const el = findMotionEl(sceneEl, m.targetId);
          if (el) {
            const framesIntoRemoval = frame - reactionStart;
            if (framesIntoRemoval < REMOVE_FADE_FRAMES) {
              const t = interpolate(framesIntoRemoval, [0, REMOVE_FADE_FRAMES], [1, 0], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              el.style.opacity = String(t);
            } else {
              applyMutationInstant(sceneEl, m);
            }
          }
        } else {
          applyMutationInstant(sceneEl, m);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame]);

  if (!step) return <AbsoluteFill style={{ background: "#05050a" }} />;

  const easing = Easing.inOut(Easing.ease);
  const fromPos = prevPos ?? CURSOR_HOME;
  const toPos = currentPos ?? fromPos;

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

  const firstStepMotion = computeStepMotion(steps[0]);
  const firstAppearFrame = steps[0].startFrame + msToFrames(firstStepMotion.moveStartMs, fps) - 6;
  const cursorOpacity = currentPos
    ? interpolate(frame, [firstAppearFrame, firstAppearFrame + 6], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  const { actionType, tooltipText } = step.userAction;

  // Caption reads "Step N: <what this step shows>" while the screen settles
  // in, then swaps to a live status line once the action itself starts —
  // mirrors the same time-based derivation the live GSAP player uses.
  const captionText =
    frame >= actionStart
      ? describeActionPhase(step.userAction) || `Step ${step.stepId}: ${step.caption}`
      : `Step ${step.stepId}: ${step.caption}`;

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
        <Scene ref={sceneRef} html={analysis.baseHtml} />
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
        {captionText}
      </div>
    </AbsoluteFill>
  );
};
