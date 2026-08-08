"use client";

import { useState } from "react";
import { Rocket, Sparkles, CheckCircle2, RefreshCcw } from "lucide-react";
import Uploader from "@/components/Uploader";
import WalkthroughStage from "@/components/WalkthroughStage";
import { AnalysisResult } from "@/lib/types";
import { sampleAnalysis } from "@/lib/sampleData";

export default function Home() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleAnalyze = async (files: File[]) => {
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("images", f));
      const res = await fetch("/api/analyze-screens", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to analyze screenshots.");
      setAnalysis(data.analysis);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleExport = async () => {
    if (!analysis) return;
    setIsExporting(true);
    setExportError(null);
    setExportUrl(null);
    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to render video.");
      setExportUrl(data.url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsExporting(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setAnalyzeError(null);
    setExportUrl(null);
    setExportError(null);
  };

  return (
    <div className="min-h-screen bg-[#050509] text-white">
      <header className="border-b border-white/5">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <Rocket size={16} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Antigravity</span>
          </div>
          {analysis && (
            <button
              type="button"
              onClick={reset}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-white/25 hover:text-white"
            >
              <RefreshCcw size={12} />
              Start over
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        {!analysis ? (
          <>
            <div className="mx-auto mb-10 max-w-2xl text-center">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
                <Sparkles size={12} />
                Screenshots in, interactive walkthrough out
              </span>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                Turn 4–5 screenshots into a reconstructed, animated UI walkthrough
              </h1>
              <p className="mt-4 text-white/50">
                Antigravity analyzes a chronological sequence of screenshots, recreates each screen, infers the
                micro-actions between them, and plays it back as an interactive preview — or exports it as a
                60fps MP4.
              </p>
            </div>

            <Uploader onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} error={analyzeError} />

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setAnalysis(sampleAnalysis)}
                className="text-xs text-white/40 underline decoration-white/20 underline-offset-4 hover:text-white/70"
              >
                No screenshots handy? Try the bundled sample walkthrough
              </button>
            </div>
          </>
        ) : (
          <div>
            <WalkthroughStage analysis={analysis} onExport={handleExport} isExporting={isExporting} />

            {exportError && (
              <p className="mt-4 text-center text-sm text-red-400">{exportError}</p>
            )}
            {exportUrl && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-300">
                <CheckCircle2 size={16} />
                Video ready —{" "}
                <a href={exportUrl} download className="font-semibold underline underline-offset-2">
                  download the MP4
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
