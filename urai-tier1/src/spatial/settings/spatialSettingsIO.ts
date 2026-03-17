import {
  SPATIAL_SETTINGS_STORAGE_KEY,
  createDefaultSpatialSettings,
  type SpatialSettings,
} from "@/spatial/settings/spatialSettingsTypes";

export function readSpatialSettings(): SpatialSettings {
  if (typeof window === "undefined") {
    return createDefaultSpatialSettings();
  }

  try {
    const raw = window.localStorage.getItem(SPATIAL_SETTINGS_STORAGE_KEY);
    if (!raw) return createDefaultSpatialSettings();
    const parsed = JSON.parse(raw) as SpatialSettings;
    if (parsed?.schema !== "urai.spatial.settings.v1") {
      return createDefaultSpatialSettings();
    }
    return {
      ...createDefaultSpatialSettings(),
      ...parsed,
      schema: "urai.spatial.settings.v1",
    };
  } catch (_err) {
    return createDefaultSpatialSettings();
  }
}

export function writeSpatialSettings(settings: SpatialSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SPATIAL_SETTINGS_STORAGE_KEY,
      JSON.stringify(settings),
    );
  } catch (_err) {}
}
