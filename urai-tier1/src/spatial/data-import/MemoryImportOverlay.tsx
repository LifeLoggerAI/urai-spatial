"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { buildMemoryImportReport } from "@/spatial/data-import/buildMemoryImportReport";
import { resolveMemoryImportStateById } from "@/spatial/data-import/resolveMemoryImportState";

export default function MemoryImportOverlay() {
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const state = useMemo(
    () => resolveMemoryImportStateById(selectedStar?.id),
    [selectedStar]
  );

  const report = useMemo(
    () => buildMemoryImportReport(),
    []
  );

  if (!selectedStar || !state) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 38,
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
        Data Import Pipeline
      </div>

      <div
        style={{
          fontSize: 20,
          lineHeight: 1.08,
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {state.title}
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
        <span>readiness</span>
        <span>{state.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: 12,
        }}
      >
        {state.summary}
      </div>

      <div
        style={{
          display: "grid",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.78 }}>nodes · {report.totalNodes}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>chapters · {report.uniqueChapters}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>timebands · {report.uniqueTimebands}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>emotions · {report.uniqueEmotions}</div>
      </div>

      {state.dominantSignals.length > 0 ? (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: state.gaps.length > 0 ? 12 : 0,
          }}
        >
          {state.dominantSignals.map((signal) => (
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

      {state.gaps.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {state.gaps.map((gap) => (
            <div
              key={gap}
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
              {gap}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
