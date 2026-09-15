import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const authorityPath = path.join(repoRoot, 'urai-tier1/src/app/currentHomeVisualAuthority.json')
const authority = JSON.parse(await readFile(authorityPath, 'utf8'))

function fail(message) {
  throw new Error(`Current Home visual authority invalid: ${message}`)
}

if (authority.schemaVersion !== 'urai-home-visual-authority-1') fail(`unsupported schema ${String(authority.schemaVersion)}`)
for (const field of ['rendererOwner', 'artRevision', 'worldIdentifier', 'proofSchema', 'orbVisualAuthority']) {
  if (typeof authority[field] !== 'string' || !authority[field].trim()) fail(`missing ${field}`)
}
if (!Array.isArray(authority.runtimeAssets) || authority.runtimeAssets.length < 4) fail('runtimeAssets must contain the current renderer/art inventory')
if (new Set(authority.runtimeAssets).size !== authority.runtimeAssets.length) fail('runtimeAssets contains duplicate entries')
if (!authority.runtimeAssets.includes(authority.rendererOwner)) fail('runtimeAssets does not include rendererOwner')
if (!authority.runtimeAssets.includes('HomeVisualAuthority.tsx')) fail('runtimeAssets does not include HomeVisualAuthority.tsx')
if (!authority.runtimeAssets.includes('HomeAtmosphericSky.tsx')) fail('runtimeAssets does not include HomeAtmosphericSky.tsx')
if (authority.orbVisualAuthority !== 'v286-biomorphic-memory-reliquary') fail(`unexpected Orb visual authority ${String(authority.orbVisualAuthority)}`)
if (!authority.runtimeAssets.includes('HomeOrbReliquaryV286.tsx')) fail('runtimeAssets does not include HomeOrbReliquaryV286.tsx')
if (!authority.runtimeAssets.includes('HomeLaunchSanctuaryV254.tsx')) fail('runtimeAssets does not include HomeLaunchSanctuaryV254.tsx')
if (authority.runtimeAssets.includes('HomeWorldProductionV225PolishV2.tsx')) fail('superseded V225PolishV2 cannot be a current runtime asset')

const layoutRoot = path.join(repoRoot, 'urai-tier1/src/spatial/layout')
const spatialAssetsRoot = path.join(repoRoot, 'urai-tier1/src/spatial/assets')
const assetRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/home-production/cc0')
for (const asset of authority.runtimeAssets) {
  let candidates
  if (asset.endsWith('.tsx')) {
    candidates = [path.join(layoutRoot, asset), path.join(spatialAssetsRoot, asset)]
  } else {
    candidates = [path.join(assetRoot, asset)]
  }
  let found = false
  for (const candidate of candidates) {
    try {
      await access(candidate)
      found = true
      break
    } catch {}
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
]) {
  if (!runtime.includes(token)) fail(`runtime does not consume structured authority token: ${token}`)
}
if (/PRODUCTION CERTIFIED|retained-pixel-pass|pixel-certified/.test(runtime)) fail('runtime contains an unearned visual certification marker')

const renderer = await readFile(path.join(layoutRoot, authority.rendererOwner), 'utf8')
for (const token of [
  "import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'",
  '<HomeAtmosphericSky reducedMotion={p.reducedMotion}/>',
]) {
  if (!renderer.includes(token)) fail(`renderer does not preserve atmospheric visual-authority chain token: ${token}`)
}

const atmosphere = await readFile(path.join(spatialAssetsRoot, 'HomeAtmosphericSky.tsx'), 'utf8')
for (const token of [
  "import { HomeVisualAuthority } from '../layout/HomeVisualAuthority'",
  "import { HomeLaunchSanctuaryV254 } from './HomeLaunchSanctuaryV254'",
  '<HomeVisualAuthority />',
  '<HomeLaunchSanctuaryV254 reducedMotion={reducedMotion} />',
]) {
  if (!atmosphere.includes(token)) fail(`atmosphere does not mount final visual authority token: ${token}`)
}

const visualAuthority = await readFile(path.join(layoutRoot, 'HomeVisualAuthority.tsx'), 'utf8')
for (const token of [
  'object.visible = false',
  'previousRaycast.set(object, object.raycast)', 'object.raycast = () => {}',
  'object.raycast = raycast',
  '!isTransparentInteractionSurface(object)',
  'const setSubtreeOff = (object: THREE.Object3D) => {',
  'object.traverse((child) => disableRaycast(child))',
  "if (object.name === 'home-v226-root-cradle') {",
  'setSubtreeOff(object)',
  "import { HomeOrbReliquaryV286 } from '../assets/HomeOrbReliquaryV286'",
  '<HomeOrbReliquaryV286 />',
]) {
  if (!visualAuthority.includes(token)) fail(`visual ownership guard missing fail-closed interaction/current Orb token: ${token}`)
}
if (/livingHeartGeometryV253|home-v253-literal-living-memory-heart|<GroundedOrbRootsV253\s*\/>|<LiteralOrbAuthorityV253\s*\/>/.test(visualAuthority)) {
  fail('retired V253 heart/root render authority remains mounted or present in the current Home visual authority')
}

const orbAuthority = await readFile(path.join(spatialAssetsRoot, 'HomeOrbReliquaryV286.tsx'), 'utf8')
for (const token of [
  'home-v286-biomorphic-memory-reliquary',
  'reliquaryPlateGeometryV286',
  'reliquaryFilamentGeometriesV286',
  'reliquaryGroundTracesV286',
  'memoryFieldV286',
  'stateVisualsV286',
  'home-v286-layered-internal-memory-world',
  'home-v286-localized-memory-field',
  'interactionOwner: false',
]) {
  if (!orbAuthority.includes(token)) fail(`V286 Orb authority missing token: ${token}`)
}
if (/livingHeart|living-memory-heart|new THREE\.SphereGeometry|<sphereGeometry|wireframe|DoubleSide/.test(orbAuthority)) {
  fail('V286 Orb regressed to retired heart/sphere/crystal-style authority')
}
if (/root\.current\.scale\.set|fieldRef\.current\.rotation|rotation\.y\s*=\s*t\s*\*/.test(orbAuthority)) {
  fail('V286 Orb regressed to whole-object pulsing or orbiting field motion')
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  schemaVersion: authority.schemaVersion,
  rendererOwner: authority.rendererOwner,
  artRevision: authority.artRevision,
  worldIdentifier: authority.worldIdentifier,
  proofSchema: authority.proofSchema,
  runtimeAssets: authority.runtimeAssets,
  orbAuthority: 'v286-biomorphic-memory-reliquary',
}, null, 2)}\nCURRENT_HOME_VISUAL_AUTHORITY_OK\n`)
