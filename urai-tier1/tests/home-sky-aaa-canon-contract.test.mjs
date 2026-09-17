import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const sky = read('src/spatial/assets/HomeAtmosphericSky.tsx')
const weather = read('src/spatial/environment/HomeEmotionalWeatherState.ts')
const continuity = read('src/spatial/visual/homeSkyContinuity.ts')
const lifeMap = read('src/components/lifemap/LifeMapStellarField.tsx')
const home = read('src/spatial/layout/HomeWorldProductionV223.tsx')

test('AAA Home sky remains a physical atmospheric threshold rather than a portal', () => {
  assert.match(sky, /home-sky-life-map-threshold/)
  assert.match(sky, /broad-visible-sky/)
  assert.match(sky, /localGroundPortal: false/)
  assert.match(sky, /adaptive-perpetual-blue-hour-rayleigh-mie-approximation/)
  assert.match(sky, /ground-to-atmosphere-to-depth-to-memory/)
  assert.doesNotMatch(sky, /portal circle|wormhole|hero moon|purple nebula/i)
})

test('sky owns three independent meteorological cloud regimes with reduced-motion advection', () => {
  assert.match(sky, /home-sky-lower-distant-vapor/)
  assert.match(sky, /home-sky-primary-stratiform-clouds/)
  assert.match(sky, /home-sky-high-memory-filaments/)
  assert.match(sky, /world-space-independent/)
  assert.match(sky, /reducedMotion \? \.08 : 1/)
  assert.match(sky, /uWindCoherence/)
})

test('celestial field has governed class budgets, circular point profiles and sparse asynchronous scintillation', () => {
  assert.match(sky, /physical: 169, anchor: 52, precursor: HOME_SKY_PRECURSOR_COUNT, deepAnchor: 8/)
  assert.match(sky, /gl_PointCoord/)
  assert.match(sky, /if\(r>\.5\) discard/)
  assert.match(sky, /seeded\(index, 7\) < \.15/)
  assert.match(sky, /uMotion\.value = reducedMotion \? 0 : 1/)
})

test('Home memory precursors and Life Map anchors consume one deterministic identity law', () => {
  assert.match(continuity, /HOME_SKY_CONTINUITY_SEED/)
  assert.match(continuity, /HOME_SKY_PRECURSOR_COUNT = 31/)
  assert.match(continuity, /urai-home-memory-precursor-/)
  assert.match(sky, /homeSkyContinuitySample/)
  assert.match(sky, /persistsIntoLifeMap: true/)
  assert.match(lifeMap, /homeSkyContinuityGeometry/)
  assert.match(lifeMap, /life-map-home-sky-continuity-anchors/)
  assert.match(lifeMap, /revealedFromHome: true/)
})

test('emotional weather modulates physical parameters and perpetual blue hour remains bounded', () => {
  for (const state of ['calm', 'reflective', 'energized', 'heavy', 'uncertain', 'hopeful']) assert.match(weather, new RegExp(`${state}:`))
  for (const parameter of ['clarity', 'cloudCover', 'aerosolDensity', 'windCoherence', 'horizonTransmission', 'celestialVisibility']) assert.match(weather, new RegExp(parameter))
  assert.match(weather, /resolveAdaptiveBlueHour/)
  assert.doesNotMatch(weather, /purple|magenta|rainbow|neon/i)
})

test('ground/sky integration uses shared scene aerial perspective without changing the ascent contract', () => {
  assert.match(sky, /scene\.fog instanceof THREE\.FogExp2/)
  assert.match(sky, /scene\.fog\.density/)
  assert.match(sky, /scene\.fog\.color\.lerp/)
  assert.match(home, /const duration = reducedMotion \? \.32 : 1\.65/)
  assert.match(home, /data-home-life-map-entry="visible-sky-broad-interaction"/)
})

test('Orb influence is local atmospheric moisture, not a synchronized sky pulse', () => {
  assert.match(sky, /home-orb-local-atmospheric-moisture/)
  assert.match(sky, /localAtmosphericCoupling: true/)
  assert.match(sky, /consciouslyVisibleTarget: 4/)
  assert.doesNotMatch(sky, /skyPulse|globalOrbPulse|constellationResponse/)
})
