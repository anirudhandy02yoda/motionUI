export type ActionType = "click" | "type" | "hover" | "scroll";

/** The trigger half of the trigger/systemEffects split — what the user did.
 * targetId references a stable data-motion-id on the persistent scene, the
 * same node across every step it appears in, not a per-step selector. */
export interface UserAction {
  actionType: ActionType;
  targetId: string;
  typeText: string;
  tooltipText: string;
}

export type MutationOp = "setText" | "setAttr" | "addElement" | "removeElement";

/** The systemEffects half — the minimal diff that turns the previous state
 * into this step's state. Applied directly to the persistent DOM (one scene
 * mounted once, mutated in place), never by swapping in a whole new screen.
 * Flat shape (all fields always present, empty when unused by this op) to
 * match structured LLM output — the same convention UserAction already
 * uses — rather than a discriminated union, which Gemini's schema handles
 * far less reliably. */
export interface Mutation {
  op: MutationOp;
  targetId: string; // setText, setAttr, removeElement
  text: string; // setText: the new text content
  attr: string; // setAttr: the attribute to change (usually "style")
  value: string; // setAttr: the new attribute value
  html: string; // addElement: fragment with its own root data-motion-id
  parentId: string; // addElement: existing motionId to insert into
  position: "start" | "end"; // addElement
}

export interface WalkthroughStep {
  stepId: number;
  stepTitle: string;
  caption: string;
  userAction: UserAction;
  mutations: Mutation[];
}

export interface AnalysisResult {
  projectTitle: string;
  totalSteps: number;
  /** The full recreation of screenshot 1 — the persistent scene every step
   * mutates. Every semantically meaningful element carries a stable
   * data-motion-id; elements that persist across screenshots reuse the same
   * id rather than being regenerated. */
  baseHtml: string;
  steps: WalkthroughStep[];
}

/** A step with a computed, deterministic on-timeline duration (ms), shared by
 * the GSAP live player and the Remotion server-side renderer so both engines
 * land on identical frame boundaries for the same JSON. */
export interface TimedStep extends WalkthroughStep {
  startMs: number;
  durationMs: number;
}

export interface Timeline {
  totalDurationMs: number;
  steps: TimedStep[];
}
