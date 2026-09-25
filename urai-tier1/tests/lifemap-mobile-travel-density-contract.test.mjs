import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const density = fs.readFileSync(new URL('../src/components/lifemap/lifeMapMobileTravelDensity.css', import.meta.url), 'utf8')
const scene = fs.readFileSync(new URL('../src/components/lifemap/CosmicComposedLifeMapScene.tsx', import.meta.url), 'utf8')

test('portrait travel retains visual density with distinct cosmic staging and arrival-only action ownership', () => {
  assert.match(boundary, /import '\.\/lifeMapMobileTravelDensity\.css'/)
  assert.match(boundary, /CosmicComposedLifeMapScene/)
  assert.match(density, /max-width:700px/)
  assert.match(density, /orientation:portrait/)
  assert.match(density, /data-life-map-phase='departure'/)
  assert.match(density, /data-life-map-phase='travel'/)
  assert.match(density, /pointer-events:none/)
  assert.match(density, /canvas\{[^}]*transform:none!important/)
  assert.doesNotMatch(density, /canvas\{[^}]*transform:scale/)

  assert.match(scene, /function CameraRig\(/)
  assert.match(scene, /const portrait = size\.height > size\.width/)
  assert.match(scene, /const distance = phase === "departure" \? 21 : phase === "travel" \? 16\.5 : phase === "approach" \? 11\.2 : portrait \? 8\.6 : 7\.2/)
  assert.match(scene, /position\.y \+= phase === "travel" \? 2\.2 : phase === "approach" \? \.8 : \.25/)
  assert.match(scene, /fov: portrait \? phase === "arrival" \? 50 : 56 : phase === "arrival" \? 40 : 49/)
  assert.match(scene, /const showThresholds = Boolean\(selected && phase === "arrival"\)/)
  assert.match(scene, /\{showThresholds \? <nav className="life-map-thresholds"/)
  assert.match(scene, /camera\.position\.lerp\(position, 1 - Math\.exp\(-rate \* delta\)\)/)
  assert.match(scene, /look\.current\.lerp\(target, 1 - Math\.exp\(-4\.2 \* delta\)\)/)

  assert.match(density, /forced-colors:active/)
  assert.match(density, /prefers-reduced-motion:reduce/)
  assert.doesNotMatch(density, /data-life-map-phase='arrival'/)
  assert.doesNotMatch(density, /display:none!important[^}]*canvas/)
})
