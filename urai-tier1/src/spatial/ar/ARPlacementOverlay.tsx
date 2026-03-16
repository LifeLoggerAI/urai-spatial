"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveARPlacementStateById } from "@/spatial/ar/resolveARPlacementState";

export default function ARPlacementOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const ar = useMemo(
    () => resolveARPlacementStateById(selectedStar?.id, mode),
    [selectedStar, mode]
  );

  if (!selectedStar || !ar) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: "min(400px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 34,
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
        AR Placement
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {ar.title}
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
        <span>{ar.placementMode}</span>
        <span>{ar.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: 8,
        }}
      >
        anchor · {ar.anchorLabel}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 8,
        }}
      >
        {ar.surfaceHint}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.74,
          marginBottom: 8,
        }}
      >
        {ar.distanceHint}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.74,
          marginBottom: 12,
        }}
      >
        {ar.stabilityHint}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        {ar.channels.map((item) => (
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
