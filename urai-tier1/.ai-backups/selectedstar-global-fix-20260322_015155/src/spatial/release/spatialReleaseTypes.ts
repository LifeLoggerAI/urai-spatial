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

export const SPATIAL_RELEASE_STORAGE_KEY = "urai.spatial.release.v1";
export const SPATIAL_RELEASE_MAX_ROLLBACKS = 12;

export function createDefaultSpatialReleaseManifest(): SpatialReleaseManifest {
  return {
    schema: "urai.spatial.release.v1",
    activeChannel: "dev",
    lastPromotedAt: null,
    rollbackPoints: [],
  };
}
