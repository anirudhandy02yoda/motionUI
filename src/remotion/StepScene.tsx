import React from "react";
import { WalkthroughStep } from "@/lib/types";
import { HEADER_HEIGHT, INPUT_BAR_HEIGHT, CARD_HEIGHT } from "./layout";

interface StepSceneProps {
  step: WalkthroughStep;
  opacity: number;
  typedInputText: string;
}

/** Static (per-frame) render of one reconstructed screen for the Remotion
 * export. Layout mirrors StepCard.tsx but uses fixed pixel coordinates that
 * match layout.ts's TARGET_CENTERS exactly, instead of measuring the DOM. */
export default function StepScene({ step, opacity, typedInputText }: StepSceneProps) {
  const { domStructure } = step;

  return (
    <div style={{ position: "absolute", inset: 0, height: CARD_HEIGHT, opacity }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#0b0b12",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: HEADER_HEIGHT,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {domStructure.badgeText ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                background: "rgba(251,191,36,0.15)",
                color: "#fcd34d",
                fontSize: 13,
                fontWeight: 500,
                padding: "6px 12px",
              }}
            >
              ⚡ {domStructure.badgeText}
            </span>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton>⧉</IconButton>
            <IconButton>🔖</IconButton>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            position: "absolute",
            top: HEADER_HEIGHT,
            bottom: INPUT_BAR_HEIGHT,
            left: 0,
            right: 0,
            padding: "28px 48px",
            overflow: "hidden",
          }}
        >
          <h3 style={{ color: "#fff", fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
            {domStructure.headerTitle}
          </h3>
          <div
            style={{ color: "rgba(255,255,255,0.7)", fontSize: 16, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: domStructure.contentHtml || "" }}
          />
        </div>

        {/* Input bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: INPUT_BAR_HEIGHT,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 16,
              padding: "12px 16px",
              height: 52,
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.92)", fontSize: 15 }}>{typedInputText}</span>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 999,
                background: "#6366f1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              ↑
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255,255,255,0.5)",
        fontSize: 14,
      }}
    >
      {children}
    </div>
  );
}
