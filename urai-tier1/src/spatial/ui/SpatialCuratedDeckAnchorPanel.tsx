"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckAnchor } from "@/spatial/curation/buildSpatialCuratedDeckAnchor";
import type { SpatialCuratedDeckDiff } from "@/spatial/curation/spatialCuratedDeckDiffTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckAnchorPanel() {
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
          (entry as { deck?: unknown }).deck ??
          entry,
      })) as SpatialCuratedDeckVaultEntry[],
    [entries],
  );

  const anchor = useMemo(
    () => buildSpatialCuratedDeckAnchor({ entries: vaultEntries, activeEntryId }),
    [vaultEntries, activeEntryId],
  );
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: 292,
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
        Curated Deck Anchor
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
        {anchor.summaryText}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <AnchorCard
          title="account anchor → active"
          diff={anchor.accountAnchorDiff}
          span={anchor.accountAnchorDistance}
          emptyText="Active entry is already the account anchor or no account anchor exists."
        />
        <AnchorCard
          title="source anchor → active"
          diff={anchor.sourceAnchorDiff}
          span={anchor.sourceAnchorDistance}
          emptyText="Active entry is already the source anchor or no source anchor exists."
        />
      </div>
    </div>
  );
}

function AnchorCard(input: {
  title: string;
  diff: SpatialCuratedDeckDiff | null;
  span: number;
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
        <MetricChip label="span" value={String(input.span)} />
        <MetricChip label="Δ cards" value={diff ? String(diff.cardCountDelta) : "n/a"} />
        <MetricChip label="scene" value={diff ? String(diff.sceneModeShiftCount) : "n/a"} />
        <MetricChip label="star" value={diff ? String(diff.selectedStarShiftCount) : "n/a"} />
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
