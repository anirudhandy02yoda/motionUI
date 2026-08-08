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
sequence of UI screenshots that make up a single product walkthrough (e.g. a chat/assistant
product). For every screenshot, reconstruct a clean, semantic representation of that screen and
infer the micro-action a user performed to get from the previous screen to this one.

Rules:
- Frame 1 has no incoming action from a previous screen; use actionType "click" on the most
  prominent primary control (e.g. the send button or an empty-state target) with an empty
  typeText, or "type" if frame 1 is itself the result of typing into a field.
- "contentHtml" must be clean semantic HTML (headings, paragraphs, lists) representing the main
  content area of that screen, using Tailwind utility classes only (no <script>, no external
  assets, no inline event handlers, no <style> tags).
- "targetSelector" must be a plausible CSS selector (id or class) for the element the action was
  performed on, consistent with elements you describe in domStructure/contentHtml where relevant.
- "typeText" is the literal text typed during this step's action; leave it "" when actionType is
  not "type".
- "tooltipText" is a short (<= 6 word) label describing the action, shown as a hint bubble; leave
  it "" when there is nothing to say.
- "caption" is a one-sentence, human-readable description of what happens in this step, written
  for a walkthrough voiceover/subtitle.
- "badgeText" is any small status/label pill visible on screen (e.g. "Summary", "Draft"), or "" if
  none.
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
