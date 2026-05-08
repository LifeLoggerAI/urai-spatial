export type BodyBiometricSource = "mock" | "live-device" | "passive-inference";
export type BodyRegion = "head" | "torso" | "arms" | "legs";
export type BodyPortal = "brain-synapses" | "chest-heart" | "arms-motion" | "arms-device" | "legs-movement";

export type BodyMetric = {
  label: "Focus Load" | "Heart Rate" | "Device Strain" | "Grounding";
  value: string;
  summary: string;
};

export type BodyBiometricSnapshot = {
  region: BodyRegion;
  title: string;
  subtitle: string;
  signal: string;
  metrics: BodyMetric[];
};

export type BodyBiometricResponse = {
  ok: true;
  service: "urai-spatial";
  userId: string;
  source: BodyBiometricSource;
  providerStatus: "ready" | "fallback";
  providerMessage: string;
  isDemoFallback: boolean;
  snapshot: BodyBiometricSnapshot;
  availableSources: BodyBiometricSource[];
};

export const DEFAULT_SPATIAL_USER_ID = "adamclamp";

const snapshots: Record<BodyRegion, BodyBiometricSnapshot> = {
  head: {
    region: "head",
    title: "Brain Synapses",
    subtitle: "Focus load is readable in fallback mode.",
    signal: "A soft cognitive signal layer for attention, sensory load, and recovery-friendly routing.",
    metrics: [{ label: "Focus Load", value: "62%", summary: "Moderate attention load; reduce stimulation before deep work." }],
  },
  torso: {
    region: "torso",
    title: "Chest Heart",
    subtitle: "Heart rhythm is represented as a provider seam.",
    signal: "A gentle body-weather layer for heart, breath, and energy context. Not medical telemetry.",
    metrics: [{ label: "Heart Rate", value: "74 bpm", summary: "Demo rhythm for spatial state only; no medical accuracy is claimed." }],
  },
  arms: {
    region: "arms",
    title: "Arms Device",
    subtitle: "Action traces and device strain are visible.",
    signal: "Passive interaction strain can map typing, tapping, scrolling, and device load once providers are connected.",
    metrics: [{ label: "Device Strain", value: "41%", summary: "Fallback strain indicator for demo navigation and UI validation." }],
  },
  legs: {
    region: "legs",
    title: "Legs Movement",
    subtitle: "Movement and grounding are visible.",
    signal: "Grounding summarizes mobility and stillness context in supportive wellness language.",
    metrics: [{ label: "Grounding", value: "68%", summary: "Demo grounding signal; future providers may use motion and location context." }],
  },
};

export function regionForPortal(portal: unknown): BodyRegion {
  if (portal === "chest-heart") return "torso";
  if (portal === "arms-motion" || portal === "arms-device") return "arms";
  if (portal === "legs-movement") return "legs";
  return "head";
}

export function normalizeBodySource(source: unknown): BodyBiometricSource {
  if (source === "live-device" || source === "passive-inference" || source === "mock") return source;
  return "mock";
}

export function buildBodyBiometricResponse(input: { userId?: unknown; portal?: unknown; source?: unknown }): BodyBiometricResponse {
  const userId = typeof input.userId === "string" && input.userId.trim() ? input.userId.trim() : DEFAULT_SPATIAL_USER_ID;
  const isDemoFallback = !(typeof input.userId === "string" && input.userId.trim());
  const source = normalizeBodySource(input.source);
  const region = regionForPortal(input.portal);
  const providerMessage = source === "live-device"
    ? "Live-device provider seam is not connected in this environment; privacy-safe fallback snapshot returned."
    : source === "passive-inference"
      ? "Passive-inference provider seam is not connected in this environment; privacy-safe fallback snapshot returned."
      : "Mock provider is active for deterministic local fallback validation.";

  return {
    ok: true,
    service: "urai-spatial",
    userId,
    source,
    providerStatus: source === "mock" ? "ready" : "fallback",
    providerMessage,
    isDemoFallback,
    snapshot: snapshots[region],
    availableSources: ["mock", "live-device", "passive-inference"],
  };
}
