"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useSpatialArcStore } from "@/spatial/arcs/spatialArcStore";

export default function SpatialArcPanel() {
  const activeArcId = useSpatialArcStore((s) => s.activeArcId);
  const arcs = useSpatialArcStore((s) => s.arcs);
  const setActiveArcId = useSpatialArcStore((s) => s.setActiveArcId);

  const activeIndex = useMemo(
    () => Math.max(
      0,
      arcs.findIndex((item) => item.id === activeArcId),
    ),
    [arcs, activeArcId],
  );

  const activeArc = arcs[activeIndex] ?? null;

  const cycle = (direction: -1 | 1) => {
    if (arcs.length === 0) return;
    const nextIndex = (activeIndex + direction + arcs.length) % arcs.length;
    const next = arcs[nextIndex];
    if (next) setActiveArcId(next.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 500,
        zIndex: 68,
        width: 322,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.80)",
        backdropFilter: "blur(14px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
        padding: 14,
        color: "rgba(255,255,255,0.92)",
        fontFamily: "inherit",
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: 1.1,
          textTransform: "uppercase",
          opacity: 0.68,
          marginBottom: 8,
        }}
      >
        Multi-Arc Detection
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => cycle(-1)} style={buttonStyle}>
          Previous
        </button>
        <button type="button" onClick={() => cycle(1)} style={buttonStyle}>
          Next
        </button>
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        active arc: {activeArc ? activeArc.label : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        kind: {"n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        intensity: {"n/a"}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.82,
        }}
      >
        {"No arc summary available."}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  flex: 1,
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 12,
  padding: "9px 10px",
  cursor: "pointer",
};
