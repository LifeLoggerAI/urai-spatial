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
  assert.doesNotMatch(home, /nearby\s*={2,3}\s*['"]life-map['"]/)
  assert.doesNotMatch(home, /The path rises into your Life Map/)
  assert.doesNotMatch(owner, /HOME_LIFE_MAP/)
  assert.doesNotMatch(owner, /home-life-map-physical-portal/)
  assert.match(owner, /home-life-map-sky-threshold/)
  assert.match(owner, /visible-sky-broad-interaction/)
})

test('sky activation uses progress-driven ascent before route handoff', () => {
  assert.match(home, /cameraCheckpoint: 'home-sky-ascent-complete'/)
  assert.match(home, /setTransition\('life-map'\)/)
  assert.match(home, /requestUraiWorldTravel\(\{ destination: 'life-map'/)
  assert.match(home, /data-home-scene-phase=\{phase\}/)
  assert.match(home, /data-home-transition-sequence=/)
  assert.match(home, /t >= \.995 && !completed\.current/)
  assert.match(home, /router\.prefetch\('\/ground\/'\)/)
  assert.match(home, /router\.prefetch\('\/life-map\/'\)/)
  assert.match(home, /const duration = reducedMotion \? \.32 : 1\.65/)
  assert.doesNotMatch(home, /cameraCheckpoint: 'home-sky-ascent'(?!-complete)/)
  assert.doesNotMatch(home, /setTimeout\([^\n]*life-map/)
  assert.match(runtime, /aria-label="Open Life Map directly"/)
  assert.match(runtime, /data-webgl-ready="false"/)
})

test('Ground and Life Map cannot regain fixed Home destination coordinates', () => {
  assert.doesNotMatch(home, /import \{[^}]*\bGROUND\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
  assert.doesNotMatch(home, /import \{[^}]*\bLIFE_MAP\b[^}]*\} from '\.\/HomeWorldProductionV223Geometry'/)
  assert.match(home, /data-home-distance-ground="world-surface"/)
  assert.match(home, /data-home-distance-life-map="sky-threshold"/)
  assert.match(home, /data-home-ground-entry="physical-world-surface"/)
  assert.match(home, /data-home-life-map-entry="visible-sky-broad-interaction"/)
})
