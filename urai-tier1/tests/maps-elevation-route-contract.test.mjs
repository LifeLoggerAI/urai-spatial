import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/api/maps/elevation/route.ts', import.meta.url), 'utf8')
const functionSource = fs.readFileSync(new URL('../../apps/functions/src/mapsElevation.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const hosting = JSON.parse(fs.readFileSync(new URL('../../firebase.static.json', import.meta.url), 'utf8'))

test('Elevation is authenticated and server credential stays server-only', () => {
  assert.match(source, /verifyFirebaseUser\(request\)/)
  assert.match(source, /URAI_ELEVATION_SERVER_CREDENTIAL/)
  assert.doesNotMatch(source, /NEXT_PUBLIC_/)
  assert.match(source, /cache-control.*private, no-store/)
})

test('deployed Elevation maps rejected Firebase tokens to authentication_required', () => {
  assert.match(functionSource, /try \{[\s\S]*verifyIdToken\(token, true\)[\s\S]*catch \(error\)/)
  assert.match(functionSource, /throw new ElevationError\(401, 'authentication_required'\)/)
  assert.doesNotMatch(functionSource, /verifyIdToken\(token, true\)\n  if \(!decoded\.uid\)/)
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


test('Elevation is bound to the governed deployed Functions runtime', () => {
  assert.match(functionSource, /mapsElevationProvider = onRequest/)
  assert.match(functionSource, /defineSecret\('URAI_ELEVATION_SERVER_CREDENTIAL'\)/)
  assert.match(functionSource, /verifyIdToken\(token, true\)/)
  assert.match(functionSource, /validCoordinate\(latitude, -90, 90\)/)
  assert.match(functionSource, /validCoordinate\(longitude, -180, 180\)/)
  assert.match(functionSource, /maps\.googleapis\.com\/maps\/api\/elevation\/json/)
  assert.match(functionIndex, /mapsElevationProvider/)
  const rewrite = hosting.hosting.rewrites.find((entry) => entry.source === '/api/maps/elevation')
  assert.deepEqual(rewrite, { source: '/api/maps/elevation', function: { functionId: 'mapsElevationProvider', region: 'us-central1' } })
})
