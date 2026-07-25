import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const boundary = fs.readFileSync(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
const density = fs.readFileSync(new URL('../src/components/lifemap/lifeMapMobileTravelDensity.css', import.meta.url), 'utf8')

test('portrait travel retains visual density without taking interaction ownership', () => {
  assert.match(boundary, /import '\.\/lifeMapMobileTravelDensity\.css'/)
  assert.match(density, /max-width: 700px/)
  assert.match(density, /orientation: portrait/)
  assert.match(density, /data-life-map-phase='departure'/)
  assert.match(density, /data-life-map-phase='travel'/)
  assert.match(density, /pointer-events: none/)
  assert.match(density, /forced-colors: active/)
  assert.match(density, /prefers-reduced-motion: reduce/)
  assert.doesNotMatch(density, /data-life-map-phase='arrival'/)
  assert.doesNotMatch(density, /display:\s*none[^}]*canvas/)
})
