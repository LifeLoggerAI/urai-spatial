
"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckChangeLedger } from "@/spatial/curation/buildSpatialCuratedDeckChangeLedger";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckChangeLedgerPanel() {
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

  const ledger = useMemo(
    () => buildSpatialCuratedDeckChangeLedger({ entries: vaultEntries }),
    [entries],
  );

  const rows = useMemo(
    () => [...ledger.rows].reverse().slice(0, 6),
    [ledger.rows],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 360,
        bottom: 84,
        zIndex: 80,
        width: 332,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,12,24,0.78)",
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
        Curated Deck Change Ledger
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76, marginBottom: 10 }}>
        recent vault transitions: {ledger.rowCount}
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
          Need at least two curated deck vault entries to derive a change ledger.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row) => {
            const isActiveTarget = row.targetEntryId === activeEntryId;
            return (
              <div
                key={row.id}
                style={{
                  borderRadius: 12,
                  border: isActiveTarget
                    ? "1px solid rgba(255,255,255,0.26)"
                    : "1px solid rgba(255,255,255,0.10)",
                  background: isActiveTarget
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(255,255,255,0.03)",
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    lineHeight: 1.35,
                    opacity: 0.92,
                    marginBottom: 4,
                  }}
                >
                  {row.label}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    lineHeight: 1.45,
                    opacity: 0.74,
                    marginBottom: 6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {row.summaryText}
                </div>

                <div style={chipRowStyle}>
                  <MetricChip label="Δ cards" value={String(row.cardCountDelta)} />
                  <MetricChip label="scene" value={String(row.sceneModeShiftCount)} />
                  <MetricChip label="star" value={String(row.selectedStarShiftCount)} />
                </div>
              </div>
            );
          })}
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
