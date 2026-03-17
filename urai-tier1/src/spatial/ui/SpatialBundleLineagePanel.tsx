"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialBundleLineage } from "@/spatial/lineage/buildSpatialBundleLineage";
import { useSpatialStoryBundleVaultStore } from "@/spatial/vault/spatialStoryBundleVaultStore";

export default function SpatialBundleLineagePanel() {
  const activeEntryId = useSpatialStoryBundleVaultStore((s) => s.activeEntryId);
  const entries = useSpatialStoryBundleVaultStore((s) => s.entries);

  const graph = useMemo(
    () =>
      buildSpatialBundleLineage({
        entries,
        activeEntryId,
      }),
    [entries, activeEntryId],
  );

  const activeIndex = useMemo(
    () =>
      Math.max(
        0,
        entries.findIndex((item) => item.id === activeEntryId),
      ),
    [entries, activeEntryId],
  );

  const previousEntry =
    entries.length > 1 ? entries[Math.max(0, activeIndex - 1)] : null;
  const activeEntry =
    entries.find((item) => item.id === activeEntryId) ?? null;
  const nextEntry =
    entries.length > activeIndex + 1 ? entries[activeIndex + 1] : null;

  const prevEdge = useMemo(
    () =>
      previousEntry && activeEntry
        ? graph.edges.find(
            (edge) =>
              edge.fromId === previousEntry.id && edge.toId === activeEntry.id,
          ) ?? null
        : null,
    [graph.edges, previousEntry, activeEntry],
  );

  const nextEdge = useMemo(
    () =>
      activeEntry && nextEntry
        ? graph.edges.find(
            (edge) =>
              edge.fromId === activeEntry.id && edge.toId === nextEntry.id,
          ) ?? null
        : null,
    [graph.edges, activeEntry, nextEntry],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        top: 150,
        zIndex: 74,
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
        Bundle Lineage
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88 }}>
        nodes: {graph.nodes.length}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        edges: {graph.edges.length}
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
        {graph.summaryText}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        <LineageBlock
          title="Previous"
          label={previousEntry?.label ?? "none"}
          detail={prevEdge?.summary ?? "n/a"}
        />
        <LineageBlock
          title="Active"
          label={activeEntry?.label ?? "none"}
          detail={activeEntry?.source ?? "n/a"}
        />
        <LineageBlock
          title="Next"
          label={nextEntry?.label ?? "none"}
          detail={nextEdge?.summary ?? "n/a"}
        />
      </div>
    </div>
  );
}

function LineageBlock(input: {
  title: string;
  label: string;
  detail: string;
}) {
  return (
    <div style={blockStyle}>
      <div style={{ fontSize: 11, opacity: 0.64, textTransform: "uppercase" }}>
        {input.title}
      </div>
      <div style={{ fontSize: 13, opacity: 0.9 }}>{input.label}</div>
      <div style={{ fontSize: 12, opacity: 0.74, lineHeight: 1.4 }}>
        {input.detail}
      </div>
    </div>
  );
}

const blockStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.04)",
  padding: 10,
};
