"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckVerdict } from "@/spatial/curation/buildSpatialCuratedDeckVerdict";
import type { SpatialCuratedDeckVerdictReason } from "@/spatial/curation/spatialCuratedDeckVerdictTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckVerdictPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const verdict = useMemo(
    () => buildSpatialCuratedDeckVerdict({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  const bandLabel =
    verdict.verdictBand === "nominal"
      ? "Nominal"
      : verdict.verdictBand === "monitor"
        ? "Monitor"
        : "Investigate";

  const activeReasons = useMemo(
    () => verdict.reasons.filter((reason) => reason.active).slice(0, 4),
    [verdict.reasons],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 696,
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
        Curated Deck Verdict
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {verdict.verdictScore}
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
          marginBottom: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {verdict.summaryText}
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.92,
          marginBottom: 10,
        }}
      >
        primary: {verdict.primaryReason}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="reasons" value={String(verdict.activeReasonCount)} />
        <MetricChip label="entries" value={String(verdict.totalEntries)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {activeReasons.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No active verdict reasons for the selected curated deck vault entry.
          </div>
        ) : (
          activeReasons.map((reason) => <ReasonRow key={reason.id} reason={reason} />)
        )}
      </div>
    </div>
  );
}

function ReasonRow(input: { reason: SpatialCuratedDeckVerdictReason }) {
  const { reason } = input;
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
          verdict reason
        </span>
        <span style={{ opacity: 0.72 }}>{reason.weight}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {reason.label}
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
