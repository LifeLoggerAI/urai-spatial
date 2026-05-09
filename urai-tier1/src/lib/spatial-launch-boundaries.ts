export const spatialLaunchBoundary = {
  releaseMode: "fallback-demo" as const,
  liveProviderConnected: false,
  liveArWebXrEnabled: false,
  liveBiometricProviderEnabled: false,
  liveWearableProviderEnabled: false,
  liveMemoryGroundingEnabled: false,
  liveAssetFactoryEnabled: false,
  userConsentRequiredBeforeLiveProviders: true,
  copyBoundary:
    "URAI Spatial is currently a fallback/demo spatial shell. Live AR/WebXR, wearable, biometric, memory-grounded, and asset-factory providers must not be claimed as active until provider wiring, consent, tests, and deployment checks are complete."
} as const;

export const spatialLiveProviderRequirements = [
  "Provider credentials are configured only in server/deployment secrets.",
  "User consent exists for any camera, biometric, wearable, location, or memory-grounded provider.",
  "Fallback mode remains available if the provider is unavailable.",
  "System APIs do not expose secrets or privileged provider details.",
  "Smoke/E2E tests prove routes still work without live providers.",
  "Launch copy clearly distinguishes live capabilities from preview seams."
] as const;

export const spatialDeferredCapabilities = [
  "live-ar-webxr-session",
  "live-camera-biometric-provider",
  "live-wearable-provider",
  "live-memory-grounded-orb",
  "live-spatial-asset-factory-jobs",
  "live-cross-repo-user-memory-sync"
] as const;

export function assertSpatialFallbackMode() {
  return {
    ok: true,
    releaseMode: spatialLaunchBoundary.releaseMode,
    liveProviderConnected: spatialLaunchBoundary.liveProviderConnected,
    deferredCapabilities: spatialDeferredCapabilities,
    requirementsBeforeLiveProviders: spatialLiveProviderRequirements
  };
}
