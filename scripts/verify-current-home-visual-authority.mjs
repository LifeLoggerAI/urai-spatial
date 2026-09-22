import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const authority = JSON.parse(await readFile(path.join(repoRoot, 'urai-tier1/src/app/currentHomeVisualAuthority.json'), 'utf8'))
const fail = (message) => { throw new Error(`Current Home visual authority invalid: ${message}`) }

if (authority.schemaVersion !== 'urai-home-visual-authority-2') fail(`unsupported schema ${String(authority.schemaVersion)}`)
for (const field of ['rendererOwner','artRevision','worldIdentifier','proofSchema','orbVisualAuthority','currentRuntimeCandidate','lastCertifiedPredecessor']) if (!authority[field]) fail(`missing ${field}`)
if (authority.artRevision !== 'v292-avatar-presentation-bodyless-first-person-convergence') fail(`unexpected art revision ${authority.artRevision}`)
if (authority.worldIdentifier !== 'cinematic-lived-world-threshold') fail(`unexpected world identifier ${authority.worldIdentifier}`)
if (authority.orbVisualAuthority !== 'v291-translucent-memory-orb-reference-candidate') fail(`unexpected current Orb authority ${authority.orbVisualAuthority}`)
if (authority.certificationState !== 'candidate-requires-fresh-exact-head-pixels') fail(`unexpected certification state ${authority.certificationState}`)

const predecessor = authority.lastCertifiedPredecessor
if (predecessor.orbVisualAuthority !== 'v288-grounded-biomorphic-reliquary') fail('last certified predecessor Orb authority changed')
for (const required of ['HomeOrbReliquaryV286.tsx','HomeOrbGroundedV288.tsx']) if (!predecessor.runtimeAssets?.includes(required)) fail(`predecessor runtimeAssets missing ${required}`)

const candidate = authority.currentRuntimeCandidate
if (candidate.rendererOwner !== authority.rendererOwner) fail('candidate renderer owner diverges from top-level authority')
if (candidate.orbVisualAuthority !== authority.orbVisualAuthority) fail('candidate Orb authority diverges from top-level authority')
if (candidate.orbRuntimeAsset !== '/assets/urai/generated/models/urai-orb-avatar-v1.glb') fail('candidate Orb runtime asset changed')
if (candidate.certified !== false) fail('unreviewed current candidate must not claim certification')
if (candidate.requiredEvidence !== 'fresh-exact-head-source-build-runtime-and-literal-pixel-acceptance') fail('candidate evidence boundary changed')
if (candidate.homePresentationAuthority !== 'governed-avatar-presence-then-bodyless-first-person') fail('Home presentation authority changed')
if (candidate.nonXrFirstPersonBodyPolicy !== 'camera-only-no-hands-arms-visible-avatar-or-body-rig') fail('non-XR first-person body policy changed')

if (!Array.isArray(authority.runtimeAssets) || new Set(authority.runtimeAssets).size !== authority.runtimeAssets.length) fail('runtime asset inventory invalid')
for (const required of [
  'HomeWorldProductionV223.tsx','HomeWorldProductionV223Geometry.tsx','HomeWorldProductionV225PolishV3.tsx',
  'HomeCurrentArtRepair.tsx','HomeAAAVisualRepair.tsx','HomeVisualAuthority.tsx','HomeAtmosphericSky.tsx',
  'rock-tile-floor/rock-tile-floor-diff-1k.webp','polyhaven-v48/fern_02/asset.gltf',
  'polyhaven-v48/rock_face_01/asset.gltf','polyhaven-v48/rock_face_02/asset.gltf',
  'urai-orb-avatar-v1.glb','HomeEmbodiedAvatar.tsx'
]) if (!authority.runtimeAssets.includes(required)) fail(`runtimeAssets missing ${required}`)
for (const retired of ['HomeOrbReliquaryV286.tsx','HomeOrbGroundedV288.tsx','HomeLaunchSanctuaryV254.tsx','HomeWorldProductionV225PolishV2.tsx']) if (authority.runtimeAssets.includes(retired)) fail(`retired/predecessor runtime asset cannot be current: ${retired}`)

const layoutRoot = path.join(repoRoot, 'urai-tier1/src/spatial/layout')
const assetsRoot = path.join(repoRoot, 'urai-tier1/src/spatial/assets')
const homeRoot = path.join(repoRoot, 'urai-tier1/src/spatial/home')
const cc0Root = path.join(repoRoot, 'urai-tier1/public/assets/urai/home-production/cc0')
const generatedModelRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/generated/models')
for (const asset of authority.runtimeAssets) {
  const candidates = asset.endsWith('.tsx')
    ? [path.join(layoutRoot, asset), path.join(assetsRoot, asset), path.join(homeRoot, asset)]
    : asset === 'urai-orb-avatar-v1.glb'
      ? [path.join(generatedModelRoot, asset)]
      : [path.join(cc0Root, asset)]
  let found = false
  for (const candidatePath of candidates) { try { await access(candidatePath); found = true; break } catch {} }
  if (!found) fail(`declared runtime asset missing: ${asset}`)
}

const runtime = await readFile(path.join(repoRoot, 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'), 'utf8')
for (const token of [
  'cinematic-lived-world-threshold',
  'bodyless-first-person-living-memory-orb-physical-ground-and-broad-sky-threshold',
  'data-home-spatial-regions="home-physical-world home-living-memory-orb home-life-map-sky-threshold"',
  'data-home-life-map-entry',
  'visible-sky-broad-interaction',
  'continuous-lived-physical-world',
  'data-home-ground-entry',
  'physical-world-surface',
  'data-home-art-certification',
  'fresh-exact-head-pixels-required',
  'data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"',
  'data-home-forge-scenery="suppressed"'
]) if (!runtime.includes(token)) fail(`runtime missing ${token}`)

const renderer = await readFile(path.join(layoutRoot, authority.rendererOwner), 'utf8')
for (const token of [
  "import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'",
  '<HomeAtmosphericSky reducedMotion={reducedMotion}',
  "const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'",
  "root.name = 'home-orb-authored-reference-core-v291'",
  "data-home-embodied-self={firstPerson ? 'camera-only-first-person-home' : 'visible-avatar-home-presentation'}",
  "data-home-presence-presentation={homeState.transition === 'AVATAR_EMBODIMENT_TRANSITION' ? 'avatar-embodiment-transition' : homeState.stableState === 'HOME_PRESENTATION' ? 'visible-avatar-presentation-activation-gate' : 'bodyless-first-person-home'}",
  'data-home-non-xr-body-policy="camera-only-no-hands-body-rig"',
  'data-home-presence-policy="presentation-avatar-then-first-person-camera-only-no-hands-body-rig"',
  "router.prefetch('/ground/')","router.prefetch('/life-map/')",
  "cameraCheckpoint: 'home-sky-ascent-complete'","cameraCheckpoint: 'ground-first-person-arrival'",
  'data-home-ground-entry="physical-world-surface"','data-home-life-map-entry="visible-sky-broad-interaction"'
]) if (!renderer.includes(token)) fail(`renderer missing ${token}`)
for (const retired of [
  "nearby==='life-map'","nearby === 'life-map'",'HOME_LIFE_MAP',
  'data-home-movement="walk-keyboard-click-touch"','name="home-visible-user-avatar"',
  'data-home-embodied-self="visible-cinematic-avatar"'
]) if (renderer.includes(retired)) fail(`renderer restored retired Home ownership: ${retired}`)

const visualAuthority = await readFile(path.join(layoutRoot, 'HomeVisualAuthority.tsx'), 'utf8')
for (const token of ['V288 remains the last certified predecessor','no longer mounted over the active runtime','export function HomeVisualAuthority()']) if (!visualAuthority.includes(token)) fail(`visual authority shim missing ${token}`)
for (const retiredMount of ['<HomeOrbGroundedV288','<HomeOrbReliquaryV286']) if (visualAuthority.includes(retiredMount)) fail(`visual authority remounted predecessor Orb: ${retiredMount}`)

const currentRepair = await readFile(path.join(layoutRoot, 'HomeCurrentArtRepair.tsx'), 'utf8')
for (const retired of ['GroundThresholdV234','LifeMapThresholdV234','LivingMemoryHeartV234','home-v249-life-map-rooted-celestial-ascent']) if (currentRepair.includes(retired)) fail(`V249 localized repair returned: ${retired}`)
const aaaRepair = await readFile(path.join(layoutRoot, 'HomeAAAVisualRepair.tsx'), 'utf8')
for (const retired of ['buildGroundRavine','buildAscentRibbon','buildAscentRoot','home-aaa-v281-ground-recessed-geological-descent']) if (aaaRepair.includes(retired)) fail(`V281 portal-era repair returned: ${retired}`)

const atmosphere = await readFile(path.join(assetsRoot, 'HomeAtmosphericSky.tsx'), 'utf8')
for (const token of ['RetireLocalizedLifeMapGateways','name="home-sky-life-map-threshold"', "threshold: 'broad-visible-sky'",'localGroundPortal: false','raycast={skyRaycast}','onClick={activateSky}']) if (!atmosphere.includes(token)) fail(`sky threshold missing ${token}`)
for (const retired of ['HomeLaunchSanctuaryV254','home-v249-life-map-rooted-celestial-ascent']) if (atmosphere.includes(retired)) fail(`sky authority restored retired gateway: ${retired}`)

const avatar = await readFile(path.join(homeRoot, 'HomeEmbodiedAvatar.tsx'), 'utf8')
if (!avatar.includes('HomeAvatarPresentationState')) fail('avatar presentation state contract missing')

const ground = await readFile(path.join(repoRoot, 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'), 'utf8')
for (const token of ['data-ground-exploration="first-person-no-visible-body"','data-ground-runtime-owner="first-person-lived-world"','data-ground-camera="eye-level-terrain-following-no-authored-bob"','data-ground-collision="terrain-plus-authored-obstacle-field"','data-ground-place-layer="consent-aware-empty-by-default"','data-ground-visible-avatar="false"','data-ground-visible-hands="false"','ground-visible-traversable-terrain','surfaceY + GROUND_EYE_HEIGHT_M']) if (!ground.includes(token)) fail(`Ground lost ${token}`)

process.stdout.write(`${JSON.stringify({
  ok:true,
  schemaVersion:authority.schemaVersion,
  rendererOwner:authority.rendererOwner,
  artRevision:authority.artRevision,
  worldIdentifier:authority.worldIdentifier,
  proofSchema:authority.proofSchema,
  runtimeAssets:authority.runtimeAssets,
  orbAuthority:authority.orbVisualAuthority,
  predecessorOrbAuthority:predecessor.orbVisualAuthority,
  candidateCertified:candidate.certified,
  homeCameraAuthority:candidate.nonXrFirstPersonBodyPolicy,
  groundEntryAuthority:'physical-world-surface',
  lifeMapEntryAuthority:'visible-sky-broad-interaction',
  groundCameraAuthority:'first-person-lived-world'
}, null, 2)}\nCURRENT_HOME_VISUAL_AUTHORITY_OK\n`)
