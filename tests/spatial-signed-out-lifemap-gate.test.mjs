import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { SIGNED_OUT_LIFEMAP_SELECTOR, selectSignedOutLifeMapGate } from './spatial-signed-out-lifemap-gate.mjs'

const map = readFileSync(new URL('../urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx', import.meta.url), 'utf8')
const browser = readFileSync(new URL('./spatial-tier-lock-hardening.mjs', import.meta.url), 'utf8')

test('signed-out Life Map gate requires exact, nonprivate markers for both renderers', () => {
  assert.match(map, /data-testid="urai-r3f-canonical-lifemap"[\s\S]*?data-life-map-access=\{mode\}[\s\S]*?data-private-memory-mounted=\{mode === "signed-out" \? "false"/)
  assert.match(map, /data-testid="urai-life-map-signed-out-threshold"[\s\S]*?data-life-map-source="signed-out"[^>]*data-private-memory-mounted="false"/)
  assert.match(SIGNED_OUT_LIFEMAP_SELECTOR, /urai-r3f-canonical-lifemap/)
  assert.match(SIGNED_OUT_LIFEMAP_SELECTOR, /urai-life-map-signed-out-threshold/)
  assert.doesNotMatch(SIGNED_OUT_LIFEMAP_SELECTOR, /:not\(|data-life-map-access="private"|data-life-map-source="private"/)
})

test('browser data suite still requires forbidden private mount to be false', () => {
  assert.match(browser, /const gate = selectSignedOutLifeMapGate\(page\)/)
  assert.match(browser, /expectVisible\(gate, 'signed-out Life Map WebGL or fallback', 30000\)/)
  assert.match(browser, /expectAttr\(gate, 'data-private-memory-mounted', 'false'\)/)
  assert.doesNotMatch(browser, /getByTestId\('urai-r3f-canonical-lifemap'\)/)
})

test('locator selects the exact two guarded cases rather than broad page elements', () => {
  const seen = []
  const locator = { id: 'signed-out-lifemap' }
  const page = { locator(value) { seen.push(value); return locator } }
  assert.equal(selectSignedOutLifeMapGate(page), locator)
  assert.deepEqual(seen, [SIGNED_OUT_LIFEMAP_SELECTOR])
  assert.equal(seen[0].split(',').length, 2)
})

test('standalone browser runner keeps pinned workspace tooling and owns its server', () => {
  assert.match(browser, /allocateEphemeralPort\(\)/)
  assert.match(browser, /waitForOwnedHome\(BASE_URL, server\)/)
  assert.match(browser, /'--hostname', '127\.0\.0\.1', '--port', String\(port\)/)
  assert.match(browser, /shell: false/)
  assert.doesNotMatch(browser, /spawn\('pnpm'/)
  assert.doesNotMatch(browser, /'--port', '3000'/)
  assert.match(browser, /expectVisible\(gate, 'signed-out after real ascent', 30000\)/)
})
