import {
  assertSpatialFallbackMode,
  spatialDeferredCapabilities,
  spatialLaunchBoundary,
  spatialLiveProviderRequirements,
} from "./spatial-launch-boundaries";

export const URAI_SPATIAL_SERVICE = "urai-spatial";
export const URAI_SPATIAL_VERSION = "1.0.0-release-lock";
export const URAI_SPATIAL_DOMAIN = process.env.NEXT_PUBLIC_URAI_SPATIAL_DOMAIN ?? "local-fallback";

export const spatialRoutes = {
  home: "/",
  spatial: "/spatial",
  lifeMap: "/life-map",
  privacy: "/privacy",
  terms: "/terms",
};

export const spatialApiRoutes = {
  health: "/api/system/health",
  manifest: "/api/system/manifest",
  capabilities: "/api/system/capabilities",
  integrationContract: "/api/system/integration-contract",
  launchBoundary: "/api/system/launch-boundary",
  bodyBiometric: "/api/body-biometric",
  orbCompanion: "/api/orb-companion",
};

export const spatialCapabilities = [
  "home-spatial-shell",
  "avatar-body-zoom",
  "orb-companion-fallback",
  "body-biometric-fallback",
  "sky-lifemap-preview",
  "ground-world-preview",
  "lifemap-starfield",
  "replay-state-machine",
  "system-contract-api",
  "firebase-ready-fallback-mode",
  "future-webxr-ar-seam",
];

export const spatialTargets = ["urai", "urai-studio", "asset-factory", "urai-jobs"];

export function buildSpatialSystemContract() {
  return {
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    version: URAI_SPATIAL_VERSION,
    domain: URAI_SPATIAL_DOMAIN,
    routes: spatialRoutes,
    api: spatialApiRoutes,
    capabilities: spatialCapabilities,
    targets: spatialTargets,
    launchBoundary: spatialLaunchBoundary,
    fallbackMode: assertSpatialFallbackMode(),
    deferredCapabilities: spatialDeferredCapabilities,
    requirementsBeforeLiveProviders: spatialLiveProviderRequirements,
    auth: {
      mode: "fallback-or-user-context",
      userHeaders: ["x-urai-user-id", "x-urai-tenant-id"],
      apiKey: "not-required-for-local-fallback",
      notes: "Privileged mutation routes should be protected before live provider rollout.",
    },
    dataContracts: {
      bodyBiometricSnapshot: {
        regions: ["head", "torso", "arms", "legs"],
        sources: ["mock", "live-device", "passive-inference"],
        fields: ["providerStatus", "providerMessage", "isDemoFallback", "snapshot"],
      },
      orbCompanion: {
        routeHints: ["home", "brain-synapses", "chest-heart", "arms-device", "legs-movement", "sky-life-map", "ground-world", "object-memory", "lifemap"],
        modes: ["local-fallback", "memory-grounded"],
      },
      collections: [
        "spatial_sessions",
        "spatial_nodes",
        "lifemap_nodes",
        "lifemap_replays",
        "body_biometric_snapshots",
        "orb_companion_events",
        "spatial_assets",
        "spatial_anchors",
        "user_spatial_preferences",
      ],
    },
    guarantees: [
      "No secrets are returned by system APIs.",
      "Fallback/demo mode is labeled explicitly.",
      "Biometric language is wellness-supportive and non-diagnostic.",
      "AR/WebXR seams are not described as live unless a provider is connected.",
      "Live providers require explicit consent, tests, and deployment verification before launch claims.",
    ],
    smokeCoverage: ["/", "/life-map", "/privacy", "/terms", "/api/system/health", "/api/system/launch-boundary", "/api/body-biometric", "/api/orb-companion"],
  };
}

export function jsonHeaders() {
  return { "content-type": "application/json; charset=utf-8" };
}
