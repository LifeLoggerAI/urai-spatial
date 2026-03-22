"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveCinematicReplayById } from "@/spatial/cinematic/resolveCinematicReplay";

function pulseOpacity(pulse: "low" | "medium" | "high"): number {
  if (pulse === "high") return 0.96;
  if (pulse === "low") return 0.72;
  return 0.84;
}

export default function CinematicReplayOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const cinematic = useMemo(
    () => resolveCinematicReplayById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (mode !== "replay" || !selectedStarId || !cinematic) return null;

  const accent = cinematic.accent ?? "rgba(255,255,255,0.88)";

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        top: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 28,
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
        {cinematic.sceneLabel}
      </div>

      <div
        style={{
          width: 72,
          height: 2,
          borderRadius: 999,
          background: accent,
          opacity: pulseOpacity(cinematic.pulse),
          marginBottom: 12,
        }}
      />

      <div
        style={{
          fontSize: 24,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {cinematic.beatTitle}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.58,
          opacity: 0.88,
          marginBottom: 10,
        }}
      >
        {cinematic.beatLine}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.68,
          marginBottom: 8,
        }}
      >
        {cinematic.stageLine}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.74,
          marginBottom: cinematic.chips.length > 0 ? 12 : 0,
        }}
      >
        {cinematic.cueLine}
      </div>

      {cinematic.chips.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {cinematic.chips.map((chip) => (
            <span
              key={chip}
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
              {chip}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
