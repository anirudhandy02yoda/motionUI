import React from "react";

interface CursorLayerProps {
  x: number;
  y: number;
  opacity: number;
  rippleOpacity: number;
  rippleScale: number;
  tooltipOpacity: number;
  tooltipText: string;
}

export default function CursorLayer({
  x,
  y,
  opacity,
  rippleOpacity,
  rippleScale,
  tooltipOpacity,
  tooltipText,
}: CursorLayerProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity,
        zIndex: 30,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -36,
          left: 12,
          opacity: tooltipOpacity,
          whiteSpace: "nowrap",
          background: "#fff",
          color: "#000",
          fontSize: 12,
          fontWeight: 500,
          borderRadius: 6,
          padding: "4px 8px",
          boxShadow: "0 4px 10px rgba(0,0,0,0.35)",
        }}
      >
        {tooltipText}
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 32,
          height: 32,
          transform: `translate(-50%, -50%) scale(${rippleScale})`,
          borderRadius: "50%",
          border: "2px solid #818cf8",
          opacity: rippleOpacity,
        }}
      />
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
          transform: "translate(-3px, -2px)",
        }}
      >
        <path
          d="M4 2 L4 20 L9 15.5 L12.5 22 L15.5 20.5 L12 14 L19 14 Z"
          fill="#fff"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
