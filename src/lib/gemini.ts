import { GoogleGenAI, Type, type Schema } from "@google/genai";
import { AnalysisResult } from "./types";

const MODEL_ID = "gemini-3.6-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment before calling /api/analyze-screens."
    );
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Structured output schema enforced on gemini-3.6-flash so the UI/GSAP/Remotion
 * layers can trust the shape of the response without any post-hoc parsing. */
export const walkthroughSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectTitle: { type: Type.STRING },
    totalSteps: { type: Type.INTEGER },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepId: { type: Type.INTEGER },
          stepTitle: { type: Type.STRING },
          caption: { type: Type.STRING },
          domStructure: {
            type: Type.OBJECT,
            properties: {
              headerTitle: { type: Type.STRING },
              inputText: { type: Type.STRING },
              contentHtml: { type: Type.STRING },
              badgeText: { type: Type.STRING },
            },
            required: ["headerTitle", "inputText", "contentHtml", "badgeText"],
          },
          userAction: {
            type: Type.OBJECT,
            properties: {
              actionType: {
                type: Type.STRING,
                enum: ["click", "type", "hover", "scroll"],
              },
              targetSelector: { type: Type.STRING },
              typeText: { type: Type.STRING },
              tooltipText: { type: Type.STRING },
            },
            required: ["actionType", "targetSelector", "typeText", "tooltipText"],
          },
        },
        required: ["stepId", "stepTitle", "caption", "domStructure", "userAction"],
      },
    },
  },
  required: ["projectTitle", "totalSteps", "steps"],
};

const SYSTEM_PROMPT = `You are a senior front-end reverse-engineer. You are given a chronological
sequence of UI screenshots that make up a single product walkthrough. For every screenshot,
reconstruct that screen EXACTLY as shown — the same layout, chrome, icons, copy, colors, and
spacing — and infer the micro-action a user performed to get from the previous screen to this one.

This is a pixel-faithful recreation task, not a redesign. Do not invent, omit, simplify, or
rearrange anything that is visible in the screenshot, and do not add elements that are not in it
(no extra icons, buttons, badges, or fields the screenshot doesn't show).

Rules:
- "contentHtml" is the ENTIRE screen, top to bottom — every visible element (header/nav, badges,
  icon buttons, body content, input fields, footer), not just a "content area". It will be
  rendered edge-to-edge with no additional chrome added around it, so anything missing from
  contentHtml simply will not appear. Use semantic HTML with Tailwind utility classes only (no
  <script>, no external assets, no inline event handlers, no <style> tags). Match the screenshot's
  actual text content verbatim where legible.
- The root element of contentHtml must set \`min-h-full w-full\` plus its own background color
  matching the screenshot (e.g. \`bg-white\` or \`bg-[#0b0b12]\`) — it is responsible for its own
  full-bleed background, not a parent container.
- Exactly ONE element in contentHtml — the element this step's userAction operates on — must carry
  the attribute \`data-action-target="true"\`. This is invisible instrumentation only (no visual
  effect); it is how the animation engine locates the right element, so place it on the real node
  (e.g. the send button, the bookmark icon, the input field, the scrollable panel) rather than a
  wrapper.
- If actionType is "type", the data-action-target element must be a plain element (a <div> or
  <span>, not a real <input>/<textarea>) whose text content is exactly the full, final typed text
  for this step — the typewriter animation reveals that text by animating it, so it must already
  be correct and complete in your HTML.
- Frame 1 has no incoming action from a previous screen; use actionType "click" on the most
  prominent primary control (e.g. the send button or an empty-state target) with an empty
  typeText, or "type" if frame 1 is itself the result of typing into a field.
- "targetSelector" should describe the data-action-target element (id/class/role in your own
  words) — it's shown to the user for transparency, not used to locate the element.
- "typeText" is the literal text typed during this step's action, matching the data-action-target
  element's text content when actionType is "type"; leave it "" otherwise.
- "tooltipText" is a short (<= 6 word) label describing the action, shown as a hint bubble; leave
  it "" when there is nothing to say.
- "caption" is a one-sentence, human-readable description of what happens in this step, written
  for a walkthrough voiceover/subtitle.
- "headerTitle" and "badgeText" are short metadata strings summarizing what's on screen (used for
  step labels only, not rendered as separate UI) — "" if not applicable. "inputText" is the
  current value of the screen's primary text field if it has one, else "".
- Keep stepId 1-indexed and sequential, matching screenshot order exactly.
- totalSteps must equal the number of screenshots provided.
- Return ONLY the structured JSON described by the schema — no prose.`;

export interface AnalyzeInput {
  mimeType: string;
  base64: string;
}

export async function analyzeScreens(images: AnalyzeInput[]): Promise<AnalysisResult> {
  if (images.length < 2 || images.length > 6) {
    throw new Error("Provide between 4 and 5 screenshots (2-6 accepted) to analyze.");
  }

  const ai = getClient();

  const imageParts = images.map((img) => ({
    inlineData: { mimeType: img.mimeType, data: img.base64 },
  }));

  const response = await ai.models.generateContent({
    model: MODEL_ID,
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              `Here are ${images.length} screenshots, in chronological order, from a single ` +
              `user walkthrough. Analyze the visual flow across all of them together.`,
          },
          ...imageParts,
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      responseMimeType: "application/json",
      responseSchema: walkthroughSchema,
      temperature: 0.4,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(text) as AnalysisResult;
  } catch {
    throw new Error("Gemini response was not valid JSON.");
  }

  parsed.steps = [...parsed.steps].sort((a, b) => a.stepId - b.stepId);
  parsed.totalSteps = parsed.steps.length;

  return parsed;
}
