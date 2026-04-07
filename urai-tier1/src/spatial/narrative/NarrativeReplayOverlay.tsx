
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveNarrativeReplayById } from "@/spatial/narrative/resolveNarrativeReplay";

export default function NarrativeReplayOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const narrative = useMemo(
    () => resolveNarrativeReplayById(selectedStarId),
    [selectedStarId]
  );

  if (mode !== "replay" || !selectedStarId || !narrative) return null;

  const tone = narrative.tone ?? "rgba(255,255,255,0.9)";

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(560px, calc(100vw - 32px))",
        padding: 20,
        borderRadius: 20,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.72), rgba(7,10,18,0.88))",
        boxShadow: "0 20px 70px rgba(0,0,0,0.30)",
        backdropFilter: "blur(14px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 26,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          opacity: 0.64,
          marginBottom: 8,
        }}
      >
        Narrative Replay
      </div>

      <div
        style={{
          width: 72,
          height: 2,
          borderRadius: 999,
          background: tone,
          opacity: 0.95,
          marginBottom: 14,
        }}
      />

      <div
        style={{
          fontSize: 30,
          lineHeight: 1.04,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {narrative.title}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.4,
          opacity: 0.72,
          marginBottom: 12,
        }}
      >
        {narrative.kicker}
      </div>

      <div
        style={{
          fontSize: 15,
          lineHeight: 1.65,
          opacity: 0.9,
          marginBottom: 12,
        }}
      >
        {narrative.line}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.5,
          opacity: 0.62,
          marginBottom: narrative.chips.length > 0 ? 14 : 0,
        }}
      >
        {narrative.detail}
      </div>

      {narrative.chips.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {narrative.chips.map((chip) => (
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
