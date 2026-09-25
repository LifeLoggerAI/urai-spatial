import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const sky = fs.readFileSync(new URL('../src/spatial/assets/HomeAtmosphericSky.tsx', import.meta.url), 'utf8')

test('broad visible sky owns upward desktop rays before distant ground without creating a portal', () => {
  assert.match(sky, /const validSkyRay = .*event\.ray\.direction\.y > \.015/)
  assert.match(sky, /if \(!object \|\| raycaster\.ray\.direction\.y <= \.015\) return/)
  assert.match(sky, /const distance = \.001/)
  assert.match(sky, /raycaster\.ray\.at\(72, new THREE\.Vector3\(\)\)/)
  assert.match(sky, /name="home-sky-life-map-threshold"/)
  assert.match(sky, /raycast=\{skyRaycast\}/)
  assert.match(sky, /onClick=\{activateSky\}/)
  assert.match(sky, /threshold: 'broad-visible-sky'/)
  assert.match(sky, /localGroundPortal: false/)
  assert.doesNotMatch(sky, /<ringGeometry|<torusGeometry|portal-ring|white-dot|localized-gateway/)
})

test('sky activation remains direction-gated and stops propagation only after it owns a valid sky ray', () => {
  assert.match(sky, /if \(active \|\| !validSkyRay\(event\)\) return/)
  assert.match(sky, /event\.stopPropagation\(\)\s*\n\s*onLifeMap\(\)/)
})
