import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')

const controller = read('src/spatial/world/WorldTransitionController.tsx')
const gateway = read('src/spatial/world/GroundGateway.tsx')
const home = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const bridge = read('src/spatial/ground/GroundOrbCompanion.tsx')
const legacyWorld = read('src/app/world/page.tsx')
const worldEvents = read('src/spatial/world/worldEvents.ts')
const audioManifest = read('../operations/assets/spatial-audio-cue-manifest-v1.json')
const css = read('src/spatial/world/worldNavigation.css')

test('Ground descent and return are realm-owned rather than generic aperture/tunnel travel', () => {
  assert.match(controller, /to === 'infrastructure-hub' \|\| \(from === 'infrastructure-hub' && to === 'home'\)/)
  assert.match(controller, /const groundOwned = isGroundOwnedTravel\(currentWorld\.destination, request\.destination\)/)
  assert.match(controller, /GROUND_RETURN_ROUTE_HANDOFF_MS/)
  assert.match(controller, /GROUND_REDUCED_RETURN_ROUTE_HANDOFF_MS/)
  assert.match(controller, /groundOwnedDelay\(currentWorld\.destination, request\.destination\)/)
  assert.match(controller, /returningGroundHome \? '\/home\?returnFrom=ground'/)
  assert.match(controller, /returningGroundHome \? 'home-avatar-eye-return'/)
  assert.match(controller, /data-ground-visual-owner=\{groundOwned \? 'realm-authored-transition' : 'none'\}/)
  assert.match(controller, /!groundOwned \? <>/)
  assert.match(css, /\.urai-world-transition__aperture/)
})

test('Home terrain owns pointer and touch entry while GroundGateway is semantic access only', () => {
  assert.match(home, /data-home-ground-entry="physical-world-surface"/)
  assert.match(home, /onGround\(event\.point\.clone\(\)\)/)
  assert.match(gateway, /data-ground-gateway="semantic-access-only"/)
  assert.match(gateway, /Pointer and touch users enter through the visible Home terrain/)
  assert.match(gateway, /Enter Ground — explore your physical lived world in first person/)
  assert.doesNotMatch(gateway, /urai-ground-gateway__focus-ring|urai-ground-gateway__surface|Enter below/)
  assert.doesNotMatch(home, /Ground portal|ground portal|white dot|ground-portal/i)
})

test('Ground Home action uses world return state and no follower Orb model is rendered', () => {
  assert.match(bridge, /requestUraiWorldReturn/)
  assert.match(bridge, /returnButton\?\.addEventListener\('click', returnThroughWorld, true\)/)
  assert.match(bridge, /groundOrbMode = 'semantic-invocation-only'/)
  assert.match(bridge, /no follower Orb is rendered/)
  assert.match(bridge, /GroundReturnWorldBridge/)
  assert.match(bridge, /return <GroundReturnWorldBridge/)
  assert.doesNotMatch(bridge, /urai-orb-avatar-v1\.glb|useGLTF|<primitive|<mesh|pointLight|icosahedronGeometry/)
})

test('Ground rejects the generic portal travel sound until authored material-crossing audio exists', () => {
  assert.match(worldEvents, /function isGroundDestination\(request: UraiWorldTravelRequest\)/)
  assert.match(worldEvents, /if \(!isGroundDestination\(request\)\) dispatchSpatialAudioCue\('transition'\)/)
  assert.match(worldEvents, /if \(!isGroundPathname\(\)\) dispatchSpatialAudioCue\('transition'\)/)
  assert.match(audioManifest, /"route":"global-except-ground"/)
  assert.match(audioManifest, /physical lived Ground world/)
})

test('legacy /world no longer exposes the retired council/chamber Ground product', () => {
  assert.match(legacyWorld, /redirect\('\/ground\?from=legacy-world'\)/)
  assert.doesNotMatch(legacyWorld, /GroundWorldExperience|council avatars|ground-world\.css/i)
})
