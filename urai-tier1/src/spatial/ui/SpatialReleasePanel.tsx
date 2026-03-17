"use client";

import { readSpatialPersistenceSnapshot, writeSpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceIO";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { useSpatialReleaseStore } from "@/spatial/release/spatialReleaseStore";
import type {
  SpatialReleaseChannel,
  SpatialRollbackPoint,
} from "@/spatial/release/spatialReleaseTypes";

type PersistenceWindow = Window & {
  __URAI_SPATIAL_PERSISTENCE__?: SpatialPersistenceSnapshot;
};

export default function SpatialReleasePanel() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const activeChannel = useSpatialReleaseStore((s) => s.activeChannel);
  const rollbackPoints = useSpatialReleaseStore((s) => s.rollbackPoints);
  const setActiveChannel = useSpatialReleaseStore((s) => s.setActiveChannel);
  const appendRollbackPoint = useSpatialReleaseStore((s) => s.appendRollbackPoint);

  const latest = rollbackPoints.length > 0 ? rollbackPoints[rollbackPoints.length - 1] : null;

  const promote = (channel: SpatialReleaseChannel) => {
    setActiveChannel(channel);
  };

  const createRollbackPoint = () => {
    const snapshot = readSpatialPersistenceSnapshot();
    const point: SpatialRollbackPoint = {
      id:
        "rb_" +
        Math.random().toString(36).slice(2) +
        "_" +
        Date.now().toString(36),
      at: new Date().toISOString(),
      label: `rollback ${rollbackPoints.length + 1}`,
      channel: activeChannel,
      sceneMode: mode,
      selectedStarId: selectedStar?.id ?? null,
      snapshot,
    };
    appendRollbackPoint(point);
  };

  const restoreLatest = () => {
    if (!latest?.snapshot) return;
    writeSpatialPersistenceSnapshot(latest.snapshot);
    const target = window as PersistenceWindow;
    target.__URAI_SPATIAL_PERSISTENCE__ = latest.snapshot;
    window.dispatchEvent(
      new CustomEvent("urai:spatial-rollback-restored", {
        detail: latest,
      }),
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 18,
        top: 18,
        zIndex: 62,
        width: 300,
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
        Release Discipline
      </div>

      <div style={{ fontSize: 13, lineHeight: 1.45, opacity: 0.88, marginBottom: 10 }}>
        channel: {activeChannel}
      </div>

      <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
        <button type="button" onClick={() => promote("dev")} style={buttonStyle}>
          Promote dev
        </button>
        <button type="button" onClick={() => promote("preview")} style={buttonStyle}>
          Promote preview
        </button>
        <button type="button" onClick={() => promote("stable")} style={buttonStyle}>
          Promote stable
        </button>
        <button type="button" onClick={createRollbackPoint} style={buttonStyle}>
          Create rollback point
        </button>
        <button type="button" onClick={restoreLatest} style={buttonStyle}>
          Restore latest rollback
        </button>
      </div>

      <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
        rollback points: {rollbackPoints.length}
      </div>
      <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
        latest: {latest ? latest.at : "none"}
      </div>
      <div style={{ fontSize: 12, opacity: 0.76, lineHeight: 1.45 }}>
        latest scene: {latest ? latest.sceneMode : "none"}
      </div>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
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
