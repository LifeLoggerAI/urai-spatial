import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const page = fs.readFileSync(new URL('../src/app/spatial/captured-reality/page.tsx', import.meta.url), 'utf8')
const client = fs.readFileSync(new URL('../src/app/spatial/captured-reality/CapturedRealityRouteClient.tsx', import.meta.url), 'utf8')

test('private captured reality route is a static shell and carries no private asset data at build time', () => {
  assert.match(page, /dynamic = 'force-static'/)
  assert.match(page, /<CapturedRealityRouteClient \/>/)
  assert.doesNotMatch(page, /capturedRealityReleaseEnabled/)
  assert.doesNotMatch(page, /runtimeObject|sourceIds|exactLocation/)
  assert.match(client, /useSearchParams/)
  assert.match(client, /SAFE_ASSET_ID/)
})

test('route requires Firebase identity and obtains runtime media only through trusted callable functions', () => {
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /getCapturedRealityAsset/)
  assert.match(client, /getCapturedRealityRuntimeUrl/)
  assert.doesNotMatch(client, /drive\.google\.com/)
  assert.doesNotMatch(client, /runtimeObject/)
})

test('route watches both memory and location privacy authority and unmounts delivery after revocation', () => {
  assert.match(client, /privacyPolicy/)
  assert.match(client, /privacyRuntime/)
  assert.match(client, /domains\.\$\{field\}\.mode/)
  assert.match(client, /memory/)
  assert.match(client, /location/)
  assert.match(client, /setDelivery\(null\)/)
  assert.match(client, /setDecision\(suppressedDecision/)
})

test('route fails to semantic fallback when WebGL2 streaming prerequisites are unavailable', () => {
  assert.match(client, /capturedRealityBrowserCapability/)
  assert.match(client, /content-length/)
  assert.match(client, /method: 'HEAD'/)
  assert.match(client, /fallbackDecision/)
})

test('private signed delivery is renewed before expiry and failure closes the scene', () => {
  assert.match(client, /expires - Date\.now\(\) - 60_000/)
  assert.match(client, /private delivery could not be renewed/)
  assert.match(client, /loadRuntimeDelivery\(assetId, accessMode\)/)
})

test('route always provides a deterministic exit and provenance is redacted to safe metadata', () => {
  assert.match(client, /router\.back\(\)/)
  assert.match(client, /router\.push\('\/replay'\)/)
  assert.match(client, /View source and provenance|Captured Reality provenance/)
  assert.match(client, /Exact source locators and private location are intentionally not exposed/)
})

test('proof mode remains visibly separate while callable authority enforces the actual proof gate', () => {
  assert.match(client, /searchParams\.get\('proof'\) === '1'/)
  assert.match(client, /accessMode: 'runtime' \| 'proof'/)
  assert.match(client, /Private proof mode · not launch runtime/)
  assert.match(client, /capturedRealityDeviceTier/)
})
