import { AnalysisResult } from "./types";

const INPUT_TOOLBAR = `
  <div class="flex items-center gap-3 border-b border-gray-100 px-4 py-2 text-gray-400">
    <span class="text-sm font-bold">B</span>
    <span class="text-sm italic">I</span>
    <span class="text-sm underline">U</span>
    <span class="text-sm line-through">S</span>
    <span class="text-sm">↔</span>
    <span class="text-sm">≡</span>
    <span class="text-sm">🔗</span>
    <span class="text-sm">▦</span>
  </div>`;

const inputBox = (bodyHtml: string) => `
<div class="min-h-full w-full flex flex-col justify-end bg-white p-8">
  <div class="mx-auto w-full max-w-2xl rounded-2xl border border-gray-200 shadow-sm">
    ${INPUT_TOOLBAR}
    ${bodyHtml}
    <div class="flex items-center justify-between px-4 py-3">
      <button class="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-500">
        <span class="text-blue-500">⊕</span> Add context to chat
      </button>
      <div class="flex items-center gap-3 text-gray-400">
        <span>⚙</span><span>📖</span><span>↺</span>
        <button class="ml-1 flex h-9 items-center gap-1.5 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white">Send ↑</button>
      </div>
    </div>
  </div>
</div>`;

const answerScreen = (opts: {
  question: string;
  bodyHtml: string;
  actionIcon: "bookmark" | "copy";
}) => `
<div class="min-h-full w-full bg-white p-8">
  <h2 class="mb-4 text-2xl font-semibold text-gray-900">${opts.question}</h2>
  <div class="rounded-xl border border-gray-100 shadow-sm">
    <div class="flex items-center justify-between rounded-t-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
      <span>⚡ This is just a summary - we do a lot more, but here's the overview</span>
      <div class="flex items-center gap-2 text-gray-400">
        <span ${opts.actionIcon === "copy" ? 'data-action-target="true"' : ""} class="cursor-pointer">⧉</span>
        <span ${opts.actionIcon === "bookmark" ? 'data-action-target="true"' : ""} class="cursor-pointer">🔖</span>
      </div>
    </div>
    <div class="px-5 py-5 text-sm leading-relaxed text-gray-700">
      ${opts.bodyHtml}
    </div>
  </div>
</div>`;

/** Bundled sample analysis (modeled on the aline AI / NIS2 reference walkthrough)
 * so the GSAP player and video export can be exercised end-to-end without a
 * live Gemini API key. Each step's contentHtml is the ENTIRE screen, exactly
 * as it would come back from gemini-3.6-flash — no chrome/icons are added by
 * our own React components; StepCard just renders this HTML verbatim. */
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
          '<div data-action-target="true" class="px-4 py-5 text-gray-400">Ask aline AI anything…</div>'
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
          '<div data-action-target="true" class="px-4 py-5 text-gray-900">Does NIS2 apply to Business consulting firms in Europe?</div>'
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
            '<h4 class="font-semibold text-gray-900 mb-1">1. Overview of NIS2 Directive</h4>' +
            "<p class=\"mb-3\">The NIS2 Directive (EU 2022/2555) is the EU's updated framework for cybersecurity risk management and reporting obligations, significantly expanding the range of organizations in scope.</p>" +
            '<h4 class="font-semibold text-gray-900 mb-1">2. Sectoral Scope</h4>' +
            '<ul class="list-disc list-inside space-y-1">' +
            '<li><span class="font-medium text-gray-900">Essential Entities</span> (Annex I): energy, transport, banking, health, digital infrastructure, ICT service management.</li>' +
            '<li><span class="font-medium text-gray-900">Important Entities</span> (Annex II): postal services, waste management, manufacturing, digital providers.</li>' +
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
          '<div data-action-target="true" class="px-4 py-5 text-gray-900">Does Acme\'s data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.</div>'
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
            '<h4 class="font-semibold text-gray-900 mb-1">Answer: Yes, in most cases.</h4>' +
            '<p class="mb-3">The NIS2 Directive lists <span class="font-semibold text-gray-900">"ICT service management (business-to-business)"</span> as an essential sector (Annex I).</p>' +
            '<ul class="list-disc list-inside space-y-1">' +
            "<li>ICT service management (B2B) — Annex I, point 8</li>" +
            "<li>Data processing services — if providing managed infrastructure</li>" +
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
