import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/api/maps/elevation/route.ts', import.meta.url), 'utf8')

test('Elevation is authenticated and server credential stays server-only', () => {
  assert.match(source, /verifyFirebaseUser\(request\)/)
  assert.match(source, /URAI_ELEVATION_SERVER_CREDENTIAL/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_/)
  assert.match(source, /cache-control.*private, no-store/)
})

test('Elevation validates coordinates and bounds provider execution', () => {
  assert.match(source, /validCoordinate\(latitude, -90, 90\)/)
  assert.match(source, /validCoordinate\(longitude, -180, 180\)/)
  assert.match(source, /AbortController/)
  assert.match(source, /8000/)
  assert.match(source, /maps\.googleapis\.com\/maps\/api\/elevation\/json/)
})

test('Elevation returns normalized output without provider key or raw payload', () => {
  assert.match(source, /elevationMeters:/)
  assert.match(source, /resolutionMeters:/)
  assert.match(source, /source: 'google-maps-elevation'/)
  assert.doesNotMatch(source, /return NextResponse\.json\(payload/)
})
