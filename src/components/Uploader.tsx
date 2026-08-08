"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, ImagePlus, Loader2, AlertCircle } from "lucide-react";
import clsx from "clsx";

const MIN_FILES = 4;
const MAX_FILES = 5;
const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

interface StagedFile {
  file: File;
  previewUrl: string;
}

interface UploaderProps {
  onAnalyze: (files: File[]) => void;
  isAnalyzing: boolean;
  error: string | null;
}

export default function Uploader({ onAnalyze, isAnalyzing, error }: UploaderProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const list = Array.from(incoming);
      const valid = list.filter((f) => ACCEPTED.includes(f.type));
      if (valid.length !== list.length) {
        setLocalError("Only PNG, JPG, or WEBP screenshots are supported.");
      } else {
        setLocalError(null);
      }

      setStaged((prev) => {
        const merged = [...prev, ...valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
        return merged.slice(0, MAX_FILES);
      });
    },
    []
  );

  const removeAt = (index: number) => {
    setStaged((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].previewUrl);
      next.splice(index, 1);
      return next;
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const canAnalyze = staged.length >= MIN_FILES && staged.length <= MAX_FILES && !isAnalyzing;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer",
          isDragging
            ? "border-indigo-400 bg-indigo-500/10"
            : "border-white/15 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
          <UploadCloud size={26} />
        </div>
        <p className="text-sm font-medium text-white/90">
          Drop 4–5 UI screenshots here, or click to browse
        </p>
        <p className="text-xs text-white/40">PNG or JPG · chronological order · max 10MB each</p>
      </div>

      {staged.length > 0 && (
        <div className="mt-5 grid grid-cols-5 gap-3">
          {staged.map((s, i) => (
            <div
              key={s.previewUrl}
              className="group relative aspect-[9/16] overflow-hidden rounded-lg border border-white/10 bg-black/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.previewUrl} alt={`Screenshot ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white/80">
                {i + 1}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          ))}
          {staged.length < MAX_FILES &&
            Array.from({ length: MAX_FILES - staged.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[9/16] items-center justify-center rounded-lg border border-dashed border-white/10 text-white/20 hover:text-white/40"
              >
                <ImagePlus size={18} />
              </div>
            ))}
        </div>
      )}

      {(localError || error) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <AlertCircle size={16} />
          {localError || error}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs text-white/40">
          {staged.length}/{MAX_FILES} screenshots
          {staged.length > 0 && staged.length < MIN_FILES && ` · add ${MIN_FILES - staged.length} more`}
        </span>
        <button
          type="button"
          disabled={!canAnalyze}
          onClick={() => onAnalyze(staged.map((s) => s.file))}
          className={clsx(
            "flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
            canAnalyze
              ? "bg-indigo-500 text-white hover:bg-indigo-400"
              : "cursor-not-allowed bg-white/10 text-white/30"
          )}
        >
          {isAnalyzing && <Loader2 size={16} className="animate-spin" />}
          {isAnalyzing ? "Analyzing screens…" : "Generate walkthrough"}
        </button>
      </div>
    </div>
  );
}
