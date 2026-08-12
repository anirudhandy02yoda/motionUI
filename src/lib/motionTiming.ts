import { WalkthroughStep } from "./types";

/** Single source of truth for how long each phase of a step's animation
 * takes, in milliseconds, relative to the step's own start. Both the GSAP
 * live player and the Remotion renderer read from this (converting to
 * seconds/frames respectively) instead of each hand-rolling their own
 * offsets. There is no "wait for the screen transition to settle" phase
 * anymore — the scene is one persistent, continuously-mutated DOM tree, so
 * the cursor can start moving almost immediately at every step. */

const MOVE_START_MS = 300; // small pause at step start before the cursor begins moving
const MOVE_DURATION_MS = 750;
const ACTION_GAP_MS = 200; // pause after the cursor arrives, before the action itself starts

const MS_PER_TYPED_CHAR = 110; // deliberately slow enough to visibly read as "typing"
const MIN_TYPE_MS = 1400;
const MAX_TYPE_MS = 7000;
const CLICK_OR_HOVER_MS = 1200;
const SCROLL_MS = 1800;

// A user action's mutations split into two groups (see WalkthroughStage):
// "action mutations" (the same element the action targets — typed text,
// its own style) animate concurrently with the action; "reaction mutations"
// (everything else — a new message appearing, the composer clearing) are
// the system's response and play a beat after, not simultaneously with it.
const REACTION_DELAY_AFTER_CLICK_MS = 350;
const REACTION_DELAY_AFTER_TYPE_MS = 150;

const HOLD_MS = 2000; // dwell time after the action finishes, before the step ends

export interface StepMotion {
  moveStartMs: number;
  moveDurationMs: number;
  actionStartMs: number;
  actionDurationMs: number;
  reactionStartMs: number;
  totalMs: number;
}

export function computeStepMotion(step: WalkthroughStep): StepMotion {
  const moveStartMs = MOVE_START_MS;
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

  const reactionStartMs =
    step.userAction.actionType === "type"
      ? actionStartMs + actionDurationMs + REACTION_DELAY_AFTER_TYPE_MS
      : actionStartMs + REACTION_DELAY_AFTER_CLICK_MS;

  const totalMs = actionStartMs + actionDurationMs + HOLD_MS;

  return { moveStartMs, moveDurationMs, actionStartMs, actionDurationMs, reactionStartMs, totalMs };
}
