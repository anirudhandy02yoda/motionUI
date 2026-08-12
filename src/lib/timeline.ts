import { AnalysisResult, Timeline, TimedStep } from "./types";
import { computeStepMotion } from "./motionTiming";

export const FPS = 30;

/** Pure function: same JSON in -> same frame-accurate timeline out. Used by
 * both the GSAP live player and the Remotion server renderer so the two
 * engines never drift apart for a given analysis result. Each step's
 * duration is the exact sum of its own motion phases (see motionTiming.ts),
 * not an independent estimate — so there's always genuine settle time after
 * an action finishes and before the next step cuts in. */
export function buildTimeline(analysis: AnalysisResult): Timeline {
  let cursor = 0;
  const steps: TimedStep[] = analysis.steps.map((step) => {
    const { totalMs } = computeStepMotion(step);
    const timed: TimedStep = { ...step, startMs: cursor, durationMs: totalMs };
    cursor += totalMs;
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
