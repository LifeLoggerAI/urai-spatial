"use client";

import { useMemo } from "react";
import { buildSpatialCuratedDeckExpiryGovernance } from "@/spatial/curation/buildSpatialCuratedDeckExpiryGovernance";
import { useSpatialCurationBoardStore } from "@/spatial/curation/spatialCurationBoardStore";

function tone(status: "pass" | "warn" | "fail") {
  if (status === "pass") return "rgba(110,231,183,0.95)";
  if (status === "warn") return "rgba(251,191,36,0.95)";
  return "rgba(248,113,113,0.95)";
}

export default function SpatialCuratedDeckExpiryGovernancePanel() {
  const entries = useSpatialCurationBoardStore((s) => s.entries);
  const activeEntryId = useSpatialCurationBoardStore((s) => s.activeEntryId);

  const summary = useMemo(
    () => buildSpatialCuratedDeckExpiryGovernance({ entries, activeEntryId }),
    [entries, activeEntryId],
  );

  const active =
    summary.entries.find((entry) => entry.entryId === summary.activeEntryId) ??
    summary.entries[0] ??
    null;

  if (!active) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: 24,
        width: 320,
        borderRadius: 18,
        padding: 14,
        color: "rgba(255,255,255,0.96)",
        background: "rgba(8,10,18,0.82)",
        border: "1px solid rgba(255,255,255,0.10)",
        backdropFilter: "blur(14px)",
        zIndex: 30,
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.72, marginBottom: 6 }}>Curated Deck</div>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Expiry Governance</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 10, opacity: 0.7 }}>active</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.statusCounts.active}</div>
        </div>
        <div style={{ borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 10, opacity: 0.7 }}>review</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.statusCounts.review}</div>
        </div>
        <div style={{ borderRadius: 12, padding: 10, background: "rgba(255,255,255,0.04)" }}>
          <div style={{ fontSize: 10, opacity: 0.7 }}>expired</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.statusCounts.expired}</div>
        </div>
      </div>

      <div style={{ fontSize: 12, opacity: 0.82, marginBottom: 8 }}>{active.title}</div>

      <div style={{ display: "grid", gap: 8 }}>
        {active.checks.map((check) => (
          <div
            key={check.id}
            style={{
              borderRadius: 12,
              padding: 10,
              background: "rgba(255,255,255,0.035)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
              <div style={{ fontSize: 12 }}>{check.label}</div>
              <div style={{ fontSize: 11, color: tone(check.status), textTransform: "uppercase" }}>{check.status}</div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.72 }}>{check.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
