import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const density = fs.readFileSync(new URL('../src/components/lifemap/lifeMapMobileTravelDensity.css', import.meta.url), 'utf8')
const scene = fs.readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('portrait travel retains visual density with distinct authored staging and arrival-only action ownership', () => {
  assert.match(boundary, /import '\.\/lifeMapMobileTravelDensity\.css'/)
  assert.match(density, /max-width:700px/)
  assert.match(density, /orientation:portrait/)
  assert.match(density, /data-life-map-phase='departure'/)
  assert.match(density, /data-life-map-phase='travel'/)
  assert.match(density, /pointer-events:none/)
  assert.match(density, /canvas\{[^}]*transform:none!important/)
  assert.doesNotMatch(density, /canvas\{[^}]*transform:scale/)

  assert.match(scene, /function goalForNode\(/)
  assert.match(scene, /if \(phase === "departure"\)/)
  assert.match(scene, /const departure = overview\.clone\(\)\.addScaledVector\(lateral, -side \* 2\.4\)/)
  assert.match(scene, /if \(phase === "travel"\)/)
  assert.match(scene, /const travel = target\.clone\(\)\.addScaledVector\(direction, SELECTED_MEMORY_STANDOFF \+ 12\.4\)\.addScaledVector\(lateral, side \* 3\.4\)/)
  assert.match(scene, /const travelTarget = target\.clone\(\)\.addScaledVector\(direction, -2\.2\)/)
  assert.match(scene, /if \(phase === "approach"\)/)
  assert.match(scene, /const approach = target\.clone\(\)\.addScaledVector\(direction, SELECTED_MEMORY_STANDOFF \+ 4\.4\)\.addScaledVector\(lateral, side \* 1\.25\)/)
  assert.doesNotMatch(scene, /const travel = overview\.clone\(\)\.lerp\(arrival, 0\.5\)/)
  assert.match(scene, /const thresholdsVisible = Boolean\(selected && phase === "arrival"\)/)
  assert.match(scene, /camera\.position\.z = THREE\.MathUtils\.damp/)

  assert.match(density, /forced-colors:active/)
  assert.match(density, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(density, /data-life-map-phase='arrival'/)
  assert.doesNotMatch(density, /display:none!important[^}]*canvas/)
})
