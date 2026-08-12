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

const userActionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    actionType: { type: Type.STRING, enum: ["click", "type", "hover", "scroll"] },
    targetId: { type: Type.STRING },
    typeText: { type: Type.STRING },
    tooltipText: { type: Type.STRING },
  },
  required: ["actionType", "targetId", "typeText", "tooltipText"],
};

const mutationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    op: { type: Type.STRING, enum: ["setText", "setAttr", "addElement", "removeElement"] },
    targetId: { type: Type.STRING },
    text: { type: Type.STRING },
    attr: { type: Type.STRING },
    value: { type: Type.STRING },
    html: { type: Type.STRING },
    parentId: { type: Type.STRING },
    position: { type: Type.STRING, enum: ["start", "end"] },
  },
  required: ["op", "targetId", "text", "attr", "value", "html", "parentId", "position"],
};

/** Structured output schema enforced on gemini-3.6-flash so the UI/GSAP/Remotion
 * layers can trust the shape of the response without any post-hoc parsing.
 * baseHtml is one persistent scene (screenshot 1); every later step is a
 * minimal mutation diff against it, not a new independent screen. */
export const walkthroughSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    projectTitle: { type: Type.STRING },
    totalSteps: { type: Type.INTEGER },
    baseHtml: { type: Type.STRING },
    steps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          stepId: { type: Type.INTEGER },
          stepTitle: { type: Type.STRING },
          caption: { type: Type.STRING },
          userAction: userActionSchema,
          mutations: { type: Type.ARRAY, items: mutationSchema },
        },
        required: ["stepId", "stepTitle", "caption", "userAction", "mutations"],
      },
    },
  },
  required: ["projectTitle", "totalSteps", "baseHtml", "steps"],
};

const SYSTEM_PROMPT = `You are a senior front-end reverse-engineer reconstructing ONE persistent, continuous
UI application from a chronological sequence of screenshots — not describing N independent screens.
The screenshots are sparse OBSERVATIONS of that one underlying application, not a slideshow script.
Your job is to figure out the most plausible interaction that connects them: what element persists,
what a user did, and what minimally changed as a result — the same way a real screen recording of
someone using the app would look, not a sequence of screen transitions.

STAGE 1 — Reconstruct the persistent scene (baseHtml)
"baseHtml" is a pixel-faithful, complete recreation of screenshot 1 — the same layout, chrome,
icons, copy, colors, and spacing, top to bottom (header/nav, badges, icon buttons, body content,
input fields, footer). It will be rendered edge-to-edge with no chrome added around it, so anything
missing simply will not appear. This is the ONLY scene that ever gets fully rendered; every later
screenshot is expressed as edits to it, so get it right.

- Style EVERY element with the \`style="..."\` attribute using literal CSS (e.g. \`style="display:flex;
  padding:16px; background:#ffffff; border-radius:12px; font-size:14px; color:#111827;"\`). Do NOT
  use Tailwind, Bootstrap, or any class-name-based styling — class names are not pre-generated for
  this content and will silently render as unstyled, invisible-looking HTML. No <script>, no
  external assets/fonts, no inline event handlers, no <style> tags.
- The root element must include \`style="width:100%; ..."\` plus its own \`background\` color — it is
  responsible for its own background, not a parent container. Do NOT force \`min-height:100%\` or
  otherwise stretch it to fill extra space; let it size naturally to its own content.
- EVERY semantically meaningful element (anything that might change, appear, disappear, or be
  interacted with across the sequence — header, nav items, badges, the input field, buttons, the
  message list container, each existing message, icons) must carry a stable, human-readable
  \`data-motion-id\` (kebab-case, e.g. "chat-input", "send-button", "message-list",
  "assistant-message-1"). This is invisible instrumentation only, no visual effect.

STAGE 2 — Express every later screenshot as a mutation diff, not a new screen
For steps 2..N, do not regenerate the screen. Instead: compare the previous state (baseHtml plus
every mutation applied so far) against this screenshot, and emit the MINIMAL set of mutations that
explains the difference. Reuse the exact same data-motion-id for any element that persists across
screenshots (the header is still "app-header", the input is still "chat-input") — never mint a new
id for something that's conceptually the same element just because you're describing a new
screenshot. Only genuinely new elements (a new chat message, a new list row, a newly-opened modal)
get a brand new, never-before-used data-motion-id.

Mutation ops (array "mutations" on each step):
- "setText": an existing element's text content changed (targetId, text = the new full text). Use
  this for typing progress, streamed/updated content, counters — anything where the SAME element's
  text differs between screenshots.
- "setAttr": an existing element's styling/state changed (targetId, attr — almost always "style",
  value = the new full inline style string for that element).
- "addElement": a new element appeared that did not exist before (targetId is unused; html = a
  single root element as a self-contained inline-styled HTML fragment with its OWN new
  data-motion-id, following the same styling rules as baseHtml; parentId = the EXISTING motionId of
  the container it was inserted into; position = "start" or "end").
- "removeElement": an element that was visible is now gone (targetId of the element to remove).

STAGE 3 — Explain each step as a user action causing that mutation
"userAction" is the trigger that causes this step's mutations (click/type/hover/scroll on a
targetId that already exists at the start of this step — from baseHtml or an earlier addElement).
Prefer the SMALLEST plausible action that explains the diff; do not invent clicks, navigation, or
elements the screenshots don't evidence.
- If actionType is "type": targetId is the input-like element being typed into, and this step's
  mutations MUST include a "setText" on that same targetId whose "text" is the full, final typed
  value shown in this screenshot — typing is animated as a typewriter reveal of that mutation, so
  it must already be complete and correct.
- Step 1 (baseHtml itself) has "mutations": [] — it just presents the starting state. Its
  userAction is what happens WHILE viewing screenshot 1 that leads to screenshot 2: "click" on the
  most prominent primary control (e.g. an empty-state input) with empty typeText, or "type" if
  screenshot 1 is itself mid-typing.
- "tooltipText" is a short (<= 6 word) hint bubble label; "" if there's nothing to say.

Rules:
- "caption" is a one-sentence, present-tense description of what happens in this step (e.g. "The
  user submits the question and reviews the summary," not "I'll submit the question"). Write all
  captions together as one continuous voiceover narrating a single walkthrough end to end — read
  sequentially they should read as one coherent story, each picking up where the previous left off.
- Keep stepId 1-indexed and sequential, matching screenshot order exactly. totalSteps must equal
  the number of screenshots provided.
- This is pixel-faithful reconstruction, not a redesign: do not invent, omit, or simplify anything
  visible, and do not add elements the screenshots don't show.
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
              `Here are ${images.length} screenshots, in chronological order, sparse observations ` +
              `of a single underlying application session. Reconstruct the one continuous UI and the ` +
              `interaction that connects them.`,
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
