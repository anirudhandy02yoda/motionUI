import { UserAction } from "./types";

/** Short, present-continuous status phrase shown while a step's action is
 * actually happening (cursor arrived, typing/clicking/scrolling in
 * progress) — swapped in for the step's own descriptive caption at
 * actionStart, mirroring how a real screen-recording narration reads:
 * "Step 1: ..." while setting up the shot, then a live status line once
 * the action itself begins. */
export function describeActionPhase(action: UserAction): string {
  switch (action.actionType) {
    case "type":
      return "Typing into the input field...";
    case "scroll":
      return "Scrolling to read more...";
    case "click": {
      const hay = `${action.targetId} ${action.tooltipText}`.toLowerCase();
      if (/(send|submit|arrow|go\b)/.test(hay)) return "Submitting the request...";
      return action.tooltipText ? `${action.tooltipText}...` : "Clicking to continue...";
    }
    case "hover":
      return action.tooltipText ? `Highlighting "${action.tooltipText}"...` : "Reviewing the result...";
    default:
      return "";
  }
}
