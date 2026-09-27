const SIGNAL_TYPES = new Set(["sleep","steps","motion","energy"]);
const PERMITTED_PURPOSES = new Set(["personal_reflection","accessibility_adaptation","user_requested_summary"]);

export function normalizeWearableSignal(input) {
  if (input?.synthetic !== true) throw new Error("Prelaunch wearable signals must be synthetic");
  if (!SIGNAL_TYPES.has(input.type)) throw new Error("unsupported wearable signal type");
  if (!PERMITTED_PURPOSES.has(input.purpose)) throw new Error("unsupported wearable purpose");
  if (!input.subjectId || !input.signalId || !input.observedAt) throw new Error("signal identity required");
  if (!Array.isArray(input.permissionRefs) || input.permissionRefs.length === 0) {
    throw new Error("permission reference required");
  }

  const signal = {
    version:"1.0.0",
    signalId:input.signalId,
    subjectId:input.subjectId,
    type:input.type,
    observedAt:input.observedAt,
    purpose:input.purpose,
    permissionRefs:[...new Set(input.permissionRefs)].sort(),
    localProcessingPreferred:input.localProcessingPreferred !== false,
    retention:input.retention ?? "session",
    synthetic:true,
    provider:input.provider ?? "mock",
    value:structuredClone(input.value ?? {}),
    interpretation:null,
    clinicalMeaning:null,
  };

  if (!["none","session","bounded"].includes(signal.retention)) {
    throw new Error("invalid wearable retention");
  }
  return signal;
}

export function revokeWearableSignal(signal, grantId) {
  if (!signal.permissionRefs.includes(grantId)) return {...signal};
  return {
    ...structuredClone(signal),
    permissionRefs:signal.permissionRefs.filter((id)=>id!==grantId),
    revoked:true,
    value:{},
    interpretation:null,
    clinicalMeaning:null,
  };
}

export function wearableAvailability({ permission, providerAvailable }) {
  if (permission !== "granted") return {available:false,reason:"PERMISSION_NOT_GRANTED"};
  if (!providerAvailable) return {available:false,reason:"PROVIDER_UNAVAILABLE"};
  return {available:true,reason:"SYNTHETIC_READY_ONLY",realIngestionAllowed:false};
}
