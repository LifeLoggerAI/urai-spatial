import { URAI_SPATIAL_TIER_LOCK_VERSION } from "@/components/lifemap/uraiSpatialTierLockContract";
import { assertUraiSpatial3DWorldModel } from "@/spatial/world/uraiSpatialWorldModel";
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
  homeAlias: "/home",
  ground: "/ground",
  spatial: "/spatial",
  lifeMap: "/life-map",
  focus: "/focus",
  replay: "/replay",
  mirror: "/mirror",
  passport: "/passport",
  status: "/status",
  privacy: "/privacy",
  privacyControls: "/privacy-controls",
  locationMap: "/location-map",
  ascent: "/ascent",
  unwind: "/unwind",
  demo: "/demo",
  demoLifeMap: "/demo/life-map",
  demoReplayFilm: "/demo/replay-film",
  spatialLifeMap: "/spatial/life-map",
  spatialLifeMapR3f: "/spatial/life-map-r3f",
  spatialArVr: "/spatial/ar-vr",
  terms: "/terms",
};

export const spatialApiRoutes = {
  health: "/api/system/health",
  manifest: "/api/system/manifest",
  capabilities: "/api/system/capabilities",
  integrationContract: "/api/system/integration-contract",
  studioSpatialHandoff: "/api/system/studio-spatial-handoff",
  launchBoundary: "/api/system/launch-boundary",
  tier2: "/api/system/tier2",
  uraiSpatialLock: "/api/system/urai-spatial-lock",
  uraiSpatial3DWorld: "/api/system/urai-spatial-3d-world",
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
  "3d-world-layer",
  "3d-camera-presets",
  "3d-star-depth-model",
  "3d-replay-path-model",
  "replay-state-machine",
  "system-contract-api",
  "studio-spatial-handoff-validation",
  "firebase-ready-fallback-mode",
  "future-webxr-ar-seam",
];

export const spatialTargets = ["urai", "urai-studio", "asset-factory", "urai-jobs"];

export const spatialSmokeCoverage = [
  ...Object.values(spatialRoutes),
  spatialApiRoutes.health,
  spatialApiRoutes.studioSpatialHandoff,
  spatialApiRoutes.launchBoundary,
  spatialApiRoutes.uraiSpatialLock,
  spatialApiRoutes.uraiSpatial3DWorld,
  spatialApiRoutes.bodyBiometric,
  spatialApiRoutes.orbCompanion,
] as const;

export function buildSpatialSystemContract() {
  const world3D = assertUraiSpatial3DWorldModel();

  return {
    ok: true,
    service: URAI_SPATIAL_SERVICE,
    version: URAI_SPATIAL_VERSION,
    domain: URAI_SPATIAL_DOMAIN,
    routes: spatialRoutes,
    api: spatialApiRoutes,
    capabilities: spatialCapabilities,
    targets: spatialTargets,
    locks: {
      uraiSpatial: {
        service: URAI_SPATIAL_SERVICE,
        status: "locked",
        done: true,
        lockVersion: URAI_SPATIAL_TIER_LOCK_VERSION,
        tierCount: 5,
        route: spatialApiRoutes.uraiSpatialLock,
      },
      studioSpatialHandoff: {
        service: URAI_SPATIAL_SERVICE,
        status: "locked",
        done: true,
        contractVersion: "0.1.0",
        route: spatialApiRoutes.studioSpatialHandoff,
        producer: "urai-studio",
        consumer: "urai-spatial",
        requiredRuntimeTarget: "web-spatial",
      },
    },
    world3D,
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
      studioSpatialHandoff: {
        route: spatialApiRoutes.studioSpatialHandoff,
        producer: "urai-studio",
        consumer: "urai-spatial",
        validator: "validateStudioSpatialExport",
        runtimeTargets: ["web-spatial", "webxr-disabled", "quest-vr-disabled", "visionos-disabled", "ar-handheld-disabled"],
        requiredFields: ["sceneManifest", "assetManifest", "consentReceipt", "safetyBoundaries", "runtimeTargets"],
      },
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
      "The primary URAI Spatial world layer is 3D; DOM is reserved for accessible controls, labels, and safe fallback.",
      "No secrets are returned by system APIs.",
      "Fallback/demo mode is labeled explicitly.",
      "Biometric language is wellness-supportive and non-diagnostic.",
      "AR/WebXR seams are not described as live unless a provider is connected.",
      "Studio exports must pass the Studio Spatial handoff validator before rendering.",
      "Live providers require explicit consent, tests, and deployment verification before launch claims.",
    ],
    smokeCoverage: spatialSmokeCoverage,
  };
}

export function jsonHeaders() {
  return { "content-type": "application/json; charset=utf-8" };
}
