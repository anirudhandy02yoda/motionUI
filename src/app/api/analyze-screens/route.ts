import { NextRequest, NextResponse } from "next/server";
import { analyzeScreens } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 120;

const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per screenshot

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File);

    if (files.length < 4 || files.length > 5) {
      return NextResponse.json(
        { error: `Expected 4-5 screenshots, received ${files.length}.` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        return NextResponse.json(
          { error: `Unsupported file type "${file.type}". Use PNG or JPG.` },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: `"${file.name}" exceeds the 10MB limit.` },
          { status: 400 }
        );
      }
    }

    const images = await Promise.all(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return { mimeType: file.type, base64: buffer.toString("base64") };
      })
    );

    const analysis = await analyzeScreens(images);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[/api/analyze-screens]", error);
    const message = error instanceof Error ? error.message : "Unknown error analyzing screens.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
