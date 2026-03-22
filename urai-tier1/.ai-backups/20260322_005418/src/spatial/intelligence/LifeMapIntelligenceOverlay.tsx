"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveLifeMapIntelligenceById } from "@/spatial/intelligence/resolveLifeMapIntelligence";

export default function LifeMapIntelligenceOverlay() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const intel = useMemo(
    () => resolveLifeMapIntelligenceById(selectedStar ?? undefined),
    [selectedStar]
  );

  if (!selectedStar || !intel) return null;
  if (mode === "replay") return null;

  const accent = intel.accent ?? "rgba(255,255,255,0.88)";

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(480px, calc(100vw - 32px))",
        padding: 18,
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.84), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 25,
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
        LifeMap Intelligence
      </div>

      <div
        style={{
          width: 72,
          height: 2,
          borderRadius: 999,
          background: accent,
          opacity: 0.94,
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
        {intel.title}
      </div>

      <div
        style={{
          fontSize: 14,
          lineHeight: 1.56,
          opacity: 0.88,
          marginBottom: 10,
        }}
      >
        {intel.summary}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.74,
          marginBottom: 12,
        }}
      >
        {intel.insight}
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
          marginBottom: intel.signals.length > 0 ? 12 : 14,
          opacity: 0.86,
        }}
      >
        <span>pattern score</span>
        <span>{intel.score}</span>
      </div>

      {intel.signals.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: intel.hypotheses.length > 0 ? 12 : 0,
          }}
        >
          {intel.signals.map((signal) => (
            <span
              key={signal}
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
              {signal}
            </span>
          ))}
        </div>
      ) : null}

      {intel.hypotheses.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {intel.hypotheses.map((item) => (
            <div
              key={item}
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                opacity: 0.72,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
