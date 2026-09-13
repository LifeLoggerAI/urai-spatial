import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const owner = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const art = fs.readFileSync(new URL('../src/spatial/layout/HomeCurrentArtRepair.tsx', import.meta.url), 'utf8')
const authority = JSON.parse(fs.readFileSync(new URL('../src/app/currentHomeVisualAuthority.json', import.meta.url), 'utf8'))

test('current Home mounts one explicit unified visual authority and declares the exact revision', () => {
  assert.match(owner, /import \{HomeCurrentArtRepair\} from '\.\/HomeCurrentArtRepair'/)
  assert.match(owner, /<HomeCurrentArtRepair orbState=\{p\.orbState\} reducedMotion=\{p\.reducedMotion\}/)
  assert.match(art, /home-current-unified-visual-authority/)
  assert.match(art, /v249-systemic-organic-convergence/)
  assert.equal(authority.artRevision, 'v254-launch-sanctuary-depth')
  assert.ok(authority.runtimeAssets.includes('HomeCurrentArtRepair.tsx'))
  assert.ok(authority.runtimeAssets.includes('HomeLaunchSanctuaryV254.tsx'))
})

test('retired hidden Home visual owners cannot keep invisible pointer authority', () => {
  assert.match(art, /function suppressRaycast\(/)
  assert.match(art, /object\.raycast = \(\) => undefined/)
  assert.match(art, /object\.traverse\(\(child\) => suppressRaycast\(child, raycasts\.current\)\)/)
  assert.match(art, /raycasts\.current\.forEach\(\(raycast, object\) => \{ object\.raycast = raycast \}\)/)
})

test('Ground is a low geological descent rather than an arch, ring, membrane, or slab portal', () => {
  assert.match(art, /home-v249-ground-geological-descent/)
  assert.match(art, /low-geological-descent-cleft/)
  assert.match(art, /low-lateral-eroded-cleft-descending-into-terrain/)
  assert.match(art, /ScannedRock/)
  assert.doesNotMatch(art, /apertureGeometry/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry|RingGeometry|ringGeometry|TubeGeometry|function membrane\(/)
})

test('Life Map threshold is a distinct rooted celestial ascent, not a copy of Ground morphology', () => {
  assert.match(art, /home-v249-life-map-rooted-celestial-ascent/)
  assert.match(art, /vertical-rooted-celestial-ascent/)
  assert.match(art, /rooted-ascent-opening-upward-into-lineage-and-constellation-depth/)
  assert.match(art, /function lineageGeometry\(/)
  assert.match(art, /points geometry=\{stars\}/)
  assert.doesNotMatch(art, /TorusGeometry|torusGeometry|RingGeometry|ringGeometry|TubeGeometry|function membrane\(/)
  const groundMorphology = art.match(/morphology: '([^']*ground[^']*|low-geological-descent-cleft)'/)?.[1]
  const lifeMapMorphology = art.match(/morphology: '(vertical-rooted-celestial-ascent)'/)?.[1]
  assert.ok(groundMorphology && lifeMapMorphology)
  assert.notEqual(groundMorphology, lifeMapMorphology)
})

test('Orb is one matte organic asymmetric state-aware living-memory presence with readable interior life', () => {
  assert.match(art, /home-v249-organic-living-memory-presence/)
  assert.match(art, /single-matte-asymmetric-folded-history-bearing-presence-with-readable-interior-life/)
  assert.match(art, /new THREE\.SphereGeometry\(1, 96, 64\)/)
  assert.match(art, /function memoryFieldGeometry\(/)
  assert.match(art, /function memoryFilamentGeometry\(/)
  assert.match(art, /function memoryScarGeometry\(/)
  assert.match(art, /const stateIntensity: Record<OrbState, number>/)
  assert.match(art, /reducedMotion\) return/)
  assert.match(art, /roughness=\{\.76\} metalness=\{0\}/)
  assert.doesNotMatch(art, /wireframe/)
  assert.doesNotMatch(art, /THREE\.DoubleSide/)
  assert.doesNotMatch(art, /<meshBasicMaterial/)
  assert.doesNotMatch(art, /<sphereGeometry/)
  assert.doesNotMatch(art, /renderOrder=/)
  assert.doesNotMatch(art, /depthTest=\{false\}/)
  assert.doesNotMatch(art, /new THREE\.IcosahedronGeometry/)
  assert.doesNotMatch(art, /v248-translucent-living-memory-field/)
})