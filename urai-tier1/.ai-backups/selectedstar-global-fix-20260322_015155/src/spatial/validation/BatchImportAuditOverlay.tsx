"use client";

import { useMemo } from "react";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { resolveBatchImportAuditStateById } from "@/spatial/validation/resolveBatchImportAuditState";

export default function BatchImportAuditOverlay() {
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const state = useMemo(
    () => resolveBatchImportAuditStateById(selectedStarId ?? undefined),
    [selectedStarId]
  );

  if (!selectedStarId || !state) return null;

  return (
    <div
      style={{
        position: "absolute",
        left: 24,
        top: 24,
        width: "min(420px, calc(100vw - 32px))",
        padding: 16,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "linear-gradient(180deg, rgba(9,12,22,0.82), rgba(7,10,18,0.92))",
        boxShadow: "0 18px 60px rgba(0,0,0,0.32)",
        backdropFilter: "blur(12px)",
        color: "rgba(255,255,255,0.95)",
        zIndex: 40,
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
        Batch Import Audit
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
          marginBottom: (state.warnings.length > 0 || state.duplicateIds.length > 0 || state.lowSignalRows.length > 0) ? 12 : 0,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.78 }}>total rows · {state.totalRows}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>valid rows · {state.validRows}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>duplicate ids · {state.duplicateIds.length}</div>
        <div style={{ fontSize: 12, opacity: 0.78 }}>low-signal rows · {state.lowSignalRows.length}</div>
      </div>

      {[...state.warnings, ...state.duplicateIds.map((id) => `duplicate id: ${id}`), ...state.lowSignalRows.map((id) => `weak row: ${id}`)].length > 0 ? (
        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {[...state.warnings, ...state.duplicateIds.map((id) => `duplicate id: ${id}`), ...state.lowSignalRows.map((id) => `weak row: ${id}`)].map((item) => (
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
