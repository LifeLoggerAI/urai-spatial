import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const authority = JSON.parse(await readFile(path.join(repoRoot, 'urai-tier1/src/app/currentHomeVisualAuthority.json'), 'utf8'))
const fail = (message) => { throw new Error(`Current Home visual authority invalid: ${message}`) }

if (authority.schemaVersion !== 'urai-home-visual-authority-1') fail(`unsupported schema ${String(authority.schemaVersion)}`)
for (const field of ['rendererOwner','artRevision','worldIdentifier','proofSchema','orbVisualAuthority']) if (!authority[field]) fail(`missing ${field}`)
if (authority.artRevision !== 'v288-cinematic-lived-world-grounded-reliquary') fail(`unexpected art revision ${authority.artRevision}`)
if (authority.worldIdentifier !== 'cinematic-lived-world-threshold') fail(`unexpected world identifier ${authority.worldIdentifier}`)
if (authority.orbVisualAuthority !== 'v288-grounded-biomorphic-reliquary') fail(`unexpected Orb authority ${authority.orbVisualAuthority}`)
if (!Array.isArray(authority.runtimeAssets) || new Set(authority.runtimeAssets).size !== authority.runtimeAssets.length) fail('runtime asset inventory invalid')
for (const required of ['HomeWorldProductionV223.tsx','HomeVisualAuthority.tsx','HomeAtmosphericSky.tsx','HomeOrbReliquaryV286.tsx','HomeOrbGroundedV288.tsx']) if (!authority.runtimeAssets.includes(required)) fail(`runtimeAssets missing ${required}`)
for (const retired of ['HomeLaunchSanctuaryV254.tsx','HomeWorldProductionV225PolishV2.tsx']) if (authority.runtimeAssets.includes(retired)) fail(`retired runtime asset cannot be current: ${retired}`)

const layoutRoot = path.join(repoRoot, 'urai-tier1/src/spatial/layout')
const assetsRoot = path.join(repoRoot, 'urai-tier1/src/spatial/assets')
const publicRoot = path.join(repoRoot, 'urai-tier1/public/assets/urai/home-production/cc0')
for (const asset of authority.runtimeAssets) {
  const candidates = asset.endsWith('.tsx') ? [path.join(layoutRoot, asset), path.join(assetsRoot, asset)] : [path.join(publicRoot, asset)]
  let found = false
  for (const candidate of candidates) { try { await access(candidate); found = true; break } catch {} }
  if (!found) fail(`declared runtime asset missing: ${asset}`)
}

const runtime = await readFile(path.join(repoRoot, 'urai-tier1/src/app/AssetDrivenHomeWorld.tsx'), 'utf8')
for (const token of ['cinematic-lived-world-threshold','first-person-grounded-companion-physical-world-and-broad-sky-threshold','home-grounded-companion','home-life-map-sky-threshold','visible-sky-broad-interaction','continuous-lived-physical-world','data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"']) if (!runtime.includes(token)) fail(`runtime missing ${token}`)

const renderer = await readFile(path.join(layoutRoot, authority.rendererOwner), 'utf8')
for (const token of ["import { HomeAtmosphericSky } from '@/spatial/assets/HomeAtmosphericSky'",'<HomeAtmosphericSky reducedMotion={reducedMotion}',"active={transition === 'life-map'}",'onLifeMap={onLifeMap}',"cameraCheckpoint: 'home-sky-ascent'","cameraCheckpoint: 'home-sky-ascent-complete'","cameraCheckpoint: 'ground-first-person-arrival'","router.prefetch('/ground/')","router.prefetch('/life-map/')",'home-gold-companion','data-home-ground-entry="physical-world-surface"','data-home-life-map-entry="visible-sky-broad-interaction"','data-home-embodied-self="first-person-viewpoint-no-avatar"','event.point.clone()']) if (!renderer.includes(token)) fail(`renderer missing ${token}`)
for (const retired of ["nearby==='life-map'","nearby === 'life-map'",'HOME_LIFE_MAP','useMovementInput','MobileMovementPad','data-home-movement="walk-keyboard-click-touch"','name="home-visible-user-avatar"','data-home-embodied-self="visible-cinematic-avatar"']) if (renderer.includes(retired)) fail(`renderer restored retired Home ownership: ${retired}`)

const visualAuthority = await readFile(path.join(layoutRoot, 'HomeVisualAuthority.tsx'), 'utf8')
for (const token of ["import { HomeOrbGroundedV288 } from '../assets/HomeOrbGroundedV288'",'<HomeOrbGroundedV288 />','export function HomeVisualAuthority()']) if (!visualAuthority.includes(token)) fail(`visual authority missing ${token}`)
for (const retired of ['SanctuaryDressingV253','IcosahedronGeometry','CylinderGeometry','object.visible = false','object.raycast = () => {}']) if (visualAuthority.includes(retired)) fail(`visual authority restored retired dressing/mutation: ${retired}`)

const currentRepair = await readFile(path.join(layoutRoot, 'HomeCurrentArtRepair.tsx'), 'utf8')
for (const retired of ['GroundThresholdV234','LifeMapThresholdV234','LivingMemoryHeartV234','home-v249-life-map-rooted-celestial-ascent']) if (currentRepair.includes(retired)) fail(`V249 localized repair returned: ${retired}`)
const aaaRepair = await readFile(path.join(layoutRoot, 'HomeAAAVisualRepair.tsx'), 'utf8')
for (const retired of ['buildGroundRavine','buildAscentRibbon','buildAscentRoot','home-aaa-v281-ground-recessed-geological-descent']) if (aaaRepair.includes(retired)) fail(`V281 portal-era repair returned: ${retired}`)

const adapter = await readFile(path.join(assetsRoot, 'HomeOrbGroundedV288.tsx'), 'utf8')
for (const token of ['v288-grounded-biomorphic-memory-reliquary','HomeOrbReliquaryV286','home-gold-companion','fallbackVisualOwner: false','material.colorWrite = false','material.depthWrite = false','material.opacity = 0','interactionOwner: true','interactionOwner: false']) if (!adapter.includes(token)) fail(`grounded Orb adapter missing ${token}`)

const reliquary = await readFile(path.join(assetsRoot, 'HomeOrbReliquaryV286.tsx'), 'utf8')
for (const token of ['plateSpecsV286','reliquaryPlateGeometryV286','home-v286-layered-internal-memory-world','home-v286-embedded-memory-filament','home-v286-localized-memory-field','raycast={() => null}']) if (!reliquary.includes(token)) fail(`V286 reliquary missing ${token}`)
for (const forbidden of ['home-v253-literal-living-memory-heart','livingHeartGeometryV253']) if (reliquary.includes(forbidden)) fail(`heart authority returned: ${forbidden}`)

const atmosphere = await readFile(path.join(assetsRoot, 'HomeAtmosphericSky.tsx'), 'utf8')
for (const token of ['RetireLocalizedLifeMapGateways','name="home-sky-life-map-threshold"',"threshold: 'broad-visible-sky'",'localGroundPortal: false','event.ray.direction.y > .015','raycast={skyRaycast}','onClick={activateSky}']) if (!atmosphere.includes(token)) fail(`sky threshold missing ${token}`)
for (const retired of ['HomeLaunchSanctuaryV254','home-v249-life-map-rooted-celestial-ascent']) if (atmosphere.includes(retired)) fail(`sky authority restored retired gateway: ${retired}`)

const ground = await readFile(path.join(repoRoot, 'urai-tier1/src/app/GroundSpatialWorldClean.tsx'), 'utf8')
for (const token of ['data-ground-exploration="first-person"','data-ground-runtime-owner="first-person-lived-world"','data-ground-camera="eye-level-terrain-following"','data-ground-collision="visible-terrain-heightfield"','data-ground-place-layer="consent-aware-empty-by-default"','ground-visible-traversable-terrain','surfaceY + EYE_HEIGHT']) if (!ground.includes(token)) fail(`Ground lost ${token}`)

process.stdout.write(`${JSON.stringify({ ok:true, schemaVersion:authority.schemaVersion, rendererOwner:authority.rendererOwner, artRevision:authority.artRevision, worldIdentifier:authority.worldIdentifier, proofSchema:authority.proofSchema, runtimeAssets:authority.runtimeAssets, orbAuthority:authority.orbVisualAuthority, groundEntryAuthority:'physical-world-surface', lifeMapEntryAuthority:'visible-sky-broad-interaction', homeCameraAuthority:'first-person-viewpoint-no-avatar', groundCameraAuthority:'first-person-lived-world' }, null, 2)}\nCURRENT_HOME_VISUAL_AUTHORITY_OK\n`)
