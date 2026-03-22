"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import { buildSpatialCompareSet } from "@/spatial/compare/buildSpatialCompareSet";
import { readSpatialCompareManifest, appendSpatialCompareSet, writeSpatialCompareManifest } from "@/spatial/compare/spatialCompareIO";
import { useSpatialCompareStore } from "@/spatial/compare/spatialCompareStore";
import { readSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";
import { readSpatialReleaseManifest } from "@/spatial/release/spatialReleaseIO";

export default function SpatialComparePanel() {
  const sets = useSpatialCompareStore((s) => s.sets);
  const replaceManifest = useSpatialCompareStore((s) => s.replaceManifest);

  const latestSet = useMemo(
    () => (sets.length > 0 ? sets[sets.length - 1] : null),
    [sets],
  );

  const createFromCurrentAndLatestRollback = () => {
    const current = readSpatialPersistenceSnapshot();
    const releaseManifest = readSpatialReleaseManifest();
    const latestRollback =
      releaseManifest.rollbackPoints.length > 0
        ? releaseManifest.rollbackPoints[releaseManifest.rollbackPoints.length - 1]
        : null;

    if (!current || !latestRollback?.snapshot) return;

    const compareSet = buildSpatialCompareSet({
      label: `compare ${sets.length + 1}`,
      baselineLabel: latestRollback.label,
      baselineSnapshot: latestRollback.snapshot,
      targetLabel: "current persistence",
      targetSnapshot: current,
    });

    const manifest = readSpatialCompareManifest();
    const next = appendSpatialCompareSet(manifest, compareSet);
    writeSpatialCompareManifest(next);
    replaceManifest(next);
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 150,
        zIndex: 64,
        width: 312,
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
        Long-Range Compare
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88, marginBottom: 10 }}>
        saved compare sets: {sets.length}
      </div>

      <button
        type="button"
        onClick={createFromCurrentAndLatestRollback}
        style={buttonStyle}
      >
        Create current vs latest rollback
      </button>

      <div style={{ marginTop: 12, fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        latest set: {latestSet ? latestSet.label : "none"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        scene mode changed: {latestSet ? (latestSet.summary.sceneModeChanged ? "yes" : "no") : "n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        selected star changed: {latestSet ? (latestSet.summary.selectedStarChanged ? "yes" : "no") : "n/a"}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.76 }}>
        locomotion distance: {latestSet ? latestSet.summary.locomotionDistance : "n/a"}
      </div>
    </div>
  );
}

const buttonStyle: CSSProperties = {
  appearance: "none",
  width: "100%",
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: 12,
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  fontSize: 13,
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
};
