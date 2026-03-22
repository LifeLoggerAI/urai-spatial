"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckDispatch } from "@/spatial/curation/buildSpatialCuratedDeckDispatch";
import type { SpatialCuratedDeckDispatchTask } from "@/spatial/curation/spatialCuratedDeckDispatchTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckDispatchPanel() {
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

  const dispatch = useMemo(
    () => buildSpatialCuratedDeckDispatch({ entries: vaultEntries, activeEntryId }),
    [vaultEntries, activeEntryId],
  );
  const requiredTasks = useMemo(
    () => dispatch.tasks.filter((task) => task.required).slice(0, 4),
    [dispatch.tasks],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 24,
        top: 500,
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
        Curated Deck Dispatch
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {dispatch.dispatchScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {dispatch.dispatchLane}
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
        {dispatch.handoffText}
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
        {dispatch.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="owner" value={dispatch.dispatchOwner} />
        <MetricChip label="tasks" value={String(dispatch.requiredTaskCount)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {requiredTasks.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No required dispatch tasks for the selected curated deck vault entry.
          </div>
        ) : (
          requiredTasks.map((task) => <DispatchTaskRow key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

function DispatchTaskRow(input: { task: SpatialCuratedDeckDispatchTask }) {
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
          dispatch task
        </span>
        <span style={{ opacity: 0.72 }}>{input.task.lane}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.task.label}
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
