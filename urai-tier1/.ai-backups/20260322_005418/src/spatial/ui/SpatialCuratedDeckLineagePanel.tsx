"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckLineage } from "@/spatial/curation/buildSpatialCuratedDeckLineage";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckLineagePanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const lineage = useMemo(
    () => buildSpatialCuratedDeckLineage({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        bottom: 84,
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
        Curated Deck Lineage
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
        {lineage.summaryText}
      </div>

      {lineage.nodes.length === 0 ? (
        <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
          Need curated deck vault entries to derive lineage.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {lineage.nodes.map((node) => (
            <div
              key={node.id}
              style={{
                borderRadius: 12,
                border: node.isActive
                  ? "1px solid rgba(255,255,255,0.26)"
                  : "1px solid rgba(255,255,255,0.10)",
                background: node.isActive
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(255,255,255,0.03)",
                padding: 10,
              }}
            >
              <div style={positionRowStyle}>
                <span style={{ opacity: 0.68, textTransform: "uppercase", letterSpacing: 0.8 }}>
                  {node.position}
                </span>
                <span style={{ opacity: 0.72 }}>{node.id.slice(0, 8)}</span>
              </div>

              <div
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  opacity: 0.94,
                  marginBottom: 6,
                }}
              >
                {node.label}
              </div>

              <div style={chipRowStyle}>
                <MetricChip label="source" value={node.source} />
                <MetricChip label="account" value={node.accountId} />
                <MetricChip label="cards" value={String(node.cardCount)} />
              </div>
            </div>
          ))}
        </div>
      )}
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

const positionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 11,
  lineHeight: 1.2,
  marginBottom: 6,
};

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
