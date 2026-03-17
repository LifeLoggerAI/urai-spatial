export type SpatialTelemetryEventName =
  | "scene_mode_changed"
  | "selected_star_changed"
  | "xr_presenting_changed"
  | "ar_plane_visibility_changed"
  | "locomotion_activity_changed";

export type SpatialTelemetryEvent = {
  schema: "urai.spatial.telemetry.v1";
  id: string;
  at: string;
  name: SpatialTelemetryEventName;
  payload: Record<string, string | number | boolean | null>;
};

export const SPATIAL_TELEMETRY_STORAGE_KEY = "urai.spatial.telemetry.queue.v1";
export const SPATIAL_TELEMETRY_MAX_EVENTS = 250;

export function createSpatialTelemetryEvent(input: {
  name: SpatialTelemetryEventName;
  payload: Record<string, string | number | boolean | null>;
}): SpatialTelemetryEvent {
  return {
    schema: "urai.spatial.telemetry.v1",
    id:
      "evt_" +
      Math.random().toString(36).slice(2) +
      "_" +
      Date.now().toString(36),
    at: new Date().toISOString(),
    name: input.name,
    payload: input.payload,
  };
}
