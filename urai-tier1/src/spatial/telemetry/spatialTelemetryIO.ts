import {
  SPATIAL_TELEMETRY_MAX_EVENTS,
  SPATIAL_TELEMETRY_STORAGE_KEY,
  type SpatialTelemetryEvent,
} from "@/spatial/telemetry/spatialTelemetryTypes";

export function readSpatialTelemetryQueue(): SpatialTelemetryEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SPATIAL_TELEMETRY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SpatialTelemetryEvent[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.schema === "urai.spatial.telemetry.v1");
  } catch (_err) {
    return [];
  }
}

export function writeSpatialTelemetryQueue(
  queue: SpatialTelemetryEvent[],
): void {
  if (typeof window === "undefined") return;

  try {
    const sliced = queue.slice(-SPATIAL_TELEMETRY_MAX_EVENTS);
    window.localStorage.setItem(
      SPATIAL_TELEMETRY_STORAGE_KEY,
      JSON.stringify(sliced),
    );
  } catch (_err) {}
}

export function appendSpatialTelemetryEvent(
  event: SpatialTelemetryEvent,
): SpatialTelemetryEvent[] {
  const next = [...readSpatialTelemetryQueue(), event];
  writeSpatialTelemetryQueue(next);
  return next.slice(-SPATIAL_TELEMETRY_MAX_EVENTS);
}
