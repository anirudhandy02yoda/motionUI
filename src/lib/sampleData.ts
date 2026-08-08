import { AnalysisResult } from "./types";

/** Bundled sample analysis (modeled on the aline AI / NIS2 reference walkthrough)
 * so the GSAP player and video export can be exercised end-to-end without a
 * live Gemini API key. */
export const sampleAnalysis: AnalysisResult = {
  projectTitle: "aline AI — NIS2 Compliance Lookup",
  totalSteps: 4,
  steps: [
    {
      stepId: 1,
      stepTitle: "Empty state",
      caption: "The user opens aline AI to an empty prompt box, ready to ask a question.",
      domStructure: {
        headerTitle: "Ask aline AI anything",
        inputText: "",
        contentHtml:
          '<p class="text-white/40 text-sm">Ask a compliance, legal, or regulatory question to get a sourced answer in seconds.</p>',
        badgeText: "",
      },
      userAction: {
        actionType: "type",
        targetSelector: "#promptInput",
        typeText: "Does NIS2 apply to Business consulting firms in Europe?",
        tooltipText: "Type your question",
      },
    },
    {
      stepId: 2,
      stepTitle: "Question submitted",
      caption: "aline AI streams back a structured overview of NIS2 scope and applicability.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText: "Does NIS2 apply to Business consulting firms in Europe?",
        contentHtml:
          '<h4 class="font-semibold text-white mb-1">1. Overview of NIS2 Directive</h4>' +
          '<p class="text-white/70 text-sm mb-3">The NIS2 Directive (EU 2022/2555) is the EU\'s updated framework for cybersecurity risk management and reporting obligations, significantly expanding the range of organizations in scope.</p>' +
          '<h4 class="font-semibold text-white mb-1">2. Sectoral Scope</h4>' +
          '<ul class="list-disc list-inside text-white/70 text-sm space-y-1">' +
          '<li><span class="text-white font-medium">Essential Entities</span> (Annex I): energy, transport, banking, health, digital infrastructure, ICT service management.</li>' +
          '<li><span class="text-white font-medium">Important Entities</span> (Annex II): postal services, waste management, manufacturing, digital providers.</li>' +
          "</ul>",
        badgeText: "This is just a summary",
      },
      userAction: {
        actionType: "click",
        targetSelector: ".bookmark-icon",
        typeText: "",
        tooltipText: "Save prompt",
      },
    },
    {
      stepId: 3,
      stepTitle: "Follow-up question",
      caption: "The user asks a targeted follow-up about their own company, Acme.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText: "",
        contentHtml:
          '<p class="text-white/40 text-sm">Continue the thread with a more specific, company-level question.</p>',
        badgeText: "",
      },
      userAction: {
        actionType: "type",
        targetSelector: "#promptInput",
        typeText:
          "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.",
        tooltipText: "Ask a follow-up",
      },
    },
    {
      stepId: 4,
      stepTitle: "Follow-up answer",
      caption: "aline AI confirms Acme likely falls under NIS2's ICT service management category.",
      domStructure: {
        headerTitle: "Does NIS2 apply to consulting firms in Europe?",
        inputText:
          "Does Acme's data and analytics services for managed enterprise data warehouses with clients in Europe fall under NIS2? We are Acme.com for reference.",
        contentHtml:
          '<h4 class="font-semibold text-white mb-1">Answer: Yes, in most cases.</h4>' +
          '<p class="text-white/70 text-sm mb-3">The NIS2 Directive lists <span class="font-semibold text-white">"ICT service management (business-to-business)"</span> as an essential sector (Annex I).</p>' +
          '<ul class="list-disc list-inside text-white/70 text-sm space-y-1">' +
          "<li>ICT service management (B2B) — Annex I, point 8</li>" +
          "<li>Data processing services — if providing managed infrastructure</li>" +
          "<li>Cloud computing services — if hosting data warehouses</li>" +
          "</ul>",
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
