import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveImmersiveContractById } from "@/spatial/immersive/resolveImmersiveContract";

export default function ImmersiveContractOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const contract = useMemo(
    () => resolveImmersiveContractById(resolveStarByIdSafe(selectedStarId), mode),
    [selectedStarId, mode]
  );

  if (!selectedStarId || !contract) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: "min(360px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.80), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 30,
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
        Immersive Contract
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {contract.title}
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
          marginBottom: 12,
          opacity: 0.86,
        }}
      >
        <span>{contract.adapter}</span>
        <span>{contract.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: 8,
        }}
      >
        anchor · {contract.anchorLabel}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: 12,
        }}
      >
        transport · {contract.transportLabel}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {contract.payload.map((item) => (
          <span
            key={item}
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
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
