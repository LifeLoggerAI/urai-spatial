
import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
import type { SpatialPersistenceSnapshot } from "@/spatial/persistence/spatialPersistenceTypes";

export type SpatialReleaseChannel = "dev" | "preview" | "stable";

export type SpatialRollbackPoint = {
  id: string;
  at: string;
  label: string;
  channel: SpatialReleaseChannel;
  sceneMode: string;
  selectedStarId: string | null;
  snapshot: SpatialPersistenceSnapshot | null;
};

export type SpatialReleaseManifest = {
  schema: "urai.spatial.release.v1";
  activeChannel: SpatialReleaseChannel;
  lastPromotedAt: string | null;
  rollbackPoints: SpatialRollbackPoint[];
};


export function createDefaultSpatialReleaseManifest(): SpatialReleaseManifest {
  return {
    schema: "urai.spatial.release.v1",
    activeChannel: "dev",
    lastPromotedAt: null,
    rollbackPoints: [],
  };
}
