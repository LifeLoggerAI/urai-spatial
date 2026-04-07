
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolvePersistenceSyncStateById } from "@/spatial/persistence/resolvePersistenceSyncState";

export default function PersistenceSyncOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolvePersistenceSyncStateById(selectedStarId),
    [selectedStarId]
  );

  if (!selectedStarId || !state) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        bottom: 24,
        width: "min(430px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 42,
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
        Persistence Sync
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
          marginBottom: state.queuePreview.length > 0 ? 12 : 0,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.78 }}>writes · {state.writeCount}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>inserts · {state.insertCount}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>updates · {state.updateCount}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>skips · {state.skipCount}</div>
      </div>

      {state.queuePreview.length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {state.queuePreview.map((item) => (
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
