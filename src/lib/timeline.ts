import { AnalysisResult, Timeline, TimedStep } from "./types";

export const FPS = 30;

const MIN_STEP_MS = 2800;
const MAX_STEP_MS = 6200;
const MS_PER_TYPED_CHAR = 45;
const MS_PER_CAPTION_CHAR = 18;
const ACTION_SETTLE_MS = 900;

/** Pure function: same JSON in -> same frame-accurate timeline out. Used by
 * both the GSAP live player and the Remotion server renderer so the two
 * engines never drift apart for a given analysis result. */
export function buildTimeline(analysis: AnalysisResult): Timeline {
  let cursor = 0;
  const steps: TimedStep[] = analysis.steps.map((step) => {
    const typed = step.userAction?.typeText?.length ?? 0;
    const caption = step.caption?.length ?? 0;
    const raw =
      ACTION_SETTLE_MS + typed * MS_PER_TYPED_CHAR + caption * MS_PER_CAPTION_CHAR;
    const durationMs = Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, raw));
    const timed: TimedStep = { ...step, startMs: cursor, durationMs };
    cursor += durationMs;
    return timed;
  });

  return { totalDurationMs: cursor, steps };
}

export function msToFrames(ms: number, fps: number = FPS): number {
  return Math.round((ms / 1000) * fps);
}

export function timelineToFrames(timeline: Timeline, fps: number = FPS) {
  return {
    totalFrames: msToFrames(timeline.totalDurationMs, fps),
    steps: timeline.steps.map((s) => ({
      ...s,
      startFrame: msToFrames(s.startMs, fps),
      durationFrames: msToFrames(s.durationMs, fps),
    })),
  };
}
