"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveEraCompareById } from "@/spatial/era/resolveEraCompare";

export default function EraCompareOverlay() {
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const state = useMemo(
    () => resolveEraCompareById(selectedStar ?? undefined),
    [selectedStar]
  );

  if (!selectedStar || !state) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: 24,
        bottom: 24,
        width: "min(440px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 47,
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
        Era Compare
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
        <span>{state.compareBasis}</span>
        <span>{state.readiness}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.55,
          opacity: 0.86,
          marginBottom: state.compareTargetTitle ? 12 : 0,
        }}
      >
        {state.summary}
      </div>

      {state.compareTargetTitle ? (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.5,
            opacity: 0.74,
            marginBottom: 12,
          }}
        >
          compare target · {state.compareTargetTitle}
        </div>
      ) : null}

      {state.similarities.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
            marginBottom: state.differences.length > 0 ? 12 : 0,
          }}
        >
          {state.similarities.map((item) => (
            <div
              key={item}
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                opacity: 0.74,
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

      {state.differences.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {state.differences.map((item) => (
            <div
              key={item}
              style={{
                fontSize: 12,
                lineHeight: 1.5,
                opacity: 0.74,
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
