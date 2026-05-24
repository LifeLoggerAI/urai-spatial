import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolute = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolute), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolute, 'utf8')
}

const launchBoundary = read('src/lib/spatial-launch-boundaries.ts')
const launchRoute = read('src/app/api/system/launch-boundary/route.ts')
const capabilitiesRoute = read('src/app/api/system/capabilities/route.ts')
const integrationRoute = read('src/app/api/system/integration-contract/route.ts')
const systemContract = read('src/lib/spatial-system-contract.ts')
const contractDoc = read('../docs/SPATIAL_LAUNCH_CONTRACT.md')

test('spatial launch boundary remains fallback-demo until providers are verified', () => {
  assert.match(launchBoundary, /releaseMode: "fallback-demo"/)
  assert.match(launchBoundary, /liveProviderConnected: false/)
  assert.match(launchBoundary, /liveArWebXrEnabled: false/)
  assert.match(launchBoundary, /liveBiometricProviderEnabled: false/)
  assert.match(launchBoundary, /liveWearableProviderEnabled: false/)
  assert.match(launchBoundary, /liveMemoryGroundingEnabled: false/)
  assert.match(launchBoundary, /liveAssetFactoryEnabled: false/)
  assert.match(launchBoundary, /userConsentRequiredBeforeLiveProviders: true/)
})

test('deferred provider capabilities are explicitly listed in code and docs', () => {
  for (const capability of [
    'live-ar-webxr-session',
    'live-camera-biometric-provider',
    'live-wearable-provider',
    'live-memory-grounded-orb',
    'live-spatial-asset-factory-jobs',
    'live-cross-repo-user-memory-sync',
  ]) {
    assert.ok(launchBoundary.includes(capability), `launch boundary missing ${capability}`)
    assert.ok(contractDoc.includes(capability), `launch contract doc missing ${capability}`)
  }
})

test('live-provider requirements remain consent, secrets, fallback, and test gated', () => {
  for (const token of [
    'Provider credentials are configured only in server/deployment secrets.',
    'User consent exists for any camera, biometric, wearable, location, or memory-grounded provider.',
    'Fallback mode remains available if the provider is unavailable.',
    'System APIs do not expose secrets or privileged provider details.',
    'Smoke/E2E tests prove routes still work without live providers.',
    'Launch copy clearly distinguishes live capabilities from preview seams.',
  ]) {
    assert.ok(launchBoundary.includes(token), `launch boundary missing requirement: ${token}`)
  }
})

test('system routes expose launch boundaries without secret/provider activation', () => {
  assert.match(launchRoute, /assertSpatialFallbackMode/)
  assert.match(launchRoute, /spatialDeferredCapabilities/)
  assert.match(launchRoute, /spatialLaunchBoundary/)
  assert.match(launchRoute, /requirementsBeforeLiveProviders/)

  assert.match(capabilitiesRoute, /spatialLaunchBoundary/)
  assert.match(integrationRoute, /buildSpatialSystemContract/)
  assert.match(systemContract, /launchBoundary: spatialLaunchBoundary/)
  assert.match(systemContract, /fallbackMode: assertSpatialFallbackMode\(\)/)
  assert.match(systemContract, /deferredCapabilities: spatialDeferredCapabilities/)
  assert.doesNotMatch(launchRoute, /process\.env\.[A-Z0-9_]*(SECRET|PRIVATE|TOKEN|KEY)/)
})

test('launch contract documentation keeps go-no-go checks visible', () => {
  for (const command of [
    'pnpm check:spatial-copy',
    'pnpm check:launch-boundary-contract',
    'pnpm check:spatial',
    'pnpm launch:check',
  ]) {
    assert.ok(contractDoc.includes(command), `launch contract doc missing command: ${command}`)
  }
  assert.match(contractDoc, /Ship URAI Spatial only if the fallback shell is stable/)
})
