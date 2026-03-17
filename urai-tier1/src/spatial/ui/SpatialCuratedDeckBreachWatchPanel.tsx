"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckBreachWatch } from "@/spatial/curation/buildSpatialCuratedDeckBreachWatch";
import type {
  SpatialCuratedDeckBreachWatchMitigation,
  SpatialCuratedDeckBreachWatchTrigger,
} from "@/spatial/curation/spatialCuratedDeckBreachWatchTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckBreachWatchPanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const breachWatch = useMemo(
    () => buildSpatialCuratedDeckBreachWatch({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  const activeTriggers = useMemo(
    () => breachWatch.triggers.filter((trigger) => trigger.active).slice(0, 3),
    [breachWatch.triggers],
  );

  const requiredMitigations = useMemo(
    () => breachWatch.mitigations.filter((item) => item.required).slice(0, 3),
    [breachWatch.mitigations],
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 360,
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
        Curated Deck Breach Watch
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {breachWatch.breachWatchScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {breachWatch.watchBand}
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
        {breachWatch.operatorText}
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
        {breachWatch.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="risk" value={breachWatch.breachLikelihood} />
        <MetricChip label="triggers" value={String(breachWatch.activeTriggerCount)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {activeTriggers.map((trigger) => (
          <TriggerRow key={trigger.id} trigger={trigger} />
        ))}
        {requiredMitigations.map((mitigation) => (
          <MitigationRow key={mitigation.id} mitigation={mitigation} />
        ))}
        {activeTriggers.length === 0 && requiredMitigations.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No active breach-watch items for the selected curated deck vault entry.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TriggerRow(input: { trigger: SpatialCuratedDeckBreachWatchTrigger }) {
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
          breach trigger
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

function MitigationRow(input: { mitigation: SpatialCuratedDeckBreachWatchMitigation }) {
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
          mitigation
        </span>
        <span style={{ opacity: 0.72 }}>{input.mitigation.urgency}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.mitigation.label}
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
