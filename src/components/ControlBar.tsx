"use client";

import { Play, Pause, RotateCcw, Download, Loader2 } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRestart}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Restart"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-white transition-colors hover:bg-indigo-400"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <div className="ml-2 flex items-center gap-1 rounded-full bg-white/5 p-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange(s)}
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                  speed === s ? "bg-white text-black" : "text-white/50 hover:text-white/80"
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onExport}
          disabled={isExporting}
          className={clsx(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            isExporting
              ? "cursor-not-allowed bg-white/10 text-white/40"
              : "bg-white text-black hover:bg-white/90"
          )}
        >
          {isExporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {isExporting ? "Rendering MP4…" : "Export video"}
        </button>
      </div>
    </div>
  );
}
