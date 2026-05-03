import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
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


export function createSpatialTelemetryEvent(input: {
  name: SpatialTelemetryEventName;
  payload: Record<string, string | number | boolean | null>;
}): SpatialTelemetryEvent {
  return {
    schema: "urai.spatial.telemetry.v1",
    id:
      "evt_" +
      uraiRandom().toString(36).slice(2) +
      "_" +
      uraiNow().toString(36),
    at: new Date().toISOString(),
    name: input.name,
    payload: input.payload,
  };
}
