import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useSceneStore } from "@/spatial/state/sceneStore";

type LooseRecord = Record<string, unknown>;

function color(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default function SpatialPolishOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const accent = color(
    undefined,
    mode === "replay" ? "rgba(255,220,160,0.30)" : "rgba(255,255,255,0.18)"
  );

  const topGlow = mode === "replay" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.035)";
  const edgeShadow = mode === "replay" ? "rgba(0,0,0,0.44)" : "rgba(0,0,0,0.34)";
  const bottomWeight = mode === "replay" ? "rgba(4,8,18,0.30)" : "rgba(4,8,18,0.22)";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 4,
          background: [
            `radial-gradient(circle at 50% 42%, ${accent} 0%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0.0) 54%)`,
            `linear-gradient(180deg, ${topGlow} 0%, rgba(255,255,255,0.0) 18%)`,
            `linear-gradient(180deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.02) 48%, ${bottomWeight} 100%)`,
          ].join(", "),
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
          boxShadow: `inset 0 0 140px ${edgeShadow}`,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: -120,
          width: "min(78vw, 980px)",
          height: 260,
          transform: "translateX(-50%)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 6,
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, rgba(120,160,255,0.05) 28%, rgba(0,0,0,0) 72%)",
          opacity: mode === "replay" ? 0.85 : 0.65,
          filter: "blur(18px)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 18,
          right: 22,
          padding: "8px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(8,12,20,0.34)",
          color: "rgba(255,255,255,0.74)",
          fontSize: 10,
          lineHeight: 1,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          pointerEvents: "none",
          zIndex: 7,
          backdropFilter: "blur(10px)",
        }}
      >
        {mode === "replay" ? "Replay Scene" : "Spatial Polish"}
      </div>
    </>
  );
}
