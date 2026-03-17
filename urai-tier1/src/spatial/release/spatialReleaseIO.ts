import {
  SPATIAL_RELEASE_MAX_ROLLBACKS,
  SPATIAL_RELEASE_STORAGE_KEY,
  createDefaultSpatialReleaseManifest,
  type SpatialReleaseManifest,
  type SpatialRollbackPoint,
} from "@/spatial/release/spatialReleaseTypes";

export function readSpatialReleaseManifest(): SpatialReleaseManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialReleaseManifest();
  }

  try {
    const raw = window.localStorage.getItem(SPATIAL_RELEASE_STORAGE_KEY);
    if (!raw) return createDefaultSpatialReleaseManifest();
    const parsed = JSON.parse(raw) as SpatialReleaseManifest;
    if (parsed?.schema !== "urai.spatial.release.v1") {
      return createDefaultSpatialReleaseManifest();
    }
    return {
      ...createDefaultSpatialReleaseManifest(),
      ...parsed,
      schema: "urai.spatial.release.v1",
      rollbackPoints: Array.isArray(parsed.rollbackPoints)
        ? parsed.rollbackPoints.slice(-SPATIAL_RELEASE_MAX_ROLLBACKS)
        : [],
    };
  } catch (_err) {
    return createDefaultSpatialReleaseManifest();
  }
}

export function writeSpatialReleaseManifest(
  manifest: SpatialReleaseManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SPATIAL_RELEASE_STORAGE_KEY,
      JSON.stringify({
        ...manifest,
        rollbackPoints: manifest.rollbackPoints.slice(
          -SPATIAL_RELEASE_MAX_ROLLBACKS,
        ),
      }),
    );
  } catch (_err) {}
}

export function appendSpatialRollbackPoint(
  manifest: SpatialReleaseManifest,
  point: SpatialRollbackPoint,
): SpatialReleaseManifest {
  return {
    ...manifest,
    rollbackPoints: [...manifest.rollbackPoints, point].slice(
      -SPATIAL_RELEASE_MAX_ROLLBACKS,
    ),
  };
}
