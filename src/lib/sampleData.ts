import { AnalysisResult, Mutation } from "./types";

// Every visual property here is an inline `style`, never a class name — this
// mirrors the contract enforced on Gemini in lib/gemini.ts. Class-based
// styling can't work for HTML that only exists at runtime: the CSS for
// those class names is never generated, since Tailwind only compiles
// classes it can find literally in the checked-in source at build time.
//
// This sample also demonstrates the base-scene + mutation-diff model: ONE
// persistent scene (baseHtml) is mounted once — the composer never gets
// regenerated, it's the same data-motion-id="chat-input" node throughout,
// just mutated in place (setText/setAttr) — and new content (each answer)
// is introduced via addElement into a persistent results-area, not by
// swapping in a whole new screen.

const TOOLBAR_ICON = "font-size:13px;color:#9ca3af;";

const TOOLBAR = `
  <div style="display:flex;align-items:center;gap:12px;border-bottom:1px solid #f3f4f6;padding:8px 16px;">
    <span style="${TOOLBAR_ICON}font-weight:700;">B</span>
    <span style="${TOOLBAR_ICON}font-style:italic;">I</span>
    <span style="${TOOLBAR_ICON}text-decoration:underline;">U</span>
    <span style="${TOOLBAR_ICON}text-decoration:line-through;">S</span>
    <span style="${TOOLBAR_ICON}">↔</span>
    <span style="${TOOLBAR_ICON}">≡</span>
    <span style="${TOOLBAR_ICON}">🔗</span>
    <span style="${TOOLBAR_ICON}">▦</span>
  </div>`;

const PLACEHOLDER_STYLE = "padding:20px 16px;color:#9ca3af;font-size:15px;";
const TYPED_STYLE = "padding:20px 16px;color:#111827;font-size:15px;";

const answerCard = (opts: {
  id: string;
  question: string;
  bodyHtml: string;
  copyId: string;
  bookmarkId: string;
}) => `
<div data-motion-id="${opts.id}" style="width:100%;background:#ffffff;padding:0 0 32px 0;box-sizing:border-box;font-family:sans-serif;">
  <h2 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#111827;">${opts.question}</h2>
  <div style="border-radius:12px;border:1px solid #f3f4f6;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex;align-items:center;justify-content:space-between;border-radius:12px 12px 0 0;background:#fffbeb;padding:8px 16px;font-size:14px;color:#b45309;">
      <span>⚡ This is just a summary - we do a lot more, but here's the overview</span>
      <div style="display:flex;align-items:center;gap:8px;color:#9ca3af;">
        <span data-motion-id="${opts.copyId}" style="cursor:pointer;">⧉</span>
        <span data-motion-id="${opts.bookmarkId}" style="cursor:pointer;">🔖</span>
      </div>
    </div>
    <div style="padding:20px;font-size:14px;line-height:1.7;color:#374151;">
      ${opts.bodyHtml}
    </div>
  </div>
</div>`;

const NIS2_BODY =
  '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">1. Overview of NIS2 Directive</h4>' +
  "<p style=\"margin:0 0 12px 0;\">The NIS2 Directive (EU 2022/2555) is the EU's updated framework for cybersecurity risk management and reporting obligations, significantly expanding the range of organizations in scope.</p>" +
  '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">2. Sectoral Scope</h4>' +
  '<ul style="margin:0;padding-left:20px;">' +
  '<li style="margin-bottom:4px;"><span style="font-weight:500;color:#111827;">Essential Entities</span> (Annex I): energy, transport, banking, health, digital infrastructure, ICT service management.</li>' +
  '<li><span style="font-weight:500;color:#111827;">Important Entities</span> (Annex II): postal services, waste management, manufacturing, digital providers.</li>' +
  "</ul>";

const ACME_BODY =
  '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">Answer: Yes, in most cases.</h4>' +
  '<p style="margin:0 0 12px 0;">The NIS2 Directive lists <span style="font-weight:600;color:#111827;">"ICT service management (business-to-business)"</span> as an essential sector (Annex I).</p>' +
  '<ul style="margin:0;padding-left:20px;">' +
  '<li style="margin-bottom:4px;">ICT service management (B2B) — Annex I, point 8</li>' +
  '<li style="margin-bottom:4px;">Data processing services — if providing managed infrastructure</li>' +
  "<li>Cloud computing services — if hosting data warehouses</li>" +
  "</ul>";

const QUESTION_1 = "Does NIS2 apply to Business consulting firms in Europe?";
const QUESTION_2 =
  "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.";

const baseHtml = `
<div data-motion-id="app-root" style="width:100%;background:#ffffff;padding:32px;box-sizing:border-box;font-family:sans-serif;">
  <div data-motion-id="results-area" style="width:100%;"></div>
  <div data-motion-id="composer" style="margin:0 auto;width:100%;max-width:640px;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    ${TOOLBAR}
    <div data-motion-id="chat-input" style="${PLACEHOLDER_STYLE}">Ask aline AI anything…</div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
      <button style="display:flex;align-items:center;gap:6px;border-radius:999px;border:1px solid #e5e7eb;padding:6px 12px;font-size:12px;color:#6b7280;background:#fff;">
        <span style="color:#3b82f6;">⊕</span> Add context to chat
      </button>
      <div style="display:flex;align-items:center;gap:12px;color:#9ca3af;">
        <span>⚙</span><span>📖</span><span>↺</span>
        <button data-motion-id="send-button" style="margin-left:4px;display:flex;align-items:center;gap:6px;border-radius:999px;background:#2563eb;padding:8px 16px;font-size:14px;font-weight:600;color:#fff;border:none;">Send ↑</button>
      </div>
    </div>
  </div>
</div>`;

const clearComposer: Mutation[] = [
  { op: "setAttr", targetId: "chat-input", text: "", attr: "style", value: PLACEHOLDER_STYLE, html: "", parentId: "", position: "end" },
  { op: "setText", targetId: "chat-input", text: "Ask aline AI anything…", attr: "", value: "", html: "", parentId: "", position: "end" },
];

/** Bundled sample analysis so the GSAP player and video export can be
 * exercised end-to-end without a live Gemini API key. Mirrors exactly what
 * gemini-3.6-flash is instructed to produce: one persistent scene
 * (baseHtml) mutated in place across steps, not N independent screens. */
export const sampleAnalysis: AnalysisResult = {
  projectTitle: "aline AI — NIS2 Compliance Lookup",
  totalSteps: 7,
  baseHtml,
  steps: [
    {
      stepId: 1,
      stepTitle: "Empty state",
      caption: "The user opens aline AI to an empty prompt box, ready to ask a question.",
      userAction: { actionType: "click", targetId: "chat-input", typeText: "", tooltipText: "Click to start typing" },
      mutations: [],
    },
    {
      stepId: 2,
      stepTitle: "Question typed",
      caption: "The user types a compliance question about NIS2 and business consulting firms.",
      userAction: { actionType: "type", targetId: "chat-input", typeText: QUESTION_1, tooltipText: "" },
      mutations: [
        { op: "setAttr", targetId: "chat-input", text: "", attr: "style", value: TYPED_STYLE, html: "", parentId: "", position: "end" },
        { op: "setText", targetId: "chat-input", text: QUESTION_1, attr: "", value: "", html: "", parentId: "", position: "end" },
      ],
    },
    {
      stepId: 3,
      stepTitle: "Question submitted",
      caption: "aline AI streams back a structured overview of NIS2 scope and applicability.",
      userAction: { actionType: "click", targetId: "send-button", typeText: "", tooltipText: "" },
      mutations: [
        {
          op: "addElement",
          targetId: "",
          text: "",
          attr: "",
          value: "",
          html: answerCard({
            id: "answer-1",
            question: "Does NIS2 apply to consulting firms in Europe?",
            bodyHtml: NIS2_BODY,
            copyId: "answer-1-copy",
            bookmarkId: "answer-1-bookmark",
          }),
          parentId: "results-area",
          position: "end",
        },
        ...clearComposer,
      ],
    },
    {
      stepId: 4,
      stepTitle: "Save prompt",
      caption: "The user hovers the bookmark icon to save this prompt for later.",
      userAction: { actionType: "hover", targetId: "answer-1-bookmark", typeText: "", tooltipText: "Save prompt" },
      mutations: [],
    },
    {
      stepId: 5,
      stepTitle: "Follow-up typed",
      caption: "The user asks a targeted follow-up about their own company, Acme.",
      userAction: { actionType: "type", targetId: "chat-input", typeText: QUESTION_2, tooltipText: "" },
      mutations: [
        { op: "setAttr", targetId: "chat-input", text: "", attr: "style", value: TYPED_STYLE, html: "", parentId: "", position: "end" },
        { op: "setText", targetId: "chat-input", text: QUESTION_2, attr: "", value: "", html: "", parentId: "", position: "end" },
      ],
    },
    {
      stepId: 6,
      stepTitle: "Follow-up submitted",
      caption: "aline AI confirms Acme likely falls under NIS2's ICT service management category.",
      userAction: { actionType: "click", targetId: "send-button", typeText: "", tooltipText: "" },
      mutations: [
        {
          op: "addElement",
          targetId: "",
          text: "",
          attr: "",
          value: "",
          html: answerCard({
            id: "answer-2",
            question: "Does NIS2 apply to consulting firms in Europe?",
            bodyHtml: ACME_BODY,
            copyId: "answer-2-copy",
            bookmarkId: "answer-2-bookmark",
          }),
          parentId: "results-area",
          position: "end",
        },
        ...clearComposer,
      ],
    },
    {
      stepId: 7,
      stepTitle: "Copy answer",
      caption: "The user hovers the copy icon to grab the answer for later.",
      userAction: { actionType: "hover", targetId: "answer-2-copy", typeText: "", tooltipText: "Copy answer" },
      mutations: [],
    },
  ],
};
