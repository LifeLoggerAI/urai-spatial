"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckReopenWatch } from "@/spatial/curation/buildSpatialCuratedDeckReopenWatch";
import type { SpatialCuratedDeckReopenWatchTrigger } from "@/spatial/curation/spatialCuratedDeckReopenWatchTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckReopenWatchPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const reopenWatch = useMemo(
    () => buildSpatialCuratedDeckReopenWatch({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  const activeTriggers = useMemo(
    () => reopenWatch.triggers.filter((trigger) => trigger.active).slice(0, 4),
    [reopenWatch.triggers],
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 84,
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
        Curated Deck Reopen Watch
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {reopenWatch.reopenScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {reopenWatch.reopenState}
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.92,
          marginBottom: 8,
        }}
      >
        {reopenWatch.operatorText}
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
        {reopenWatch.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="mode" value={reopenWatch.watchMode} />
        <MetricChip label="path" value={reopenWatch.reentryPath} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {activeTriggers.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No active reopen-watch triggers for the selected curated deck vault entry.
          </div>
        ) : (
          activeTriggers.map((trigger) => (
            <ReopenWatchTriggerRow key={trigger.id} trigger={trigger} />
          ))
        )}
      </div>
    </div>
  );
}

function ReopenWatchTriggerRow(input: {
  trigger: SpatialCuratedDeckReopenWatchTrigger;
}) {
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
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          fontSize: 11,
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        <span style={{ opacity: 0.68, textTransform: "uppercase", letterSpacing: 0.8 }}>
          reopen trigger
        </span>
        <span style={{ opacity: 0.72 }}>{input.trigger.severity}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.trigger.label}
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
