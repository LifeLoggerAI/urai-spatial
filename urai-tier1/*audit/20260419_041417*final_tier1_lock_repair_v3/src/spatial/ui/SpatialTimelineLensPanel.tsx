"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useSpatialLensStore } from "@/spatial/lenses/spatialLensStore";

export default function SpatialTimelineLensPanel() {
  const activeLensId = useSpatialLensStore((s) => s.activeLensId);
  const lenses = useSpatialLensStore((s) => s.lenses);
  const setActiveLensId = useSpatialLensStore((s) => s.setActiveLensId);

  const activeIndex = useMemo(
    () => Math.max(
      0,
      lenses.findIndex((item) => item.id === activeLensId),
    ),
    [lenses, activeLensId],
  );

  const activeLens = lenses[activeIndex] ?? null;

  const cycle = (direction: -1 | 1) => {
    if (lenses.length === 0) return;
    const nextIndex = (activeIndex + direction + lenses.length) % lenses.length;
    const next = lenses[nextIndex];
    if (next) setActiveLensId(next.id);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 320,
        zIndex: 65,
        width: 320,
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
        Timeline Lenses
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
        active lens: {activeLens ? activeLens.label : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        source: {activeLens ? activeLens.source : "n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        focus: {activeLens ? activeLens.focus : "n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        baseline: {activeLens?.baselineLabel ?? "n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        target: {activeLens?.targetLabel ?? "n/a"}
      </div>
      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.82,
        }}
      >
        {activeLens ? activeLens.summary : "No lens summary available."}
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
