import React from "react";
import { AbsoluteFill, interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { AnalysisResult } from "@/lib/types";
import { buildTimeline, timelineToFrames } from "@/lib/timeline";
import { resolveTargetRole } from "@/lib/actionTarget";
import { CANVAS_WIDTH, CANVAS_HEIGHT, VIDEO_FPS, TARGET_CENTERS, CURSOR_HOME, CARD_HEIGHT } from "./layout";
import StepScene from "./StepScene";
import CursorLayer from "./CursorLayer";

export interface WalkthroughCompositionProps extends Record<string, unknown> {
  analysis: AnalysisResult;
}

const MOVE_DELAY_FRAMES = 12;
const MOVE_FRAMES = 16;
const CROSSFADE_FRAMES = 10;
const CHARS_PER_FRAME = 1.05;
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

export const WalkthroughComposition: React.FC<WalkthroughCompositionProps> = ({ analysis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frames = timelineToFrames(buildTimeline(analysis), fps);
  const steps = frames.steps;

  if (steps.length === 0) return <AbsoluteFill style={{ background: "#05050a" }} />;

  let index = steps.findIndex((s) => frame >= s.startFrame && frame < s.startFrame + s.durationFrames);
  if (index === -1) index = frame < steps[0].startFrame ? 0 : steps.length - 1;

  const step = steps[index];
  const prevStep = index > 0 ? steps[index - 1] : null;

  const sinceStart = frame - step.startFrame;
  const crossT =
    index > 0 ? interpolate(sinceStart, [0, CROSSFADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  const role = resolveTargetRole(step.userAction);
  const targetPos = TARGET_CENTERS[role];
  const prevRole = prevStep ? resolveTargetRole(prevStep.userAction) : null;
  const prevPos = prevRole ? TARGET_CENTERS[prevRole] : CURSOR_HOME;

  const moveStart = step.startFrame + MOVE_DELAY_FRAMES;
  const moveEnd = moveStart + MOVE_FRAMES;
  const easing = Easing.inOut(Easing.ease);

  const cursorX = interpolate(frame, [moveStart, moveEnd], [prevPos.x, targetPos.x], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
  const cursorY = interpolate(frame, [moveStart, moveEnd], [prevPos.y, targetPos.y], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

  const firstAppearFrame = steps[0].startFrame + MOVE_DELAY_FRAMES - 6;
  const cursorOpacity = interpolate(frame, [firstAppearFrame, firstAppearFrame + 6], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const actionStart = moveEnd + 2;
  const { actionType, typeText, tooltipText } = step.userAction;

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

  let typedInputText = step.domStructure.inputText || "";
  if (actionType === "type") {
    const charCount = Math.floor(
      interpolate(frame, [actionStart, actionStart + typeText.length / CHARS_PER_FRAME], [0, typeText.length], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
    typedInputText = typeText.slice(0, charCount);
  }

  return (
    <AbsoluteFill style={{ background: "#05050a", fontFamily: "Inter, ui-sans-serif, system-ui" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: CARD_HEIGHT }}>
        {prevStep && crossT < 1 && (
          <StepScene
            step={{ ...prevStep }}
            opacity={1 - crossT}
            typedInputText={prevStep.domStructure.inputText || ""}
          />
        )}
        <StepScene step={{ ...step }} opacity={index === 0 ? 1 : crossT} typedInputText={typedInputText} />
      </div>
      <CursorLayer
        x={cursorX}
        y={cursorY}
        opacity={cursorOpacity}
        rippleOpacity={rippleOpacity}
        rippleScale={rippleScale}
        tooltipOpacity={tooltipOpacity}
        tooltipText={tooltipText}
      />
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
