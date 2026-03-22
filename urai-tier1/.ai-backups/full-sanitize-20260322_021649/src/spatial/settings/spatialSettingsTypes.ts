export type SpatialSettings = {
  schema: "urai.spatial.settings.v1";
  reducedMotion: boolean;
  showImportExport: boolean;
  telemetryEnabled: boolean;
  showTelemetryPanel: boolean;
  persistSnapshots: boolean;
};

export const SPATIAL_SETTINGS_STORAGE_KEY = "urai.spatial.settings.v1";

export function createDefaultSpatialSettings(): SpatialSettings {
  return {
    schema: "urai.spatial.settings.v1",
    reducedMotion: false,
    showImportExport: true,
    telemetryEnabled: true,
    showTelemetryPanel: false,
    persistSnapshots: true,
  };
}
