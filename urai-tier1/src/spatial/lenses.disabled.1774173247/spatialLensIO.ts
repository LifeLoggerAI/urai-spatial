import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  SPATIAL_LENS_MAX_ITEMS,
  SPATIAL_LENS_STORAGE_KEY,
  createDefaultSpatialLensManifest,
  type SpatialLensManifest,
} from "@/spatial/lenses/spatialLensTypes";

export function readSpatialLensManifest(): SpatialLensManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialLensManifest();
  }

  try {
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_LENS_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialLensManifest();

    const parsed = JSON.parse(raw) as SpatialLensManifest;
    if (parsed?.schema !== "urai.spatial.lens.v1") {
      return createDefaultSpatialLensManifest();
    }

    const lenses = Array.isArray(parsed.lenses)
      ? parsed.lenses.slice(-SPATIAL_LENS_MAX_ITEMS)
      : createDefaultSpatialLensManifest().lenses;

    const activeLensId = lenses.some((item) => item.id === parsed.activeLensId)
      ? parsed.activeLensId
      : lenses[0]?.id ?? null;

    return {
      schema: "urai.spatial.lens.v1",
      activeLensId,
      lenses,
    };
  } catch (_err) {
    return createDefaultSpatialLensManifest();
  }
}

export function writeSpatialLensManifest(
  manifest: SpatialLensManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const lenses = manifest.lenses.slice(-SPATIAL_LENS_MAX_ITEMS);
    const activeLensId = lenses.some((item) => item.id === manifest.activeLensId)
      ? manifest.activeLensId
      : lenses[0]?.id ?? null;

    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_LENS_STORAGE_KEY),
      JSON.stringify({
        schema: "urai.spatial.lens.v1",
        activeLensId,
        lenses,
      }),
    );
  } catch (_err) {}
}
