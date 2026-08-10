import { AnalysisResult } from "./types";

// Every visual property here is an inline `style`, never a class name — this
// mirrors the contract enforced on Gemini in lib/gemini.ts. Class-based
// styling (Tailwind or otherwise) can't work for HTML that only exists at
// runtime: the CSS for those class names is never generated, because
// Tailwind only compiles classes it can find literally in the checked-in
// source at build time.
const TOOLBAR_ICON = "font-size:13px;color:#9ca3af;";

const INPUT_TOOLBAR = `
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

const inputBox = (bodyHtml: string) => `
<div style="width:100%;background:#ffffff;padding:96px 32px 40px;box-sizing:border-box;font-family:sans-serif;">
  <div style="margin:0 auto;width:100%;max-width:640px;border-radius:16px;border:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
    ${INPUT_TOOLBAR}
    ${bodyHtml}
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;">
      <button style="display:flex;align-items:center;gap:6px;border-radius:999px;border:1px solid #e5e7eb;padding:6px 12px;font-size:12px;color:#6b7280;background:#fff;">
        <span style="color:#3b82f6;">⊕</span> Add context to chat
      </button>
      <div style="display:flex;align-items:center;gap:12px;color:#9ca3af;">
        <span>⚙</span><span>📖</span><span>↺</span>
        <button style="margin-left:4px;display:flex;align-items:center;gap:6px;border-radius:999px;background:#2563eb;padding:8px 16px;font-size:14px;font-weight:600;color:#fff;border:none;">Send ↑</button>
      </div>
    </div>
  </div>
</div>`;

const answerScreen = (opts: { question: string; bodyHtml: string; actionIcon: "bookmark" | "copy" }) => `
<div style="width:100%;background:#ffffff;padding:32px;box-sizing:border-box;font-family:sans-serif;">
  <h2 style="margin:0 0 16px 0;font-size:24px;font-weight:600;color:#111827;">${opts.question}</h2>
  <div style="border-radius:12px;border:1px solid #f3f4f6;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="display:flex;align-items:center;justify-content:space-between;border-radius:12px 12px 0 0;background:#fffbeb;padding:8px 16px;font-size:14px;color:#b45309;">
      <span>⚡ This is just a summary - we do a lot more, but here's the overview</span>
      <div style="display:flex;align-items:center;gap:8px;color:#9ca3af;">
        <span ${opts.actionIcon === "copy" ? 'data-action-target="true"' : ""} style="cursor:pointer;">⧉</span>
        <span ${opts.actionIcon === "bookmark" ? 'data-action-target="true"' : ""} style="cursor:pointer;">🔖</span>
      </div>
    </div>
    <div style="padding:20px;font-size:14px;line-height:1.7;color:#374151;">
      ${opts.bodyHtml}
    </div>
  </div>
</div>`;

/** Bundled sample analysis (modeled on the aline AI / NIS2 reference walkthrough)
 * so the GSAP player and video export can be exercised end-to-end without a
 * live Gemini API key. Each step's contentHtml is the ENTIRE screen, styled
 * entirely with inline `style` attributes exactly as gemini-3.6-flash is
 * instructed to produce — no chrome/icons are added by our own React
 * components; StepCard just renders this HTML verbatim. */
export const sampleAnalysis: AnalysisResult = {
  projectTitle: "aline AI — NIS2 Compliance Lookup",
  totalSteps: 5,
  steps: [
    {
      stepId: 1,
      stepTitle: "Empty state",
      caption: "The user opens aline AI to an empty prompt box, ready to ask a question.",
      domStructure: {
        headerTitle: "Ask aline AI anything",
        inputText: "",
        contentHtml: inputBox(
          '<div data-action-target="true" style="padding:20px 16px;color:#9ca3af;font-size:15px;">Ask aline AI anything…</div>'
        ),
        badgeText: "",
      },
      userAction: {
        actionType: "click",
        targetSelector: "#promptInput",
        typeText: "",
        tooltipText: "Click to start typing",
      },
    },
    {
      stepId: 2,
      stepTitle: "Question typed",
      caption: "The user types a compliance question about NIS2 and business consulting firms.",
      domStructure: {
        headerTitle: "Ask aline AI anything",
        inputText: "Does NIS2 apply to Business consulting firms in Europe?",
        contentHtml: inputBox(
          '<div data-action-target="true" style="padding:20px 16px;color:#111827;font-size:15px;">Does NIS2 apply to Business consulting firms in Europe?</div>'
        ),
        badgeText: "",
      },
      userAction: {
        actionType: "type",
        targetSelector: "#promptInput",
        typeText: "Does NIS2 apply to Business consulting firms in Europe?",
        tooltipText: "",
      },
    },
    {
      stepId: 3,
      stepTitle: "Question answered",
      caption: "aline AI streams back a structured overview of NIS2 scope and applicability.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText: "Does NIS2 apply to Business consulting firms in Europe?",
        contentHtml: answerScreen({
          question: "Does NIS2 apply to consulting firms in Europe?",
          actionIcon: "bookmark",
          bodyHtml:
            '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">1. Overview of NIS2 Directive</h4>' +
            "<p style=\"margin:0 0 12px 0;\">The NIS2 Directive (EU 2022/2555) is the EU's updated framework for cybersecurity risk management and reporting obligations, significantly expanding the range of organizations in scope.</p>" +
            '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">2. Sectoral Scope</h4>' +
            '<ul style="margin:0;padding-left:20px;">' +
            '<li style="margin-bottom:4px;"><span style="font-weight:500;color:#111827;">Essential Entities</span> (Annex I): energy, transport, banking, health, digital infrastructure, ICT service management.</li>' +
            '<li><span style="font-weight:500;color:#111827;">Important Entities</span> (Annex II): postal services, waste management, manufacturing, digital providers.</li>' +
            "</ul>",
        }),
        badgeText: "This is just a summary",
      },
      userAction: {
        actionType: "hover",
        targetSelector: ".bookmark-icon",
        typeText: "",
        tooltipText: "Save prompt",
      },
    },
    {
      stepId: 4,
      stepTitle: "Follow-up typed",
      caption: "The user asks a targeted follow-up about their own company, Acme.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText:
          "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.",
        contentHtml: inputBox(
          '<div data-action-target="true" style="padding:20px 16px;color:#111827;font-size:15px;">Does Acme\'s data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.</div>'
        ),
        badgeText: "",
      },
      userAction: {
        actionType: "type",
        targetSelector: "#promptInput",
        typeText:
          "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.",
        tooltipText: "",
      },
    },
    {
      stepId: 5,
      stepTitle: "Follow-up answered",
      caption: "aline AI confirms Acme likely falls under NIS2's ICT service management category.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText:
          "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.",
        contentHtml: answerScreen({
          question: "Does NIS2 apply to consulting firms in Europe?",
          actionIcon: "copy",
          bodyHtml:
            '<h4 style="font-weight:600;color:#111827;margin:0 0 4px 0;">Answer: Yes, in most cases.</h4>' +
            '<p style="margin:0 0 12px 0;">The NIS2 Directive lists <span style="font-weight:600;color:#111827;">"ICT service management (business-to-business)"</span> as an essential sector (Annex I).</p>' +
            '<ul style="margin:0;padding-left:20px;">' +
            '<li style="margin-bottom:4px;">ICT service management (B2B) — Annex I, point 8</li>' +
            '<li style="margin-bottom:4px;">Data processing services — if providing managed infrastructure</li>' +
            "<li>Cloud computing services — if hosting data warehouses</li>" +
            "</ul>",
        }),
        badgeText: "This is just a summary",
      },
      userAction: {
        actionType: "hover",
        targetSelector: ".copy-icon",
        typeText: "",
        tooltipText: "Copy answer",
      },
    },
  ],
};
