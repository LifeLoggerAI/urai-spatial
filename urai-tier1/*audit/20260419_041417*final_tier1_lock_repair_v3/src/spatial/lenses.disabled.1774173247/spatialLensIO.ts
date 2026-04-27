import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  createDefaultSpatialLensManifest,
  type SpatialLensManifest,
} from "@/spatial/lenses/spatialLensTypes";

export function readSpatialLensManifest(): SpatialLensManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialLensManifest();
  }

  try {
    const raw = window.localStorage.getItem(
    );
    if (!raw) return createDefaultSpatialLensManifest();

    const parsed = JSON.parse(raw) as SpatialLensManifest;
    if (parsed?.schema !== "urai.spatial.lens.v1") {
      return createDefaultSpatialLensManifest();
    }

    const lenses = Array.isArray(parsed.lenses)
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
    const activeLensId = lenses.some((item) => item.id === manifest.activeLensId)
      ? manifest.activeLensId
      : lenses[0]?.id ?? null;

    window.localStorage.setItem(
      JSON.stringify({
        schema: "urai.spatial.lens.v1",
        activeLensId,
        lenses,
      }),
    );
  } catch (_err) {}
}
