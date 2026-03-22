import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  SPATIAL_COMPARE_MAX_SETS,
  SPATIAL_COMPARE_STORAGE_KEY,
  createDefaultSpatialCompareManifest,
  type SpatialCompareManifest,
  type SpatialCompareSet,
} from "@/spatial/compare/spatialCompareTypes";

export function readSpatialCompareManifest(): SpatialCompareManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialCompareManifest();
  }

  try {
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_COMPARE_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialCompareManifest();

    const parsed = JSON.parse(raw) as SpatialCompareManifest;
    if (parsed?.schema !== "urai.spatial.compare.v1") {
      return createDefaultSpatialCompareManifest();
    }

    return {
      schema: "urai.spatial.compare.v1",
      sets: Array.isArray(parsed.sets)
        ? parsed.sets.slice(-SPATIAL_COMPARE_MAX_SETS)
        : [],
    };
  } catch (_err) {
    return createDefaultSpatialCompareManifest();
  }
}

export function writeSpatialCompareManifest(
  manifest: SpatialCompareManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_COMPARE_STORAGE_KEY),
      JSON.stringify({
        schema: "urai.spatial.compare.v1",
        sets: manifest.sets.slice(-SPATIAL_COMPARE_MAX_SETS),
      }),
    );
  } catch (_err) {}
}

export function appendSpatialCompareSet(
  manifest: SpatialCompareManifest,
  compareSet: SpatialCompareSet,
): SpatialCompareManifest {
  return {
    schema: "urai.spatial.compare.v1",
    sets: [...manifest.sets, compareSet].slice(-SPATIAL_COMPARE_MAX_SETS),
  };
}
