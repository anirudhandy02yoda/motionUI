import { UserAction } from "./types";

export type TargetRole = "input" | "send" | "copy" | "bookmark" | "content";

/** Maps the LLM-inferred (free-text) targetSelector/tooltip onto one of the
 * fixed, stable data-role anchors every StepCard renders, so the GSAP player
 * and the Remotion renderer always have a real DOM/layout node to aim the
 * cursor at, regardless of what selector string the model produced. */
export function resolveTargetRole(action: UserAction): TargetRole {
  const hay = `${action.targetSelector} ${action.tooltipText}`.toLowerCase();

  if (action.actionType === "type") return "input";
  if (action.actionType === "scroll") return "content";

  if (/(send|submit|arrow|go\b)/.test(hay)) return "send";
  if (/(save|bookmark|prompt)/.test(hay)) return "bookmark";
  if (/(copy|duplicate|clipboard)/.test(hay)) return "copy";

  // click/hover with no strong signal: default to the answer-card actions.
  return action.actionType === "hover" ? "bookmark" : "send";
}
