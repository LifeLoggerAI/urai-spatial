import { getSpatialScopedStorageKey } from "@/spatial/account/accountScopedStorage";
import {
  SPATIAL_SEASONAL_ARC_MAX_ITEMS,
  SPATIAL_SEASONAL_ARC_STORAGE_KEY,
  createDefaultSpatialSeasonalArcManifest,
  type SpatialSeasonalArcManifest,
} from "@/spatial/seasonal/spatialSeasonalArcTypes";

export function readSpatialSeasonalArcManifest(): SpatialSeasonalArcManifest {
  if (typeof window === "undefined") {
    return createDefaultSpatialSeasonalArcManifest();
  }

  try {
    const raw = window.localStorage.getItem(
      getSpatialScopedStorageKey(SPATIAL_SEASONAL_ARC_STORAGE_KEY),
    );
    if (!raw) return createDefaultSpatialSeasonalArcManifest();

    const parsed = JSON.parse(raw) as SpatialSeasonalArcManifest;
    if (parsed?.schema !== "urai.spatial.seasonal-arc.v1") {
      return createDefaultSpatialSeasonalArcManifest();
    }

    const seasonalArcs = Array.isArray(parsed.seasonalArcs)
      ? parsed.seasonalArcs.slice(-SPATIAL_SEASONAL_ARC_MAX_ITEMS)
      : [];

    const activeSeasonalArcId = seasonalArcs.some(
      (item) => item.id === parsed.activeSeasonalArcId,
    )
      ? parsed.activeSeasonalArcId
      : seasonalArcs[0]?.id ?? null;

    return {
      schema: "urai.spatial.seasonal-arc.v1",
      activeSeasonalArcId,
      seasonalArcs,
    };
  } catch (_err) {
    return createDefaultSpatialSeasonalArcManifest();
  }
}

export function writeSpatialSeasonalArcManifest(
  manifest: SpatialSeasonalArcManifest,
): void {
  if (typeof window === "undefined") return;

  try {
    const seasonalArcs = manifest.seasonalArcs.slice(-SPATIAL_SEASONAL_ARC_MAX_ITEMS);
    const activeSeasonalArcId = seasonalArcs.some(
      (item) => item.id === manifest.activeSeasonalArcId,
    )
      ? manifest.activeSeasonalArcId
      : seasonalArcs[0]?.id ?? null;

    window.localStorage.setItem(
      getSpatialScopedStorageKey(SPATIAL_SEASONAL_ARC_STORAGE_KEY),
      JSON.stringify({
        schema: "urai.spatial.seasonal-arc.v1",
        activeSeasonalArcId,
        seasonalArcs,
      }),
    );
  } catch (_err) {}
}
