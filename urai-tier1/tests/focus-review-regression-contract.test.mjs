import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const worldEvents = fs.readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const semanticNavigator = fs.readFileSync(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const telemetryBridge = fs.readFileSync(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')
const focus = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const geology = fs.readFileSync(new URL('../src/app/focus/focusMemoryGeology.ts', import.meta.url), 'utf8')

test('deep-travel fallback cannot preempt the canonical transition controller', () => {
  const fallback = worldEvents.match(/WORLD_TRAVEL_FALLBACK_MS\s*=\s*(\d+)/)
  assert.ok(fallback)
  assert.ok(Number(fallback[1]) > 1900)
})

test('overview mode clears semantic selection without discarding route identity', () => {
  assert.match(semanticNavigator, /const overviewRequested = params\.get\(['"]overview['"]\) === ['"]1['"]/)
  assert.match(semanticNavigator, /const selectedId = overviewRequested \? null : params\.get\(['"]node['"]\) \|\| params\.get\(['"]memoryId['"]\)/)
})

test('home telemetry synchronizes from mutations and input without perpetual document polling', () => {
  assert.match(telemetryBridge, /new MutationObserver\(scheduleSynchronization\)/)
  assert.doesNotMatch(telemetryBridge, /requestAnimationFrame\(synchronize\)/)
  assert.doesNotMatch(telemetryBridge, /const synchronize = \(\) =>/)
})

test('Focus focal authority is the selected memory star and cannot regress to V321 terrain cavities', () => {
  assert.match(focus, /Locked product authority; V352 is the current literal-pixel implementation/)
  assert.match(focus, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focus, /data-focus-spatial="selected-memory-star"/)
  assert.match(focus, /data-focus-terrain-owner="false"/)
  assert.match(focus, /name="focus-selected-memory-star"/)
  assert.match(focus, /name="focus-memory-star-glass-shell"/)
  assert.match(focus, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.match(focus, /selected-memory-star-resolving-through-memory-v352/)
  assert.match(focus, /function makeFocusCoronaTexture\(power: number, rays = false\)/)
  assert.match(focus, /const warpedAngle = angle \+ Math\.sin\(angle \* 3\.0 \+ \.37\) \* \.16/)
  assert.match(focus, /broadPlume/)
  assert.match(focus, /finePlume/)
  assert.match(focus, /const boundary = \.965/)
  assert.match(focus, /Math\.pow\(radial, \.52\)/)
  assert.match(focus, /Math\.pow\(radial, power\) \* \.10 \+ broadPlume \* \.94 \+ finePlume \* \.72/)
  assert.match(focus, /function makeFocusPhotosphereGeometry\(\)/)
  assert.match(focus, /new THREE\.SphereGeometry\(1, 128, 96\)/)
  assert.doesNotMatch(focus, /makeFocusCoronaShellGeometry|geometry=\{coronaShellA\}|geometry=\{coronaShellB\}/)
  assert.match(focus, /width:132px;height:86px/)
  assert.match(focus, /opacity:\.44;filter:saturate\(1\.02\)/)
  assert.match(focus, /focus-memory-star-photosphere-rays-secondary/)
  assert.match(focus, /focus-memory-star-corona-prominences/)
  assert.match(focus, /geometry=\{photosphereGeometry\} scale=\{0\.68\}/)
  assert.match(focus, /name="focus-memory-star-corona-glow"/)
  assert.match(focus, /name="focus-memory-star-photosphere-rays"/)
  assert.doesNotMatch(focus, /repeating-conic-gradient\(/)
  assert.match(focus, /opacity=\{memory \? 0\.96 : 0\.18\}/)
  assert.match(focus, /function makeFocusSphereTexture\(\)/)
  assert.match(focus, /emissiveMap=\{sphereTexture\}/)
  assert.match(focus, /memory\.sourceMedia\.find/)
  assert.match(focus, /Generated demo visualization/)
  assert.doesNotMatch(focus, /createFocusStrata|createFocusGroundIncision|FocusSanctuaryGround|FocusStoneBank/)
  assert.doesNotMatch(focus, /focus-v321-focal-readable-three-radial-pressure-cavity-bottoms|focus-v251-grounded-living-memory-manifestation/)
  assert.match(geology, /v321-focal-readable-three-radial-terrain-cavities-localized-bottoms-ground-blended-hairline-connector-buried-closed-body/)
})

test('Focus convergence preserves Replay activation, selected-memory semantics, reduced motion, and star interaction safety', () => {
  assert.match(focus, /if \(!memory \|\| !replayHref \|\| committed\) return/)
  assert.match(focus, /'Enter Replay for ' \+ memory\.title/)
  assert.doesNotMatch(focus, /Open Replay for/)
  assert.match(focus, /reducedMotion/)
  assert.match(focus, /requestUraiWorldTravel\(\{/)
  assert.match(focus, /destination: 'replay'/)
  assert.match(focus, /requestUraiWorldReturn\(\)/)
  assert.match(focus, /terrainOwner: false/)
})
