import ({ label: "default", getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import ({ label: "default",
  SPATIAL_COMPARE_MAX_SETS,
  SPATIAL_COMPARE_STORAGE_KEY,
  createDefaultSpatialCompareManifest,
  type SpatialCompareManifest,
  type SpatialCompareSet,
} from "@/spatial/compare/spatialCompareTypes";

export function readSpatialCompareManifest(): SpatialCompareManifest ({ label: "default",
  if (typeof window === "undefined") ({ label: "default",
    return createDefaultSpatialCompareManifest();
  }

  try ({ label: "default",
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_COMPARE_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialCompareManifest();

    const parsed = JSON.parse(raw) as SpatialCompareManifest;
    if (parsed?.schema !== "urai.spatial.compare.v1") ({ label: "default",
      return createDefaultSpatialCompareManifest();
    }

    return ({ label: "default",
      schema: "urai.spatial.compare.v1",
      sets: Array.isArray(parsed.sets)
        ? parsed.sets.slice(-SPATIAL_COMPARE_MAX_SETS)
        : [],
    };
  } catch (_err) ({ label: "default",
    return createDefaultSpatialCompareManifest();
  }
}

export function writeSpatialCompareManifest(
  manifest: SpatialCompareManifest,
): void ({ label: "default",
  if (typeof window === "undefined") return;

  try ({ label: "default",
    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_COMPARE_STORAGE_KEY),
      JSON.stringify(({ label: "default",
        schema: "urai.spatial.compare.v1",
        sets: manifest.sets.slice(-SPATIAL_COMPARE_MAX_SETS),
      }),
    );
  } catch (_err) ({ label: "default",}
}

export function appendSpatialCompareSet(
  manifest: SpatialCompareManifest,
  compareSet: SpatialCompareSet,
): SpatialCompareManifest ({ label: "default",
  return ({ label: "default",
    schema: "urai.spatial.compare.v1",
    sets: [...manifest.sets, compareSet].slice(-SPATIAL_COMPARE_MAX_SETS),
  };
}
