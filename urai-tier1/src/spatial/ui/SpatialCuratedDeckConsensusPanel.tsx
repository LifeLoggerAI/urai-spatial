"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckConsensus } from "@/spatial/curation/buildSpatialCuratedDeckConsensus";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckConsensusPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const consensus = useMemo(
    () => buildSpatialCuratedDeckConsensus({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 360,
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
        Curated Deck Consensus
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
        {consensus.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="cohort" value={String(consensus.cohortSize)} />
        <MetricChip label="avg cards" value={String(consensus.averageCardCount)} />
        <MetricChip label="Δ cards" value={String(consensus.cardCountDeltaFromAverage)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <ConsensusRow
          label="dominant source"
          value={consensus.dominantSource ?? "n/a"}
          status={consensus.activeMatchesDominantSource ? "match" : "drift"}
        />
        <ConsensusRow
          label="common first card"
          value={consensus.commonFirstCardEntryId ?? "n/a"}
          status={consensus.activeMatchesCommonFirstCard ? "match" : "drift"}
        />
        <ConsensusRow
          label="dominant first scene"
          value={consensus.dominantFirstSceneMode ?? "n/a"}
          status={consensus.activeMatchesDominantFirstSceneMode ? "match" : "drift"}
        />
      </div>
    </div>
  );
}

function ConsensusRow(input: {
  label: string;
  value: string;
  status: "match" | "drift";
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
          {input.label}
        </span>
        <span style={{ opacity: 0.72 }}>{input.status}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.value}
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
