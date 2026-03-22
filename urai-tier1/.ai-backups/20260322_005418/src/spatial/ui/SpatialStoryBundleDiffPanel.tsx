"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialStoryBundleDiff } from "@/spatial/diffs/buildSpatialStoryBundleDiff";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";

export default function SpatialStoryBundleDiffPanel() {
  const activeEntryId = useSpatialStoryBundleVaultStore((s) => s.activeEntryId);
  const entries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const activeIndex = useMemo(
    () =>
      Math.max(
        0,
        entries.findIndex((item) => item.id === activeEntryId),
      ),
    [entries, activeEntryId],
  );

  const activeEntry = entries[activeIndex] ?? null;
  const baselineEntry =
    entries.length > 1
      ? entries[Math.max(0, activeIndex - 1)]
      : null;

  const diff = useMemo(() => {
    if (!activeEntry || !baselineEntry || activeEntry.id === baselineEntry.id) {
      return null;
    }

    return buildSpatialStoryBundleDiff({
      base: baselineEntry,
      target: activeEntry,
    });
  }, [activeEntry, baselineEntry]);

  return (
    <div
      style={{
        position: "fixed",
        left: 1398,
        bottom: 190,
        zIndex: 73,
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
        Bundle Diff Explorer
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        baseline: {baselineEntry?.label ?? "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        target: {activeEntry?.label ?? "none"}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12,
          lineHeight: 1.45,
          opacity: 0.82,
          whiteSpace: "pre-wrap",
        }}
      >
        {diff ? diff.summaryText : "Need at least two vault entries to compare."}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        <MetricRow
          label="same account"
          value={diff ? (diff.sameAccount ? "yes" : "no") : "n/a"}
        />
        <MetricRow
          label="scene mode changed"
          value={diff ? (diff.sceneModeChanged ? "yes" : "no") : "n/a"}
        />
        <MetricRow
          label="selection changed"
          value={diff ? (diff.selectedStarChanged ? "yes" : "no") : "n/a"}
        />
        <MetricRow
          label="lens changed"
          value={diff ? (diff.lensChanged ? "yes" : "no") : "n/a"}
        />
        <MetricRow
          label="narrator changed"
          value={diff ? (diff.narratorChanged ? "yes" : "no") : "n/a"}
        />
        <MetricRow
          label="arc delta"
          value={diff ? String(diff.arcCountDelta) : "n/a"}
        />
        <MetricRow
          label="seasonal arc delta"
          value={diff ? String(diff.seasonalArcCountDelta) : "n/a"}
        />
        <MetricRow
          label="locomotion delta"
          value={diff ? String(diff.locomotionDistanceDelta) : "n/a"}
        />
      </div>
    </div>
  );
}

function MetricRow(input: { label: string; value: string }) {
  return (
    <div style={rowStyle}>
      <span>{input.label}</span>
      <span style={{ opacity: 0.72 }}>{input.value}</span>
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 12,
  lineHeight: 1.4,
};

