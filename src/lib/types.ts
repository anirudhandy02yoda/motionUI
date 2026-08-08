export type ActionType = "click" | "type" | "hover" | "scroll";

export interface DomStructure {
  headerTitle: string;
  inputText: string;
  contentHtml: string;
  badgeText: string;
}

export interface UserAction {
  actionType: ActionType;
  targetSelector: string;
  typeText: string;
  tooltipText: string;
}

export interface WalkthroughStep {
  stepId: number;
  stepTitle: string;
  caption: string;
  domStructure: DomStructure;
  userAction: UserAction;
}

export interface AnalysisResult {
  projectTitle: string;
  totalSteps: number;
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
