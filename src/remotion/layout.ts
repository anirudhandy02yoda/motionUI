/** Fixed pixel layout shared by every frame of the Remotion render. Positions
 * are hard-coded (never measured from the DOM) so the composition stays
 * deterministic across frames/machines, matching the roles rendered by
 * StepCard.tsx in the live GSAP player: input, send, copy, bookmark, content. */
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const VIDEO_FPS = 30;

export const CAPTION_HEIGHT = 64;
export const CARD_HEIGHT = CANVAS_HEIGHT - CAPTION_HEIGHT;

export const HEADER_HEIGHT = 64;
export const INPUT_BAR_HEIGHT = 84;
export const CONTENT_TOP = HEADER_HEIGHT;
export const CONTENT_HEIGHT = CARD_HEIGHT - HEADER_HEIGHT - INPUT_BAR_HEIGHT;

export const TARGET_CENTERS = {
  copy: { x: CANVAS_WIDTH - 96, y: 32 },
  bookmark: { x: CANVAS_WIDTH - 48, y: 32 },
  send: { x: CANVAS_WIDTH - 64, y: CARD_HEIGHT - 42 },
  input: { x: 220, y: CARD_HEIGHT - 42 },
  content: { x: CANVAS_WIDTH / 2, y: CONTENT_TOP + CONTENT_HEIGHT / 2 },
} as const;

export type TargetRoleKey = keyof typeof TARGET_CENTERS;

export const CURSOR_HOME = { x: CANVAS_WIDTH / 2, y: CARD_HEIGHT - INPUT_BAR_HEIGHT / 2 };
