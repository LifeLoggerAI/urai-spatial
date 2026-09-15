import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const authorityPath = path.join(repoRoot, 'urai-tier1/src/app/currentHomeVisualAuthority.json')
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))

function fail(message) { throw new Error(`Current Home visual authority invalid: ${message}`) }

if (authority.schemaVersion !== 'urai-home-visual-authority-1') fail(`unsupported schema ${String(authority.schemaVersion)}`)
for (const field of ['rendererOwner', 'artRevision', 'worldIdentifier', 'proofSchema', 'orbVisualAuthority']) {
  if (typeof authority[field] !== 'string' || !authority[field].trim()) fail(`missing ${field}`)
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4) fail('runtimeAssets must contain the current renderer/art inventory')
if (new Set(authority.runtimeAssets).size !== authority.runtimeAssets.length) fail('runtimeAssets contains duplicate entries')
if (!authority.runtimeAssets.includes(authority.rendererOwner)) fail('runtimeAssets does not include rendererOwner')
if (!authority.runtimeAssets.includes('HomeVisualAuthority.tsx')) fail('runtimeAssets does not include HomeVisualAuthority.tsx')
if (!authority.runtimeAssets.includes('HomeAtmosphericSky.tsx')) fail('runtimeAssets does not include HomeAtmosphericSky.tsx')
if (authority.orbVisualAuthority !== 'v287-grounded-companion-fallback-over-retired-v286-hotspot') fail(`unexpected Orb visual authority ${String(authority.orbVisualAuthority)}`)
if (authority.artRevision !== 'v287-cinematic-lived-world-threshold') fail(`unexpected Home art revision ${String(authority.artRevision)}`)
if (authority.worldIdentifier !== 'cinematic-lived-world-threshold') fail(`unexpected Home world identifier ${String(authority.worldIdentifier)}`)
if (authority.runtimeAssets.includes('HomeWorldProductionV225PolishV2.tsx')) fail('superseded V225PolishV2 cannot be a current runtime asset')

const layoutRoot = path.join(repoRoot, 'urai-tier1/src/spatial/layout')
const spatialAssetsRoot = path.join(repoRoot, 'urai-tier1/src/spatial/assets')
const assetRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/home-production/cc0')
for (const asset of authority.runtimeAssets) {
  const candidates = asset.endsWith('.tsx')
    ? [path.join(layoutRoot, asset), path.join(spatialAssetsRoot, asset)]
    : [path.join(assetRoot, asset)]
  let found = false
  for (const candidate of candidates) {
    try { await access(candidate); found = true; break } catch {}
  }
  if (!found) fail(`declared runtime asset is missing: ${asset}`)
}

const ownerModule = path.basename(authority.rendererOwner, '.tsx')
const barrel = await readFile(path.join(layoutRoot, 'HomeWorldProduction.tsx'), 'utf8')
if (!barrel.includes(`./${ownerModule}`) || !barrel.includes('as HomeWorldProduction')) fail('HomeWorldProduction barrel does not expose rendererOwner as the canonical renderer')

const runtime = await readFile(path.join(repoRoot, 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'), 'utf8')
for (const token of [
  "import currentHomeVisualAuthority from './currentHomeVisualAuthority.json'",
  'currentHomeVisualAuthority.worldIdentifier',
  'currentHomeVisualAuthority.artRevision',
  'currentHomeVisualAuthority.runtimeAssets.join',
  'home-life-map-sky-threshold',
  'visible-sky-broad-interaction',
  'home-visible-user-avatar',
  'home-grounded-companion',
  'continuous-lived-physical-world',
]) {
  if (!runtime.includes(token)) fail(`runtime does not consume canonical Home token: ${token}`)
}
for (const retired of ['HOME_LIFE_MAP', 'HOME_GROUND', 'stagePortalLifecycle', 'home-life-map-physical-portal']) {
  if (runtime.includes(retired)) fail(`runtime restores retired portal-hub ownership: ${retired}`)
}
if (/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/.test(runtime)) fail('runtime contains an unearned visual certification marker')

const renderer = await readFile(path.join(layoutRoot, authority.rendererOwner), 'utf8')
for (const token of [
  "import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'",
  '<HomeAtmosphericSky reducedMotion={reducedMotion}',
  "active={transition === 'life-map'}",
  'onLifeMap={onLifeMap}',
  "cameraCheckpoint: 'home-sky-ascent'",
  "cameraCheckpoint: 'home-sky-ascent-complete'",
  "router.prefetch('/ground/')",
  "router.prefetch('/life-map/')",
  'home-visible-user-avatar',
  'home-gold-companion',
  'data-home-ground-entry="physical-world-surface"',
  'data-home-embodied-self="visible-cinematic-avatar"',
  'data-home-movement="camera-look-world-surface-selection"',
  'event.point.clone()',
  "cameraCheckpoint: 'ground-first-person-arrival'",
]) {
  if (!renderer.includes(token)) fail(`renderer missing cinematic threshold token: ${token}`)
}
for (const retired of [
  "['life-map',LIFE_MAP",
  "nearby==='life-map'",
  "nearby === 'life-map'",
  'The path rises into your Life Map',
  'The path descends',
  'stepEmbodiedMotion',
  'useMovementInput',
  'MobileMovementPad',
  'data-home-embodied-self="privacy-preserving-first-person"',
  'data-home-movement="walk-keyboard-click-touch"',
]) {
  if (renderer.includes(retired)) fail(`renderer restores retired Home hub/locomotion behavior: ${retired}`)
}
if (/import \{[^}]*\bGROUND\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/.test(renderer)) fail('renderer imports retired fixed Ground destination authority')
if (/import \{[^}]*\bLIFE_MAP\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/.test(renderer)) fail('renderer imports retired fixed Life Map destination authority')
if (/window\.setTimeout\([^\n]*transition[^\n]*ground/.test(renderer)) fail('Ground routing regressed to timeout-only transition authority')

const atmosphere = await readFile(path.join(spatialAssetsRoot, 'HomeAtmosphericSky.tsx'), 'utf8')
for (const token of [
  'RetireLocalizedLifeMapGateways',
  'name="home-sky-life-map-threshold"',
  'home-sky-memory-star-foreshadowing',
  "threshold: 'broad-visible-sky'",
  'localGroundPortal: false',
  'event.ray.direction.y > .015',
  'onClick={activateSky}',
  'object.raycast = () => undefined',
]) {
  if (!atmosphere.includes(token)) fail(`atmosphere does not preserve canonical sky-threshold token: ${token}`)
}

const ground = await readFile(path.join(repoRoot, 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'), 'utf8')
for (const token of [
  'data-ground-exploration="first-person"',
  'data-ground-runtime-owner="first-person-lived-world"',
  'data-ground-camera="eye-level-terrain-following"',
  'data-ground-collision="visible-terrain-heightfield"',
  'data-ground-place-layer="consent-aware-empty-by-default"',
  'ground-visible-traversable-terrain',
  'surfaceY + EYE_HEIGHT',
]) {
  if (!ground.includes(token)) fail(`Ground lost lived-world first-person token: ${token}`)
}
for (const retired of ['GroundPhysicalArchitecture', 'GroundVaultArchitecture', 'ground-destination-compass', 'ground-central-nexus']) {
  if (ground.includes(retired)) fail(`Ground restores retired institutional-hub owner: ${retired}`)
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  schemaVersion: authority.schemaVersion,
  rendererOwner: authority.rendererOwner,
  artRevision: authority.artRevision,
  worldIdentifier: authority.worldIdentifier,
  proofSchema: authority.proofSchema,
  runtimeAssets: authority.runtimeAssets,
  orbAuthority: authority.orbVisualAuthority,
  groundEntryAuthority: 'physical-world-surface',
  lifeMapEntryAuthority: 'visible-sky-broad-interaction',
  homeCameraAuthority: 'cinematic-third-person',
  groundCameraAuthority: 'first-person-lived-world',
}, null, 2)}\nCURRENT_HOME_VISUAL_AUTHORITY_OK\n`)
