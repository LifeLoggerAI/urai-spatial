import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  const absolutePath = path.join(root, relativePath)
  assert.ok(fs.existsSync(absolutePath), `missing expected file: ${relativePath}`)
  return fs.readFileSync(absolutePath, 'utf8')
}

const assetPackage = read('src/spatial/assets/assetPackage.ts')
const manifestTypes = read('src/spatial/assets/manifestTypes.ts')
const demoStars = read('src/spatial/demo/demoMemoryStars.ts')
const renderer = read('src/spatial/assets/ManifestRenderer.tsx')

test('Phase 6 defines a Spatial asset package contract around existing manifests', () => {
  for (const snippet of [
    'export type UraiSpatialAssetPackage',
    'packageId: string',
    "packageVersion: '1.0'",
    'scope: SpatialPackageScope',
    'ownerId: string',
    'sourceJobId: string',
    'sourcePromptPreview: string',
    'createdAt: string',
    'manifest: SpatialAssetManifest',
    'storagePaths: string[]',
    'contentTypes: string[]',
    'license:',
    'reviewState: SpatialPackageReviewState',
    'packageScope: SpatialPackageScope',
    'surfaces: SpatialPackageSurface[]',
  ]) {
    assert.ok(assetPackage.includes(snippet), `asset package contract missing ${snippet}`)
  }
})

test('Phase 6 validates packages and derives packages from manifests', () => {
  for (const snippet of [
    'isUraiSpatialAssetPackage',
    'createSpatialAssetPackageFromManifest',
    'canRenderSpatialAssetPackage',
    'isSpatialAssetManifest(candidate.manifest)',
    'manifest.artifacts.map',
    "pkg:${manifest.manifestId}",
    "manifest.ownerId === 'launch-demo' ? 'public-demo' : 'private-user'",
  ]) {
    assert.ok(assetPackage.includes(snippet), `asset package validator missing ${snippet}`)
  }
})

test('Phase 6 demo packages are public-demo, approved, and local-preview only', () => {
  assert.match(demoStars, /DEMO_SPATIAL_ASSET_PACKAGES/)
  assert.match(demoStars, /createSpatialAssetPackageFromManifest/)
  assert.match(demoStars, /scope: 'public-demo'/)
  assert.match(demoStars, /reviewState: 'approved'/)
  assert.match(demoStars, /license: 'urai-demo'/)
  assert.match(demoStars, /surfaces: \['focus-artifact', 'lifemap-star', 'replay-scene'\]/)
  assert.match(demoStars, /provider: 'urai-demo'/)
  assert.match(demoStars, /model: 'css-svg-preview'/)
})

test('Phase 6 renderer still rejects unsafe manifest URLs and falls back safely', () => {
  assert.match(renderer, /function isSafeAssetUrl/)
  assert.match(renderer, /url\.startsWith\('gs:\/\/'\)/)
  assert.match(renderer, /url\.startsWith\('\/demo\/'\)/)
  assert.match(renderer, /parsed\.protocol === 'https:' \|\| parsed\.protocol === 'http:'/)
  assert.match(renderer, /No asset attached/)
  assert.match(renderer, /Asset URL unavailable/)
  assert.match(renderer, /Unsupported asset type/)
})

test('Phase 6 keeps manifest validator strict enough for package creation', () => {
  assert.match(manifestTypes, /typeof candidate\.jobId === 'string'/)
  assert.match(manifestTypes, /typeof candidate\.ownerId === 'string'/)
  assert.match(manifestTypes, /typeof candidate\.projectId === 'string'/)
  assert.match(manifestTypes, /candidate\.artifacts\.every\(isArtifact\)/)
})
