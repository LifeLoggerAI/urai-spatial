const PRECISION = new Set(["coarse","fine"]);
const EVENT_TYPES = new Set(["snapshot","geofence_enter","geofence_exit","place_context"]);

function roundCoordinate(value, decimals) {
  const factor=10 ** decimals;
  return Math.round(Number(value)*factor)/factor;
}

export function normalizeLocationEvent(input) {
  if (input?.synthetic !== true) throw new Error("Prelaunch location events must be synthetic");
  if (!EVENT_TYPES.has(input.eventType)) throw new Error("unsupported location event");
  if (!PRECISION.has(input.permissionPrecision)) throw new Error("invalid location precision");
  if (!input.signalId || !input.subjectId || !input.observedAt) throw new Error("location identity required");
  if (!Array.isArray(input.permissionRefs) || input.permissionRefs.length===0) {
    throw new Error("location permission reference required");
  }

  const requested = input.permissionPrecision;
  const decimals = requested === "fine" ? 4 : 2;
  const coordinates = input.coordinates
    ? {
        latitude:roundCoordinate(input.coordinates.latitude,decimals),
        longitude:roundCoordinate(input.coordinates.longitude,decimals),
      }
    : null;

  return {
    version:"1.0.0",
    signalId:input.signalId,
    subjectId:input.subjectId,
    eventType:input.eventType,
    observedAt:input.observedAt,
    permissionPrecision:requested,
    permissionRefs:[...new Set(input.permissionRefs)].sort(),
    purpose:input.purpose ?? "user_context",
    coordinates,
    placeId:input.placeId ?? null,
    retention:input.retention ?? "session",
    onDeviceFiltered:true,
    synthetic:true,
    passiveStreamingAllowed:false,
  };
}

export function isStaleLocation(event, now, maxAgeMs=15*60*1000) {
  return Date.parse(now)-Date.parse(event.observedAt) > maxAgeMs;
}

export function revokeLocation(event, grantId) {
  if (!event.permissionRefs.includes(grantId)) return structuredClone(event);
  return {
    ...structuredClone(event),
    permissionRefs:[],
    coordinates:null,
    placeId:null,
    revoked:true,
    passiveStreamingAllowed:false,
  };
}
