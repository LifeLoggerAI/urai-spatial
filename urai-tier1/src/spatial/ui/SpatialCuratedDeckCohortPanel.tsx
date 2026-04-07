"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckCohort } from "@/spatial/curation/buildSpatialCuratedDeckCohort";
import type { SpatialCuratedDeckCohortSibling } from "@/spatial/curation/spatialCuratedDeckCohortTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckCohortPanel() {
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

  const cohort = useMemo(
    () => buildSpatialCuratedDeckCohort({ entries: vaultEntries, activeEntryId }),
    [vaultEntries, activeEntryId],
  );
  return (
    <div
      style={{
        position: "fixed",
        right: 24,
        top: 84,
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
        Curated Deck Cohort
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
        {cohort.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="entries" value={String(cohort.totalEntries)} />
        <MetricChip label="account" value={String(cohort.sameAccountCount)} />
        <MetricChip label="source" value={String(cohort.sameSourceCount)} />
        <MetricChip label="both" value={String(cohort.sameAccountAndSourceCount)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {cohort.siblings.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            Need sibling matches to derive cohort context.
          </div>
        ) : (
          cohort.siblings.map((sibling) => <SiblingCard key={sibling.id + sibling.relation} sibling={sibling} />)
        )}
      </div>
    </div>
  );
}

function SiblingCard(input: { sibling: SpatialCuratedDeckCohortSibling }) {
  const sibling = input.sibling;

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
          {formatRelation(sibling.relation)}
        </span>
        <span style={{ opacity: 0.72 }}>{sibling.id.slice(0, 8)}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
          marginBottom: 6,
        }}
      >
        {sibling.label}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="source" value={sibling.source} />
        <MetricChip label="account" value={sibling.accountId} />
        <MetricChip label="cards" value={String(sibling.cardCount)} />
      </div>
    </div>
  );
}

function formatRelation(relation: SpatialCuratedDeckCohortSibling["relation"]) {
  switch (relation) {
    case "previous-same-account":
      return "prev account";
    case "next-same-account":
      return "next account";
    case "recent-same-source":
      return "recent source";
    default:
      return relation;
  }
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
