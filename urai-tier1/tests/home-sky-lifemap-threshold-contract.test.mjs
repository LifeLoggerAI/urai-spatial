import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const home = read('src/spatial/layout/HomeWorldProductionV223.tsx')
const sky = read('src/spatial/assets/HomeAtmosphericSky.tsx')
const owner = read('src/app/AssetDrivenHomeWorld.tsx')
const runtime = read('src/app/HomeSpatialRuntimeLayer.tsx')

test('Home Life Map entry is owned by the broad visible sky, never a localized ground hotspot', () => {
  assert.match(sky, /name="home-sky-life-map-threshold"/)
  assert.match(sky, /threshold: 'broad-visible-sky'/)
  assert.match(sky, /localGroundPortal: false/)
  assert.match(sky, /event\.ray\.direction\.y > \.015/)
  assert.match(sky, /onClick=\{activateSky\}/)
  assert.match(sky, /home-sky-memory-star-foreshadowing/)
  assert.match(sky, /RetireLocalizedLifeMapGateways/)
  assert.match(sky, /life-map-rooted-celestial-ascent/)
  assert.match(sky, /life-map-geology/)
  assert.match(sky, /object\.raycast = \(\) => undefined/)
  assert.doesNotMatch(home, /\['life-map',LIFE_MAP/)
  assert.doesNotMatch(home, /nearby==='life-map'/)
  assert.doesNotMatch(home, /The path rises into your Life Map/)
  assert.doesNotMatch(owner, /HOME_LIFE_MAP/)
  assert.doesNotMatch(owner, /home-life-map-physical-portal/)
  assert.match(owner, /home-life-map-sky-threshold/)
  assert.match(owner, /visible-sky-broad-interaction/)
})

test('sky activation begins the existing canonical ascent transaction before route handoff', () => {
  assert.match(home, /cameraCheckpoint:'home-sky-ascent'/)
  assert.match(home, /cameraCheckpoint:'home-sky-ascent-complete'/)
  assert.match(home, /setTransition\('life-map'\);requestUraiWorldTravel/)
  assert.match(home, /data-home-sky-sequence=\{transition==='life-map'\?'ASCENT':'HOME_IDLE'\}/)
  assert.match(home, /data-home-scene-phase=\{transition==='life-map'\?'ASCENT'/)
  assert.match(home, /homeSkyAscentProgress/)
  assert.match(home, /router\.prefetch\('\/life-map\/'\)/)
  assert.match(home, /duration=reducedMotion\?\.58:1\.65/)
  assert.match(runtime, /aria-label="Open Life Map directly"/)
  assert.match(runtime, /data-webgl-ready="false"/)
})
