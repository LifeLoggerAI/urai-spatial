import type { SpatialSettings } from "./spatialSettingsTypes";
import { createDefaultSpatialSettings } from "./spatialSettingsTypes";

const SPATIAL_SETTINGS_KEY = "urai.spatial.settings.v1";

export function readSpatialSettings(): SpatialSettings {
  if (typeof window === "undefined") return createDefaultSpatialSettings();

  try {
    const raw = window.localStorage.getItem(SPATIAL_SETTINGS_KEY);
    if (!raw) return createDefaultSpatialSettings();
    const parsed = JSON.parse(raw) as SpatialSettings;
    return parsed;
  } catch {
    return createDefaultSpatialSettings();
  }
}

export function writeSpatialSettings(settings: SpatialSettings): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      SPATIAL_SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch {}
}

export function clearSpatialSettings(): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(SPATIAL_SETTINGS_KEY);
  } catch {}
}
