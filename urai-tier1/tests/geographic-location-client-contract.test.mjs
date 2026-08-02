import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/location-map/geographic/GeographicLocationClient.tsx', import.meta.url), 'utf8')

test('authoritative Consent Sanctuary policy gates geographic collection', () => {
  assert.match(source, /users', user\.uid, 'privacyPolicy', 'current'/)
  assert.match(source, /locationPolicy\.mode === 'denied' \|\| locationPolicy\.mode === 'paused'/)
  assert.match(source, /requestBlockedByAuthority/)
  assert.match(source, /Browser geolocation was not requested/)
})

test('exact private storage requires an authenticated precise-location grant', () => {
  assert.match(source, /const exactPrivateAllowed = Boolean\(user\).*locationPolicy\.precise/)
  assert.match(source, /disabled=\{value === 'exact-private' && !exactPrivateAllowed\}/)
  assert.match(source, /precision === 'exact-private' && !exactPrivateAllowed \? 'approximate'/)
  assert.match(source, /applyPrecision\(received, 'approximate'\)/)
})

test('permission revocation clears local consent and coordinates', () => {
  assert.match(source, /status\.state === 'denied' \|\| status\.state === 'prompt'/)
  assert.match(source, /localStorage\.removeItem\(LOCATION_CONSENT_KEY\)/)
  assert.match(source, /setCoordinate\(null\)/)
  assert.match(source, /retained no coordinate in memory/)
})

test('local deletion remains complete across corrupt data and multiple tabs', () => {
  assert.match(source, /window\.addEventListener\('storage', syncStorage\)/)
  assert.match(source, /Location pins were deleted in another tab/)
  assert.match(source, /const current = inspectStoredPins\(localStorage\.getItem\(LOCATION_PINS_KEY\)\)/)
  assert.match(source, /An unreadable local location record was removed/)
  assert.match(source, /disabled=\{!storedPinsPresent && !pins\.length\}/)
})
