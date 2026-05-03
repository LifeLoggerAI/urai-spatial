
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { resolveXRBridgeStateById } from "@/spatial/xr/resolveXRBridgeState";

export default function XRBridgeOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const xr = useMemo(
    () => resolveXRBridgeStateById(selectedStarId ?? "", mode),
    [selectedStarId, mode]
  );

  if (!selectedStarId || !xr) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        width: "min(360px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.80), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 29,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.66,
          marginBottom: 8,
        }}
      >
        {xr.modeLabel}
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {xr.title}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 12,
        }}
      >
        {xr.summary}
      </div>

      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.05)",
          fontSize: 11,
          lineHeight: 1,
          marginBottom: xr.channels.length > 0 ? 12 : 0,
          opacity: 0.86,
        }}
      >
        <span>readiness</span>
        <span>{xr.readiness}</span>
      </div>

      {xr.anchor ? (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            opacity: 0.70,
            marginBottom: 10,
          }}
        >
          anchor · {xr.anchor}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {xr.channels.map((channel) => (
          <span
            key={channel}
            style={{
              fontSize: 11,
              lineHeight: 1,
              padding: "7px 9px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              opacity: 0.84,
            }}
          >
            {channel}
          </span>
        ))}
      </div>
    </div>
  );
}
