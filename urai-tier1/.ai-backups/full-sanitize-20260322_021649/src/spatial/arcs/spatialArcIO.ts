import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  SPATIAL_ARC_MAX_ITEMS,
  SPATIAL_ARC_STORAGE_KEY,
  createDefaultSpatialArcManifest,
  type SpatialArcManifest,
} from "@/spatial/arcs/spatialArcTypes";

export function readSpatialArcManifest(): SpatialArcManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialArcManifest();
  }

  try {
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_ARC_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialArcManifest();

    const parsed = JSON.parse(raw) as SpatialArcManifest;
    if (parsed?.schema !== "urai.spatial.arc.v1") {
      return createDefaultSpatialArcManifest();
    }

    const arcs = Array.isArray(parsed.arcs)
      ? parsed.arcs.slice(-SPATIAL_ARC_MAX_ITEMS)
      : [];

    const activeArcId = arcs.some((item) => item.id === parsed.activeArcId)
      ? parsed.activeArcId
      : arcs[0]?.id ?? null;

    return {
      schema: "urai.spatial.arc.v1",
      activeArcId,
      arcs,
    };
  } catch (_err) {
    return createDefaultSpatialArcManifest();
  }
}

export function writeSpatialArcManifest(
  manifest: SpatialArcManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const arcs = manifest.arcs.slice(-SPATIAL_ARC_MAX_ITEMS);
    const activeArcId = arcs.some((item) => item.id === manifest.activeArcId)
      ? manifest.activeArcId
      : arcs[0]?.id ?? null;

    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_ARC_STORAGE_KEY),
      JSON.stringify({
        schema: "urai.spatial.arc.v1",
        activeArcId,
        arcs,
      }),
    );
  } catch (_err) {}
}
