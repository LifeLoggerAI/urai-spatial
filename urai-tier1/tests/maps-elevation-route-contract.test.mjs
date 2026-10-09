import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/app/api/maps/elevation/route.ts', import.meta.url), 'utf8')
const functionSource = fs.readFileSync(new URL('../../apps/functions/src/mapsElevation.ts', import.meta.url), 'utf8')
const protectedSource = fs.readFileSync(new URL('../../apps/functions/src/protectedProviderSpend.ts', import.meta.url), 'utf8')
const resultSource = fs.readFileSync(new URL('../../apps/functions/src/mapsElevationResult.ts', import.meta.url), 'utf8')
const functionIndex = fs.readFileSync(new URL('../../apps/functions/src/index.ts', import.meta.url), 'utf8')
const hosting = JSON.parse(fs.readFileSync(new URL('../../firebase.static.json', import.meta.url), 'utf8'))

function actualElevationHandler(kind, { authenticated = true, enabledLabels = false, admitted = false, revokeAt = Infinity, authorityExpired = false } = {}) {
  const counters = { credentialReads: 0, providerCalls: 0, rateWrites: 0, tokenChecks: 0 }
  const env = new Proxy({ URAI_FIREBASE_STATIC_EXPORT: 'false', URAI_ELEVATION_SERVER_CREDENTIAL: 'SYNTHETIC-KEY', URAI_ELEVATION_SPEND_APPROVED: String(enabledLabels), URAI_PROVIDER_SPEND_ENABLED: String(enabledLabels) }, {
    get(object, key) { if (key === 'URAI_ELEVATION_SERVER_CREDENTIAL') counters.credentialReads++; return object[key] },
  })
  class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } static fromMillis(value) { return new Timestamp(value) } }
  const db = { doc: path => ({ path }), runTransaction: async callback => callback({ get: async () => ({ data: () => ({}) }), set() { counters.rateWrites++ } }) }
  const firestore = Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => null } })
  class SpatialSpendError extends Error {}
  class ElevationResultError extends Error {}
  const currentOwner = () => { counters.tokenChecks++; return authenticated && counters.tokenChecks < revokeAt ? 'synthetic-owner' : null }
  const protectedExecutor = { SpatialSpendError, SPATIAL_SPEND_WORKER_TOKENS_JSON:{}, assertSpatialPaidOutputCurrent: () => { if(authorityExpired)throw new SpatialSpendError() }, paidSpatialElevationFetch: async (_db, uid, input, key, signal, beforeReserve) => {
    assert.equal(uid,'synthetic-owner');assert.equal(key,'SYNTHETIC-KEY');assert.ok(signal)
    if(!admitted)throw new SpatialSpendError()
    await beforeReserve()
    await beforeReserve()
    counters.providerCalls++;return new Response('SYNTHETIC')
  } }
  const normalizedResult = { ElevationResultError, readNormalizedElevation: async () => ({elevationMeters:123,resolutionMeters:1,source:'google-maps-elevation'}) }
  const imports = {
    'firebase-admin': { apps: [{}], firestore, auth: () => ({ verifyIdToken: async (_token, checkRevoked) => { assert.equal(checkRevoked, true); const uid=currentOwner();if(!uid)throw new Error('SYNTHETIC REVOKED');return { uid } } }) },
    'firebase-functions/params': { defineSecret: () => ({ value: () => { counters.credentialReads++; return 'SYNTHETIC-KEY' } }) },
    'firebase-functions/v2/https': { onRequest: (_options, handler) => handler },
    'firebase-admin/firestore': { getFirestore: () => db, Timestamp, FieldValue: firestore.FieldValue },
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    '@/lib/server/firebase-user': { verifyFirebaseUser: async () => currentOwner() },
    './protectedProviderSpend': protectedExecutor,
    './mapsElevationResult': normalizedResult,
    '../../../../../../apps/functions/src/protectedProviderSpend': protectedExecutor,
    '../../../../../../apps/functions/src/mapsElevationResult': normalizedResult,
  }
  const module = { exports: {} }
  const compiled = ts.transpileModule(kind === 'functions' ? functionSource : source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(imports[name], `unexpected dependency ${name}`); return imports[name] }, process: { env }, URL, Date, Response, AbortController, AbortSignal, setTimeout, clearTimeout, fetch: async () => { throw new Error('Direct provider HTTP is forbidden') } })
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
      assert.equal(f.counters.providerCalls, 0); assert.equal(f.counters.rateWrites, 0)
    }
  })
  test(`actual ${kind} Elevation executor preserves authentication and coordinate validation`, async () => {
    const revoked = actualElevationHandler(kind, { authenticated: false })
    assert.equal((await revoked.invoke()).status, 401)
    for (const body of [{ latitude: 91, longitude: 2 }, { latitude: 1, longitude: 181 }, { latitude: '1', longitude: 2 }]) {
      const invalid = actualElevationHandler(kind)
      assert.equal((await invalid.invoke(body)).status, 400)
      assert.equal(invalid.counters.providerCalls, 0); assert.equal(invalid.counters.credentialReads, 0)
    }
  })
  test(`actual ${kind} Elevation leaf checks owner before reservation, before dispatch and before output`,async()=>{
    const allowed=actualElevationHandler(kind,{admitted:true}),result=await allowed.invoke()
    assert.equal(result.status,200);assert.deepEqual(JSON.parse(JSON.stringify(result.body)),{elevationMeters:123,resolutionMeters:1,source:'google-maps-elevation',subject:'synthetic-owner'})
    assert.equal(allowed.counters.tokenChecks,4);assert.equal(allowed.counters.rateWrites,1)
    assert.equal(allowed.counters.providerCalls,1)
    for(const revokeAt of [2,3,4]){
      const revoked=actualElevationHandler(kind,{admitted:true,revokeAt}),result=await revoked.invoke()
      assert.equal(result.status,401);assert.equal(result.body.error,'authentication_required')
      assert.equal(revoked.counters.providerCalls,revokeAt<=3?0:1)
      assert.equal(revoked.counters.tokenChecks,revokeAt)
      assert.equal(revoked.counters.rateWrites,1)
    }
    const expired=actualElevationHandler(kind,{admitted:true,authorityExpired:true})
    assert.equal((await expired.invoke()).status,503)
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
  assert.ok(limiterIndex > -1)
  assert.match(functionSource, /let rateConsumed = false/)
  assert.match(functionSource, /paidSpatialElevationFetch\([^\n]+async \(\) => \{\s+if \(!rateConsumed\) \{\s+await consumeElevationRateLimit\(uid\)\s+rateConsumed = true\s+\}\s+if \(await authenticatedUid\(request\) !== uid\)/)
  assert.doesNotMatch(functionSource,/await fetch\(/)
})

test('standalone Next Elevation route rate-limits per uid before provider fetch', () => {
  assert.match(source, /providerRateLimits\/maps-elevation/)
  assert.match(source, /db\.runTransaction\(async \(transaction\) =>/)
  assert.match(source, /RATE_WINDOW_MS = 60_000/)
  assert.match(source, /RATE_LIMIT_MAX = 12/)
  assert.match(source, /throw new Error\('rate_limited'\)/)
  const limiterIndex = source.indexOf('await consumeElevationRateLimit(uid)')
  assert.ok(limiterIndex > -1)
  assert.match(source, /let rateConsumed = false/)
  assert.match(source, /paidSpatialElevationFetch\([^\n]+async \(\) => \{\s+if \(!rateConsumed\) \{[\s\S]*?if \(!allowed\) throw new Error\('rate_limited'\)\s+rateConsumed = true\s+\}\s+if \(await verifyFirebaseUser\(request\) !== uid\)/)
  assert.doesNotMatch(source,/await fetch\(/)
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
  assert.match(protectedSource, /maps\.googleapis\.com\/maps\/api\/elevation\/json/)
})

test('Elevation returns normalized output without provider key or raw payload', () => {
  assert.match(resultSource, /elevationMeters:/)
  assert.match(resultSource, /resolutionMeters:/)
  assert.match(resultSource, /source: 'google-maps-elevation'/)
  assert.match(source,/assertSpatialPaidOutputCurrent\(response\)/)
  assert.doesNotMatch(source, /return NextResponse\.json\(payload/)
})


test('Elevation is bound to the governed deployed Functions runtime', () => {
  assert.match(functionSource, /mapsElevationProvider = onRequest/)
  assert.match(functionSource, /defineSecret\('URAI_ELEVATION_SERVER_CREDENTIAL'\)/)
  assert.match(functionSource, /verifyIdToken\(token, true\)/)
  assert.match(functionSource, /validCoordinate\(latitude, -90, 90\)/)
  assert.match(functionSource, /validCoordinate\(longitude, -180, 180\)/)
  assert.match(functionSource, /paidSpatialElevationFetch/)
  assert.match(functionSource, /SPATIAL_SPEND_WORKER_TOKENS_JSON/)
  assert.match(functionIndex, /mapsElevationProvider/)
  const rewrite = hosting.hosting.rewrites.find((entry) => entry.source === '/api/maps/elevation')
  assert.deepEqual(rewrite, { source: '/api/maps/elevation', function: { functionId: 'mapsElevationProvider', region: 'us-central1' } })
})
