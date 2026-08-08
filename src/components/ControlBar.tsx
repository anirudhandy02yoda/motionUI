"use client";

import { Play, Pause, RotateCcw, Download, Loader2, ChevronDown } from "lucide-react";
import clsx from "clsx";

const SPEEDS = [1, 1.5, 2] as const;

interface ControlBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  progress: number; // 0-1
  onScrub: (progress: number) => void;
  onExport: () => void;
  isExporting: boolean;
}

export default function ControlBar({
  isPlaying,
  onTogglePlay,
  onRestart,
  speed,
  onSpeedChange,
  progress,
  onScrub,
  onExport,
  isExporting,
}: ControlBarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <input
        type="range"
        min={0}
        max={1000}
        value={Math.round(progress * 1000)}
        onChange={(e) => onScrub(Number(e.target.value) / 1000)}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-indigo-400"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400"
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} />}
          {isPlaying ? "Pause" : "Play"}
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <RotateCcw size={15} />
          Restart
        </button>

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className={clsx(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            isExporting ? "cursor-not-allowed bg-white/10 text-white/40" : "bg-white text-black hover:bg-white/90"
          )}
        >
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {isExporting ? "Rendering MP4…" : "Download MP4"}
        </button>

        <div className="relative ml-auto">
          <select
            value={speed}
            onChange={(e) => onSpeedChange(Number(e.target.value))}
            className="appearance-none rounded-full border border-white/15 bg-transparent py-2 pl-4 pr-8 text-sm font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white focus:outline-none"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s} className="bg-[#0b0b12] text-white">
                Speed: {s}x
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40"
          />
        </div>
      </div>
    </div>
  );
}
