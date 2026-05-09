#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const files = {
  boundary: 'urai-tier1/src/lib/spatial-launch-boundaries.ts',
  systemContract: 'urai-tier1/src/lib/spatial-system-contract.ts',
  route: 'urai-tier1/src/app/api/system/launch-boundary/route.ts',
  capabilitiesRoute: 'urai-tier1/src/app/api/system/capabilities/route.ts',
  docs: 'docs/SPATIAL_LAUNCH_CONTRACT.md',
}

let failed = false

function fail(message) {
  console.error(`launch-boundary-contract: ${message}`)
  failed = true
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  if (!fs.existsSync(absolutePath)) {
    fail(`missing ${relativePath}`)
    return ''
  }
  return fs.readFileSync(absolutePath, 'utf8')
}

const boundary = read(files.boundary)
const systemContract = read(files.systemContract)
const route = read(files.route)
const capabilitiesRoute = read(files.capabilitiesRoute)
const docs = read(files.docs)

const requiredBoundaryFields = [
  'releaseMode',
  'liveProviderConnected',
  'liveArWebXrEnabled',
  'liveBiometricProviderEnabled',
  'liveWearableProviderEnabled',
  'liveMemoryGroundingEnabled',
  'liveAssetFactoryEnabled',
  'userConsentRequiredBeforeLiveProviders',
  'copyBoundary',
]

const requiredDeferredCapabilities = [
  'live-ar-webxr-session',
  'live-camera-biometric-provider',
  'live-wearable-provider',
  'live-memory-grounded-orb',
  'live-spatial-asset-factory-jobs',
  'live-cross-repo-user-memory-sync',
]

for (const field of requiredBoundaryFields) {
  if (!boundary.includes(field)) fail(`${files.boundary} missing launch boundary field ${field}`)
  if (!route.includes(field) && field !== 'copyBoundary') {
    fail(`${files.route} does not expose launch boundary field ${field}`)
  }
}

for (const capability of requiredDeferredCapabilities) {
  if (!boundary.includes(capability)) fail(`${files.boundary} missing deferred capability ${capability}`)
  if (!docs.includes(capability)) fail(`${files.docs} missing deferred capability ${capability}`)
}

const routeRequiredTokens = [
  'URAI_SPATIAL_SERVICE',
  'URAI_SPATIAL_VERSION',
  'spatialLaunchBoundary',
  'assertSpatialFallbackMode',
  'spatialDeferredCapabilities',
  'spatialLiveProviderRequirements',
  'requirementsBeforeLiveProviders',
]

for (const token of routeRequiredTokens) {
  if (!route.includes(token)) fail(`${files.route} missing response token ${token}`)
}

const systemContractRequiredTokens = [
  'launchBoundary: "/api/system/launch-boundary"',
  'launchBoundary: spatialLaunchBoundary',
  'fallbackMode: assertSpatialFallbackMode()',
  'deferredCapabilities: spatialDeferredCapabilities',
  'requirementsBeforeLiveProviders: spatialLiveProviderRequirements',
]

for (const token of systemContractRequiredTokens) {
  if (!systemContract.includes(token)) fail(`${files.systemContract} missing contract token ${token}`)
}

if (!capabilitiesRoute.includes('requirementsBeforeLiveProviders')) {
  fail(`${files.capabilitiesRoute} must expose requirementsBeforeLiveProviders`)
}

if (!docs.includes('/api/system/launch-boundary')) {
  fail(`${files.docs} must document /api/system/launch-boundary`)
}

if (failed) process.exit(1)
console.log('launch-boundary-contract: response shape checks passed')
