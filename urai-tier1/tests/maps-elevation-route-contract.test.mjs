import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/api/maps/elevation/route.ts', import.meta.url), 'utf8')
const functionSource = fs.readFileSync(new URL('../../apps/functions/src/mapsElevation.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const hosting = JSON.parse(fs.readFileSync(new URL('../../firebase.static.json', import.meta.url), 'utf8'))

function actualElevationHandler(kind, { authenticated = true, enabledLabels = false } = {}) {
  const counters = { credentialReads: 0, providerCalls: 0, rateWrites: 0, tokenChecks: 0 }
  const env = new Proxy({ URAI_FIREBASE_STATIC_EXPORT: 'false', URAI_ELEVATION_SERVER_CREDENTIAL: 'SYNTHETIC-KEY', URAI_ELEVATION_SPEND_APPROVED: String(enabledLabels), URAI_PROVIDER_SPEND_ENABLED: String(enabledLabels) }, {
    get(object, key) { if (key === 'URAI_ELEVATION_SERVER_CREDENTIAL') counters.credentialReads++; return object[key] },
  })
  class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
  const db = { doc: path => ({ path }), runTransaction: async callback => callback({ get: async () => ({ data: () => ({}) }), set() { counters.rateWrites++ } }) }
  const firestore = Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => null } })
  const imports = {
    'firebase-admin': { apps: [{}], firestore, auth: () => ({ verifyIdToken: async (_token, checkRevoked) => { counters.tokenChecks++; assert.equal(checkRevoked, true); if (!authenticated) throw new Error('SYNTHETIC REVOKED'); return { uid: 'synthetic-owner' } } }) },
    'firebase-functions/params': { defineSecret: () => ({ value: () => { counters.credentialReads++; return 'SYNTHETIC-KEY' } }) },
    'firebase-functions/v2/https': { onRequest: (_options, handler) => handler },
    'firebase-admin/firestore': { getFirestore: () => db, Timestamp, FieldValue: firestore.FieldValue },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/server/firebase-user': { verifyFirebaseUser: async () => authenticated ? 'synthetic-owner' : null },
  }
  const module = { exports: {} }
  const compiled = ts.transpileModule(kind === 'functions' ? functionSource : source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(imports[name], `unexpected dependency ${name}`); return imports[name] }, process: { env }, URL, Date, AbortController, setTimeout, clearTimeout, fetch: async () => { counters.providerCalls++; return { ok: true, json: async () => ({ status: 'OK', results: [{ elevation: 123, resolution: 1 }] }) } } })
  return {
    counters,
    async invoke(body = { latitude: 1, longitude: 2 }, method = 'POST') {
      if (kind === 'next') return module.exports.POST({ method, json: async () => body })
      const result = { body: null, status: null }
      const response = { setHeader() {}, on() {}, status(value) { result.status = value; return this }, json(value) { result.body = value; return this } }
      await module.exports.mapsElevationProvider({ method, body, headers: { authorization: 'Bearer SYNTHETIC' } }, response)
      return result
    },
  }
}

for (const kind of ['functions', 'next']) {
  test(`actual ${kind} Elevation leaf cannot spend using a configured key or enabled approval labels`, async () => {
    for (const enabledLabels of [false, true]) {
      const f = actualElevationHandler(kind, { enabledLabels }), result = await f.invoke()
      assert.equal(result.status, 503); assert.equal(result.body.error, 'elevation_protected_spend_required')
      assert.equal(f.counters.credentialReads, 0); assert.equal(f.counters.providerCalls, 0); assert.equal(f.counters.rateWrites, 0)
    }
  })
  test(`actual ${kind} Elevation quarantine preserves authentication and coordinate validation`, async () => {
    const revoked = actualElevationHandler(kind, { authenticated: false })
    assert.equal((await revoked.invoke()).status, 401)
    for (const body of [{ latitude: 91, longitude: 2 }, { latitude: 1, longitude: 181 }, { latitude: '1', longitude: 2 }]) {
      const invalid = actualElevationHandler(kind)
      assert.equal((await invalid.invoke(body)).status, 400)
      assert.equal(invalid.counters.providerCalls, 0); assert.equal(invalid.counters.credentialReads, 0)
    }
  })
}

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

test('deployed Elevation rate-limits per uid before the billable provider fetch', () => {
  assert.match(functionSource, /providerRateLimits\/maps-elevation/)
  assert.match(functionSource, /db\.runTransaction\(async \(transaction\) =>/)
  assert.match(functionSource, /RATE_WINDOW_MS = 60_000/)
  assert.match(functionSource, /RATE_LIMIT_MAX = 12/)
  assert.match(functionSource, /throw new ElevationError\(429, 'rate_limited'\)/)
  const limiterIndex = functionSource.indexOf('await consumeElevationRateLimit(uid)')
  const fetchIndex = functionSource.indexOf('await fetch(url')
  assert.ok(limiterIndex > -1 && fetchIndex > limiterIndex)
})

test('standalone Next Elevation route rate-limits per uid before provider fetch', () => {
  assert.match(source, /providerRateLimits\/maps-elevation/)
  assert.match(source, /db\.runTransaction\(async \(transaction\) =>/)
  assert.match(source, /RATE_WINDOW_MS = 60_000/)
  assert.match(source, /RATE_LIMIT_MAX = 12/)
  assert.match(source, /error: 'rate_limited'/)
  const limiterIndex = source.indexOf('await consumeElevationRateLimit(uid)')
  const fetchIndex = source.indexOf('await fetch(url')
  assert.ok(limiterIndex > -1 && fetchIndex > limiterIndex)
})

test('deployed Elevation aborts provider fetch only when the response disconnects early', () => {
  assert.match(functionSource, /response\.on\('close', \(\) => \{ if \(!response\.writableEnded\) controller\.abort\(\) \}\)/)
  assert.doesNotMatch(functionSource, /request\.on\('close',/)
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
