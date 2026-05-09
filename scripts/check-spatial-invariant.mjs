import fs from 'node:fs'

const requiredFiles = [
  'urai-tier1/src/app/page.tsx',
  'urai-tier1/src/app/spatial/page.tsx',
  'urai-tier1/src/app/life-map/page.tsx',
  'urai-tier1/src/app/privacy/page.tsx',
  'urai-tier1/src/app/terms/page.tsx',
  'urai-tier1/src/app/_spatial/SpatialHomeShell.tsx',
  'urai-tier1/src/app/_spatial/LifeMapReleaseSurface.tsx',
  'urai-tier1/src/app/api/body-biometric/route.ts',
  'urai-tier1/src/app/api/orb-companion/route.ts',
  'urai-tier1/src/app/api/system/health/route.ts',
  'urai-tier1/src/app/api/system/manifest/route.ts',
  'urai-tier1/src/app/api/system/capabilities/route.ts',
  'urai-tier1/src/app/api/system/integration-contract/route.ts',
  'urai-tier1/src/app/api/system/launch-boundary/route.ts',
  'urai-tier1/src/lib/body-biometric-contract.ts',
  'urai-tier1/src/lib/orb-companion-contract.ts',
  'urai-tier1/src/lib/spatial-system-contract.ts',
  'urai-tier1/src/lib/spatial-launch-boundaries.ts',
  'scripts/smoke-routes.mjs',
]

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`URAI Spatial invariant failed. Missing ${file}`)
    process.exit(1)
  }
}

const all = requiredFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n')
const tokens = [
  'data-urai-home-spatial-shell="true"',
  'data-urai-camera-target={cameraTarget}',
  'data-urai-orb-listening="passive"',
  'data-urai-home-target',
  'data-urai-avatar-state',
  'data-urai-home-panel',
  'data-urai-orb-chat="shell"',
  'data-urai-orb-voice="scaffold"',
  'data-urai-orb-route-action={routeHint}',
  'data-urai-body-biometric-panel={region}',
  'data-urai-body-metric={metric.label}',
  'data-urai-sky-life-map="scaffold"',
  'data-urai-sky-node="memory-thread"',
  'data-urai-sky-node="forecast-path"',
  'data-urai-ground-world="scaffold"',
  'data-urai-ground-object="room-anchor"',
  'data-urai-ground-object="object-memory"',
  'data-testid="urai-spatial-stage"',
  'data-mode={mode}',
  'data-testid="lifemap-starfield"',
  'data-testid="urai-focus-card"',
  'data-testid="urai-replay-overlay"',
  'service: "urai-spatial"',
  'providerStatus',
  'providerMessage',
  'isDemoFallback',
  'buildSpatialSystemContract',
  'spatialCapabilities',
  'future-webxr-ar-seam',
  'launchBoundary: "/api/system/launch-boundary"',
  'spatialLaunchBoundary',
  'spatialDeferredCapabilities',
  'spatialLiveProviderRequirements',
  'liveProviderConnected: false',
  'liveArWebXrEnabled: false',
  'liveBiometricProviderEnabled: false',
  'liveWearableProviderEnabled: false',
  'liveMemoryGroundingEnabled: false',
  'userConsentRequiredBeforeLiveProviders: true',
]

for (const token of tokens) {
  if (!all.includes(token)) {
    console.error(`URAI Spatial invariant failed. Missing token: ${token}`)
    process.exit(1)
  }
}

for (const forbidden of ['lorem ipsum', '[object Object]', 'GetUrAi']) {
  if (all.includes(forbidden)) {
    console.error(`URAI Spatial invariant failed. Forbidden token: ${forbidden}`)
    process.exit(1)
  }
}

console.log('URAI Spatial invariant check passed.')
