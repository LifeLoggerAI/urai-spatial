"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckNeighborDiff } from "@/spatial/curation/buildSpatialCuratedDeckNeighborDiff";
import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckNeighborDiffPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const summary = useMemo(
    () => buildSpatialCuratedDeckNeighborDiff({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 372,
        zIndex: 80,
        width: 340,
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
        Curated Deck Neighbor Diff
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
        {summary.summaryText}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <DiffCard
          title="previous → active"
          diff={summary.previousToActive}
          emptyText="Need a previous vault entry to compare into the active entry."
        />
        <DiffCard
          title="active → next"
          diff={summary.activeToNext}
          emptyText="Need a next vault entry to compare beyond the active entry."
        />
      </div>
    </div>
  );
}

function DiffCard(input: {
  title: string;
  diff: SpatialCuratedDeckDiff | null;
  emptyText: string;
}) {
  const diff = input.diff;

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
          fontSize: 11,
          lineHeight: 1.2,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          opacity: 0.68,
          marginBottom: 6,
        }}
      >
        {input.title}
      </div>

      <div
        style={{
          fontSize: 11,
          lineHeight: 1.45,
          opacity: 0.76,
          marginBottom: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {diff ? diff.summaryText : input.emptyText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="Δ cards" value={diff ? String(diff.cardCountDelta) : "n/a"} />
        <MetricChip
          label="scene"
          value={diff ? String(diff.sceneModeShiftCount) : "n/a"}
        />
        <MetricChip
          label="star"
          value={diff ? String(diff.selectedStarShiftCount) : "n/a"}
        />
        <MetricChip
          label="source"
          value={diff ? (diff.sourceChanged ? "changed" : "stable") : "n/a"}
        />
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
