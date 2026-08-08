import { WalkthroughStep } from "./types";

/** Single source of truth for how long each phase of a step's animation
 * takes, in milliseconds, relative to the step's own start. Both the GSAP
 * live player and the Remotion renderer read from this (converting to
 * seconds/frames respectively) instead of each hand-rolling their own
 * offsets — that drift is exactly what caused typing to race to the very
 * end of a step with ~0ms left to actually show the finished, settled
 * screen before the next one cut in. buildTimeline() also sums these same
 * phases for a step's total duration, so the "planned" duration and the
 * "actual" animation always agree by construction. */

export const SLIDE_MS = 500;
const MOVE_GAP_MS = 100; // pause after the slide settles, before the cursor starts moving
const FIRST_STEP_MOVE_DELAY_MS = 350; // no incoming slide on step 1, so it can start sooner
const MOVE_DURATION_MS = 600;
const ACTION_GAP_MS = 120; // pause after the cursor arrives, before the action itself starts

const MS_PER_TYPED_CHAR = 55; // deliberately slow enough to visibly read as "typing"
const MIN_TYPE_MS = 900;
const MAX_TYPE_MS = 4200;
const CLICK_OR_HOVER_MS = 500;
const SCROLL_MS = 1100;

const HOLD_MS = 1000; // dwell time after the action finishes, before the step ends

export interface StepMotion {
  moveStartMs: number;
  moveDurationMs: number;
  actionStartMs: number;
  actionDurationMs: number;
  totalMs: number;
}

export function computeStepMotion(step: WalkthroughStep, isFirst: boolean): StepMotion {
  const moveStartMs = isFirst ? FIRST_STEP_MOVE_DELAY_MS : SLIDE_MS + MOVE_GAP_MS;
  const moveDurationMs = MOVE_DURATION_MS;
  const actionStartMs = moveStartMs + moveDurationMs + ACTION_GAP_MS;

  let actionDurationMs: number;
  if (step.userAction.actionType === "type") {
    const chars = step.userAction.typeText?.length ?? 0;
    actionDurationMs = Math.min(MAX_TYPE_MS, Math.max(MIN_TYPE_MS, chars * MS_PER_TYPED_CHAR));
  } else if (step.userAction.actionType === "scroll") {
    actionDurationMs = SCROLL_MS;
  } else {
    actionDurationMs = CLICK_OR_HOVER_MS;
  }

  const totalMs = actionStartMs + actionDurationMs + HOLD_MS;

  return { moveStartMs, moveDurationMs, actionStartMs, actionDurationMs, totalMs };
}
