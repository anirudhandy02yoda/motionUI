import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { AnalysisResult } from "@/lib/types";
import { withAntigravityConfig } from "@/remotion/webpackOverride";

export const runtime = "nodejs";
export const maxDuration = 300;

const COMPOSITION_ID = "Walkthrough";
const RENDER_DIR = path.join(process.cwd(), "public", "renders");
// Optional override for environments that provide their own Chromium/headless-shell
// build instead of letting Remotion download one on first render.
const BROWSER_EXECUTABLE = process.env.REMOTION_BROWSER_EXECUTABLE || undefined;

let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;
  const entryPoint = path.join(process.cwd(), "src", "remotion", "index.ts");
  cachedBundleUrl = await bundle({
    entryPoint,
    webpackOverride: withAntigravityConfig,
  });
  return cachedBundleUrl;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { analysis?: AnalysisResult };
    const analysis = body.analysis;

    if (!analysis || !Array.isArray(analysis.steps) || analysis.steps.length === 0) {
      return NextResponse.json({ error: "A valid analysis result is required." }, { status: 400 });
    }

    const serveUrl = await getBundleUrl();
    const inputProps = { analysis };

    const composition = await selectComposition({
      serveUrl,
      id: COMPOSITION_ID,
      inputProps,
      browserExecutable: BROWSER_EXECUTABLE,
    });

    await fs.mkdir(RENDER_DIR, { recursive: true });
    const fileName = `walkthrough-${crypto.randomUUID()}.mp4`;
    const outputLocation = path.join(RENDER_DIR, fileName);

    await renderMedia({
      serveUrl,
      composition,
      codec: "h264",
      outputLocation,
      inputProps,
      overwrite: true,
      browserExecutable: BROWSER_EXECUTABLE,
    });

    return NextResponse.json({ url: `/renders/${fileName}` });
  } catch (error) {
    console.error("[/api/render-video]", error);
    const message = error instanceof Error ? error.message : "Unknown error rendering video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
