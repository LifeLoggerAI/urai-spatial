
"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckStability } from "@/spatial/curation/buildSpatialCuratedDeckStability";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckStabilityPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const vaultEntries = useMemo<SpatialCuratedDeckVaultEntry[]>(
    () =>
      entries.map((entry) => ({
        ...(entry as Record<string, unknown>),
        label:
          (entry as { label?: string }).label ??
          (entry as { title?: string }).title ??
          (entry as { name?: string }).name ??
          String((entry as { id?: string }).id ?? "entry"),
        storedAt: new Date((entry as any).storedAt ?? 0).toISOString()
          (entry as { storedAt?: string | number | Date | null }).storedAt ??
          new Date(0).toISOString(),
        source:
          (entry as { source?: string }).source ??
          "panel",
        deck:
          (entry as { deck?: any }).deck ??
          entry,
      })) as SpatialCuratedDeckVaultEntry[],
    [entries],
  );

  const stability = useMemo(
    () => buildSpatialCuratedDeckStability({ entries: vaultEntries, activeEntryId }),
    [vaultEntries, activeEntryId],
  );
  const bandLabel =
    stability.stabilityBand === "stable"
      ? "Stable"
      : stability.stabilityBand === "watch"
        ? "Watch"
        : "Volatile";

  return (
    <div
      style={{
        position: "fixed",
        left: 24,
        top: 84,
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
        Curated Deck Stability
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {stability.stabilityScore}
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
        {stability.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="sides" value={String(stability.comparedSides)} />
        <MetricChip label="source" value={String(stability.sourceChangedCount)} />
        <MetricChip label="first" value={String(stability.firstCardChangedCount)} />
        <MetricChip label="scene" value={String(stability.sceneModeShiftTotal)} />
        <MetricChip label="star" value={String(stability.selectedStarShiftTotal)} />
        <MetricChip label="Δ cards" value={String(stability.cardDeltaMagnitude)} />
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
