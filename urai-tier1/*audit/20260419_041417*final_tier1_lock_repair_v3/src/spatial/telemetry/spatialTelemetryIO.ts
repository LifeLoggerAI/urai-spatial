const SPATIAL_TELEMETRY_KEY = "urai.spatial.telemetry.v1";
const SPATIAL_TELEMETRY_LIMIT = 200;

export type SpatialTelemetryEvent = {
  id?: string;
  type?: string;
  createdAt?: string;
  [key: string]: any;
};

export function readSpatialTelemetry(): SpatialTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SPATIAL_TELEMETRY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as SpatialTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

export function writeSpatialTelemetry(events: SpatialTelemetryEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SPATIAL_TELEMETRY_KEY,
      JSON.stringify(events.slice(-SPATIAL_TELEMETRY_LIMIT)),
    );
  } catch {}
}

export function appendSpatialTelemetry(event: SpatialTelemetryEvent): SpatialTelemetryEvent[] {
  const events = readSpatialTelemetry();
  const next = [...events, event].slice(-SPATIAL_TELEMETRY_LIMIT);
  writeSpatialTelemetry(next);
  return next;
}

export function clearSpatialTelemetry(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SPATIAL_TELEMETRY_KEY);
  } catch {}
}
