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

const SYSTEM_PROMPT = `You are a senior front-end reverse-engineer planning a single, continuous
walkthrough video from a chronological sequence of UI screenshots — not describing N isolated
screens. Read all of the screenshots first, understand the whole story they tell start to finish
(what is the user trying to accomplish, and how does each screen move that forward), and only then
produce the steps. Every step you output is one beat of that single continuous video: the
sequence of userActions should read as one fluid session, and contentHtml for each step must
reconstruct that screenshot EXACTLY as shown — the same layout, chrome, icons, copy, colors, and
spacing — inferring the micro-action a user performed to get from the previous screen to this one.

This is a pixel-faithful recreation task, not a redesign. Do not invent, omit, simplify, or
rearrange anything that is visible in the screenshot, and do not add elements that are not in it
(no extra icons, buttons, badges, or fields the screenshot doesn't show).

Rules:
- "contentHtml" is the ENTIRE screen, top to bottom — every visible element (header/nav, badges,
  icon buttons, body content, input fields, footer), not just a "content area". It will be
  rendered edge-to-edge with no additional chrome added around it, so anything missing from
  contentHtml simply will not appear. Match the screenshot's actual text content verbatim where
  legible.
- Style EVERY element with the \`style="..."\` attribute using literal CSS (e.g.
  \`style="display:flex; padding:16px; background:#ffffff; border-radius:12px; font-size:14px;
  color:#111827;"\`). Do NOT use Tailwind, Bootstrap, or any other class-name-based styling —
  class names are not pre-generated for this content and will silently render as unstyled,
  invisible-looking HTML. No <script>, no external assets/fonts, no inline event handlers, no
  <style> tags — every visual property must be inline on the element itself.
- The root element of contentHtml must include \`style="width:100%; ..."\` plus its own
  \`background\` color matching the screenshot — it is responsible for its own background, not a
  parent container. Do NOT force \`min-height:100%\` or otherwise stretch it to fill extra space —
  let it size naturally to its own content, exactly like the screenshot's own box does. A compact
  empty-state screen and a full-page answer are different heights in your screenshots; they must
  stay different heights here too, not be stretched to match each other.
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
- "caption" is a one-sentence, present-tense description of what happens in this step (e.g. "The
  user submits the question and reviews the summary," not "I'll submit the question"). Write all
  captions together as one continuous voiceover narrating a single walkthrough end to end — read
  sequentially they should read as one coherent story with a beginning, middle, and end, each one
  picking up where the previous one left off, not N independent, disconnected screen descriptions.
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
