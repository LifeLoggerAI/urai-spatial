"use client";

import { useCallback } from "react";
import { useSceneStore } from "../state/sceneStore";

type RollbackPoint = {
  createdAt: string;
  channel: string | null;
  sceneMode: string | null;
  selectedStarId: string | null;
  snapshot: unknown;
};

type ReleaseWindow = Window & {
  __URAI_SPATIAL_RELEASE_POINTS__?: RollbackPoint[];
};

function getSelectedStarId(selectedStar: unknown): string | null {
  if (typeof selectedStar === "string" && selectedStar.trim().length > 0) {
    return selectedStar;
  }

  if (
    selectedStar &&
    typeof selectedStar === "object" &&
    "id" in selectedStar &&
    typeof (selectedStar as { id?: unknown }).id === "string"
  ) {
    const id = (selectedStar as { id: string }).id;
    return id.trim().length > 0 ? id : null;
  }

  return null;
}

function appendRollbackPoint(point: RollbackPoint): void {
  if (typeof window === "undefined") return;

  const target = window as ReleaseWindow;
  if (!Array.isArray(target.__URAI_SPATIAL_RELEASE_POINTS__)) {
    target.__URAI_SPATIAL_RELEASE_POINTS__ = [];
  }

  target.__URAI_SPATIAL_RELEASE_POINTS__.push(point);
}

export default function SpatialReleasePanel() {
  const mode = useSceneStore((s: any) => s.mode ?? null);
  const selectedStar = useSceneStore((s: any) => s.selectedStar ?? null);

  const activeChannel =
    typeof process !== "undefined" && process.env.NODE_ENV === "production"
      ? "production"
      : "development";

  const handleCreateRollbackPoint = useCallback(() => {
    const snapshot =
      typeof window !== "undefined"
        ? (window as Window & { __URAI_SPATIAL_PERSISTENCE__?: unknown })
            .__URAI_SPATIAL_PERSISTENCE__ ?? null
        : null;

    const point: RollbackPoint = {
      createdAt: new Date().toISOString(),
      channel: activeChannel,
      sceneMode: typeof mode === "string" ? mode : null,
      selectedStarId: getSelectedStarId(selectedStar),
      snapshot,
    };

    appendRollbackPoint(point);
  }, [activeChannel, mode, selectedStar]);

  return (
    <div className="pointer-events-auto absolute bottom-4 right-4 z-40">
      <button
        type="button"
        onClick={handleCreateRollbackPoint}
        className="rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white/90 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:bg-black/55"
      >
        Save Rollback Point
      </button>
    </div>
  );
}
