"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckDrift } from "@/spatial/curation/buildSpatialCuratedDeckDrift";
import type { SpatialCuratedDeckDriftStep } from "@/spatial/curation/spatialCuratedDeckDriftTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckDriftPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const drift = useMemo(
    () => buildSpatialCuratedDeckDrift({ entries, activeEntryId, windowSize: 4 }),
    [entries, activeEntryId],
  );

  const bandLabel =
    drift.driftBand === "calm"
      ? "Calm"
      : drift.driftBand === "shifting"
        ? "Shifting"
        : "Drifting";

  const recentSteps = useMemo(
    () => [...drift.steps].reverse().slice(0, 3),
    [drift.steps],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 24,
        top: 292,
        zIndex: 80,
        width: 332,
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
        Curated Deck Drift
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {drift.driftScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {bandLabel}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.78,
          marginBottom: 10,
          whiteSpace: "pre-wrap",
        }}
      >
        {drift.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="steps" value={String(drift.stepCount)} />
        <MetricChip label="source" value={String(drift.sourceChangedCount)} />
        <MetricChip label="first" value={String(drift.firstCardChangedCount)} />
        <MetricChip label="scene" value={String(drift.sceneModeShiftTotal)} />
        <MetricChip label="star" value={String(drift.selectedStarShiftTotal)} />
        <MetricChip label="Δ cards" value={String(drift.cardDeltaMagnitude)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {recentSteps.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            Need multiple same-account entries to derive drift.
          </div>
        ) : (
          recentSteps.map((step) => <DriftStepCard key={step.id} step={step} />)
        )}
      </div>
    </div>
  );
}

function DriftStepCard(input: { step: SpatialCuratedDeckDriftStep }) {
  const step = input.step;

  return (
    <div
      style={{
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 10,
      }}
    >
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.92,
          marginBottom: 6,
        }}
      >
        {step.label}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="Δ cards" value={String(step.cardCountDelta)} />
        <MetricChip label="scene" value={String(step.sceneModeShiftCount)} />
        <MetricChip label="star" value={String(step.selectedStarShiftCount)} />
        <MetricChip label="source" value={step.sourceChanged ? "changed" : "stable"} />
      </div>
    </div>
  );
}

function MetricChip(input: { label: string; value: string }) {
  return (
    <div style={chipStyle}>
      <span style={{ opacity: 0.66 }}>{input.label}</span>
      <span>{input.value}</span>
    </div>
  );
}

const chipRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.04)",
  fontSize: 11,
  lineHeight: 1,
};
