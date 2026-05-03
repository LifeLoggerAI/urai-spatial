
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useSceneStore } from "@/spatial/store/useSceneStore";

type LooseRecord = Record<string, unknown>;

function color(value: any, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export default function SpatialPolishOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const accent = color(
    undefined,
    mode === "REPLAY" ? "rgba(255,220,160,0.30)" : "rgba(255,255,255,0.18)"
  );

  const topGlow = mode === "REPLAY" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.035)";
  const edgeShadow = mode === "REPLAY" ? "rgba(0,0,0,0.44)" : "rgba(0,0,0,0.34)";
  const bottomWeight = mode === "REPLAY" ? "rgba(4,8,18,0.30)" : "rgba(4,8,18,0.22)";

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 4,
          background: [
          ].join(", "),
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 5,
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
          opacity: mode === "REPLAY" ? 0.85 : 0.65,
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
        {mode === "REPLAY" ? "Replay Scene" : "Spatial Polish"}
      </div>
    </>
  );
}
