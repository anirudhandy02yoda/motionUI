# Antigravity

Antigravity converts a sequence of 4–5 UI screenshots into a reconstructed, interactive UI
walkthrough and an animated 60fps MP4 video export.

## Pipeline

1. **Ingestion & analysis** — drag-and-drop 4–5 screenshots. They're sent in a single batch to
   `gemini-3.6-flash` via `@google/genai` with a strict `responseSchema`, which reconstructs each
   screen's semantic HTML/DOM structure and infers the user micro-action (click/type/hover/scroll)
   that connects each frame to the next.
2. **Interactive canvas** — `WalkthroughStage.tsx` renders the reconstructed screens in an
   isolated viewport and drives an animated SVG cursor, typewriter text, click ripples, and
   tooltip reveals with GSAP timelines. A control bar supports play/pause, restart, 1x/1.5x/2x
   speed, and step-pill scrubbing.
3. **Video export** — `POST /api/render-video` bundles `src/remotion/index.ts` with
   `@remotion/bundler` and renders it to MP4 with `@remotion/renderer`, using the exact same
   deterministic timeline (`src/lib/timeline.ts`) as the live GSAP player so both outputs match.

## Getting started

```bash
npm install
cp .env.example .env.local   # then set GEMINI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No API key handy? Click "Try the bundled
sample walkthrough" on the landing page to exercise the player/export pipeline with mock data.

To open the Remotion Studio directly (for iterating on the video composition):

```bash
npm run remotion:studio
```

## Environment variables

| Variable         | Description                                   |
| ----------------- | ---------------------------------------------- |
| `GEMINI_API_KEY`  | API key for the Gemini vision model used by `/api/analyze-screens`. |

## Tech stack

- Next.js 15 (App Router, TypeScript, Tailwind CSS v4)
- `@google/genai` (`gemini-3.6-flash`) for structured screenshot analysis
- GSAP 3 for the real-time interactive player
- Remotion (`@remotion/bundler` + `@remotion/renderer`) for server-side MP4 export
- Lucide React for icons
