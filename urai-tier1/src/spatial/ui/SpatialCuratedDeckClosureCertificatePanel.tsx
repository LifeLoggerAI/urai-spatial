"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCuratedDeckClosureCertificate } from "@/spatial/curation/buildSpatialCuratedDeckClosureCertificate";
import type {
  SpatialCuratedDeckClosureCertificateBlocker,
  SpatialCuratedDeckClosureCertificateCheck,
} from "@/spatial/curation/spatialCuratedDeckClosureCertificateTypes";
import { useSpatialCuratedDeckVaultStore } from "@/spatial/curation/spatialCuratedDeckVaultStore";
import type { SpatialCuratedDeckVaultEntry } from "@/spatial/curation/spatialCuratedDeckVaultTypes";

export default function SpatialCuratedDeckClosureCertificatePanel() {
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

  const certificate = useMemo(
    () => buildSpatialCuratedDeckClosureCertificate({ entries: vaultEntries, activeEntryId }),
    [entries, activeEntryId],
  );

  const activeBlockers = useMemo(
    () => certificate.blockers.filter((blocker) => blocker.active).slice(0, 2),
    [certificate.blockers],
  );

  const requiredChecks = useMemo(
    () => certificate.checks.filter((check) => check.required).slice(0, 2),
    [certificate.checks],
  );

  return (
    <div
      style={{
        position: "fixed",
        right: 360,
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
        Curated Deck Closure Certificate
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1, fontWeight: 600 }}>
          {certificate.closureScore}
        </div>
        <div style={{ fontSize: 12, lineHeight: 1.2, opacity: 0.74 }}>
          {certificate.closureDecision}
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
        {certificate.operatorText}
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
        {certificate.summaryText}
      </div>

      <div style={chipRowStyle}>
        <MetricChip label="state" value={certificate.certificateState} />
        <MetricChip label="checks" value={String(certificate.requiredCheckCount)} />
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {activeBlockers.map((blocker) => (
          <ClosureBlockerRow key={blocker.id} blocker={blocker} />
        ))}
        {requiredChecks.map((check) => (
          <ClosureCheckRow key={check.id} check={check} />
        ))}
        {activeBlockers.length === 0 && requiredChecks.length === 0 ? (
          <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.82 }}>
            No active closure-certificate items for the selected curated deck vault entry.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ClosureBlockerRow(input: {
  blocker: SpatialCuratedDeckClosureCertificateBlocker;
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
          blocker
        </span>
        <span style={{ opacity: 0.72 }}>{input.blocker.severity}</span>
      </div>

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.4,
          opacity: 0.94,
        }}
      >
        {input.blocker.label}
      </div>
    </div>
  );
}

function ClosureCheckRow(input: {
  check: SpatialCuratedDeckClosureCertificateCheck;
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
          certificate check
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
