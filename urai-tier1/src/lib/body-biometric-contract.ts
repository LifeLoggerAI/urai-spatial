export type BodyBiometricSource = "mock" | "live-device" | "passive-inference" | "healthkit" | "google-fit" | "wearable";
export type BodyRegion = "head" | "torso" | "arms" | "legs";
export type BodyPortal = "brain-synapses" | "chest-heart" | "arms-motion" | "arms-device" | "legs-movement";

export type BodyMetric = {
  label:
    | "Focus Load"
    | "Heart Rate"
    | "Heart Rate Variability"
    | "Breath Rate"
    | "Sleep Debt"
    | "Device Strain"
    | "Movement"
    | "Grounding";
  value: string;
  summary: string;
};

export type NormalizedBiometricReadings = {
  heartRateBpm: number;
  hrvMs: number;
  respiratoryRatePerMin: number;
  sleepDebtHours: number;
  focusLoadPercent: number;
  deviceStrainPercent: number;
  movementPercent: number;
};

export type BodyBiometricSnapshot = {
  region: BodyRegion;
  title: string;
  subtitle: string;
  signal: string;
  readings: NormalizedBiometricReadings;
  metrics: BodyMetric[];
};

export type BodyBiometricResponse = {
  ok: true;
  service: "urai-spatial";
  userId: string;
  userIdSource: "default-demo" | "client-demo";
  identityMode: "public-demo";
  source: BodyBiometricSource;
  providerStatus: "ready" | "fallback";
  providerMessage: string;
  isDemoFallback: boolean;
  snapshot: BodyBiometricSnapshot;
  availableSources: BodyBiometricSource[];
};

export const DEFAULT_SPATIAL_USER_ID = "adamclamp";
export const AVAILABLE_BODY_BIOMETRIC_SOURCES: BodyBiometricSource[] = [
  "mock",
  "live-device",
  "passive-inference",
  "healthkit",
  "google-fit",
  "wearable",
];

const PUBLIC_DEMO_USER_ID_PATTERN = /^[a-z0-9_-]{1,64}$/i;

const normalizedFallbackReadings: NormalizedBiometricReadings = {
  heartRateBpm: 74,
  hrvMs: 48,
  respiratoryRatePerMin: 14,
  sleepDebtHours: 1.5,
  focusLoadPercent: 62,
  deviceStrainPercent: 41,
  movementPercent: 68,
};

const snapshots: Record<BodyRegion, BodyBiometricSnapshot> = {
  head: {
    region: "head",
    title: "Brain Synapses",
    subtitle: "Focus load is readable in fallback mode.",
    signal: "A soft cognitive signal layer for attention, sensory load, and recovery-friendly routing.",
    readings: normalizedFallbackReadings,
    metrics: [
      { label: "Focus Load", value: "62%", summary: "Moderate attention load; reduce stimulation before deep work." },
      { label: "Sleep Debt", value: "1.5 h", summary: "Demo rest-pressure context for pacing; not a clinical sleep assessment." },
    ],
  },
  torso: {
    region: "torso",
    title: "Chest Heart",
    subtitle: "Heart rhythm is represented as a provider seam.",
    signal: "A gentle body-weather layer for heart, breath, and energy context. Not medical telemetry.",
    readings: normalizedFallbackReadings,
    metrics: [
      { label: "Heart Rate", value: "74 bpm", summary: "Demo rhythm for spatial state only; no medical accuracy is claimed." },
      { label: "Heart Rate Variability", value: "48 ms", summary: "Fallback recovery-context signal for wellness pacing only." },
      { label: "Breath Rate", value: "14/min", summary: "Demo breath context for calm interface animation only." },
    ],
  },
  arms: {
    region: "arms",
    title: "Arms Device",
    subtitle: "Action traces and device strain are visible.",
    signal: "Passive interaction strain can map typing, tapping, scrolling, and device load once providers are connected.",
    readings: normalizedFallbackReadings,
    metrics: [{ label: "Device Strain", value: "41%", summary: "Fallback strain indicator for demo navigation and UI validation." }],
  },
  legs: {
    region: "legs",
    title: "Legs Movement",
    subtitle: "Movement and grounding are visible.",
    signal: "Grounding summarizes mobility and stillness context in supportive wellness language.",
    readings: normalizedFallbackReadings,
    metrics: [
      { label: "Movement", value: "68%", summary: "Demo movement signal; future providers may use motion and location context with consent." },
      { label: "Grounding", value: "68%", summary: "Demo grounding signal; future providers may use motion and location context." },
    ],
  },
};

export function regionForPortal(portal: unknown): BodyRegion {
  if (portal === "chest-heart") return "torso";
  if (portal === "arms-motion" || portal === "arms-device") return "arms";
  if (portal === "legs-movement") return "legs";
  return "head";
}

export function normalizeBodySource(source: unknown): BodyBiometricSource {
  return AVAILABLE_BODY_BIOMETRIC_SOURCES.includes(source as BodyBiometricSource) ? (source as BodyBiometricSource) : "mock";
}

function normalizePublicDemoUserId(userId: unknown) {
  if (typeof userId !== "string") return { userId: DEFAULT_SPATIAL_USER_ID, userIdSource: "default-demo" as const };
  const trimmed = userId.trim();
  if (!PUBLIC_DEMO_USER_ID_PATTERN.test(trimmed)) return { userId: DEFAULT_SPATIAL_USER_ID, userIdSource: "default-demo" as const };
  return { userId: trimmed, userIdSource: "client-demo" as const };
}

function providerMessageFor(source: BodyBiometricSource) {
  if (source === "mock") return "Mock provider is active for deterministic local fallback validation.";
  if (source === "live-device") return "Live-device provider seam is not connected in this environment; privacy-safe fallback snapshot returned.";
  if (source === "passive-inference") return "Passive-inference provider seam is not connected in this environment; privacy-safe fallback snapshot returned.";
  if (source === "healthkit") return "HealthKit provider seam requires user permission and native bridge support; privacy-safe fallback snapshot returned.";
  if (source === "google-fit") return "Google Fit provider seam requires user permission and provider credentials; privacy-safe fallback snapshot returned.";
  return "Wearable provider seam requires user permission and a supported wearable adapter; privacy-safe fallback snapshot returned.";
}

export function buildBodyBiometricResponse(input: { userId?: unknown; portal?: unknown; source?: unknown }): BodyBiometricResponse {
  const identity = normalizePublicDemoUserId(input.userId);
  const source = normalizeBodySource(input.source);
  const region = regionForPortal(input.portal);

  return {
    ok: true,
    service: "urai-spatial",
    userId: identity.userId,
    userIdSource: identity.userIdSource,
    identityMode: "public-demo",
    source,
    providerStatus: source === "mock" ? "ready" : "fallback",
    providerMessage: providerMessageFor(source),
    isDemoFallback: identity.userIdSource === "default-demo",
    snapshot: snapshots[region],
    availableSources: AVAILABLE_BODY_BIOMETRIC_SOURCES,
  };
}
