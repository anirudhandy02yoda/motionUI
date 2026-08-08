/** Canvas dimensions shared by every frame of the Remotion render. Unlike an
 * earlier version of this file, cursor target positions are NOT hard-coded
 * here — screens are the model's exact, arbitrary recreation of the uploaded
 * screenshots, so target coordinates are measured from the real rendered DOM
 * per frame (see Composition.tsx) via the model-provided
 * `data-action-target` attribute, the same way the live GSAP player does. */
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 800;
export const VIDEO_FPS = 30;

export const CAPTION_HEIGHT = 64;
export const CARD_HEIGHT = CANVAS_HEIGHT - CAPTION_HEIGHT;

export const CURSOR_HOME = { x: CANVAS_WIDTH / 2, y: CARD_HEIGHT - 60 };
