"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckDestructionExecutionGate } from "@/spatial/curation/buildSpatialCuratedDeckDestructionExecutionGate";
import type {
  SpatialCuratedDeckDestructionExecutionGateCheck,
  SpatialCuratedDeckDestructionExecutionGateSignal,
} from "@/spatial/curation/spatialCuratedDeckDestructionAuthorizationTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";

export default function SpatialCuratedDeckDestructionExecutionGatePanel() {
  const activeEntryId = useSpatialCuratedDeckVaultStore((s) => s.activeEntryId);
  const entries = useSpatialCuratedDeckVaultStore((s) => s.entries);

  const authorization = useMemo(
    () => buildSpatialCuratedDeckDestructionExecutionGate({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  const activeSignals = useMemo(
    () => authorization.signals.filter((signal) => signal.active).slice(0, 2),
    [authorization.signals],
  );

  const requiredChecks = useMemo(
    () => authorization.checks.filter((check) => check.required).slice(0, 2),
    [authorization.checks],
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 1040,
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
        Curated Deck Destruction Execution Gate
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {authorization.authorizationScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {authorization.authorization}
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
        {authorization.operatorText}
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
        {authorization.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="path" value={authorization.destructionPath} />
        <MetricChip label="evidence" value={authorization.evidenceState} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {activeSignals.map((signal) => (
          <DestructionAuthorizationSignalRow key={signal.id} signal={signal} />
        ))}
        {requiredChecks.map((check) => (
          <DestructionAuthorizationCheckRow key={check.id} check={check} />
        ))}
        {activeSignals.length === 0 && requiredChecks.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No active destruction-authorization items for the selected curated deck vault entry.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DestructionAuthorizationSignalRow(input: {
  signal: SpatialCuratedDeckDestructionExecutionGateSignal;
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
          auth signal
        </span>
        <span style={{ opacity: 0.72 }}>{input.signal.strength}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.signal.label}
      </div>
    </div>
  );
}

function DestructionAuthorizationCheckRow(input: {
  check: SpatialCuratedDeckDestructionExecutionGateCheck;
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
          auth check
        </span>
        <span style={{ opacity: 0.72 }}>{input.check.status}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.check.label}
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
