const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

const uid = 'synthetic-location-owner'
const coordinates = { latitude: 37.4219999, longitude: -122.0840575, accuracyMeters: 8 }
const approximate = { latitude: 37.42, longitude: -122.08, accuracyMeters: 1000 }
const policy = (location = { mode: 'limited', precise: false }) => ({
  workforce: { mode: 'granted', automationEnabled: true }, location,
})

class HttpsError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

async function fixture(domains = policy(), policyExists = true) {
  const reads = [], writes = [], logs = []
  const db = {
    doc: (location) => ({ get: async () => {
      reads.push(location)
      return { exists: policyExists, get: (field) => field === 'domains' ? domains : undefined }
    } }),
    collection: (location) => ({ doc: () => ({ id: 'synthetic-location-signal', set: async (data) => {
      writes.push({ location, data: JSON.parse(JSON.stringify(data)) })
    } }) }),
  }
  const functions = { https: { HttpsError }, region: () => ({ https: { onCall: (callback) => callback } }) }
  const admin = { apps: ['synthetic'], firestore: Object.assign(() => db, {
    FieldValue: { serverTimestamp: () => 'synthetic-server-timestamp' },
  }) }
  const console = Object.fromEntries(['log', 'info', 'debug', 'warn', 'error'].map((method) => [method, (...args) => logs.push(args)]))
  let handler

  // Local fallback runs the real TypeScript module through Node's built-in parser.
  // Native CI omits this flag and exercises the actual strict-tsc CommonJS output.
  if (process.env.URAI_PASSIVE_SIGNAL_SOURCE_TEST === '1') {
    const { stripTypeScriptTypes } = require('node:module')
    const filename = path.resolve(__dirname, '../src/passiveSignals.ts')
    const context = vm.createContext({ console })
    const module = new vm.SourceTextModule(stripTypeScriptTypes(fs.readFileSync(filename, 'utf8')), { context, identifier: filename })
    await module.link((name) => {
      const dependency = name === 'firebase-admin' ? admin : name === 'firebase-functions/v1' ? functions : undefined
      assert.ok(dependency, `Unexpected module dependency: ${name}`)
      return new vm.SyntheticModule(Object.keys(dependency), function () {
        for (const [key, value] of Object.entries(dependency)) this.setExport(key, value)
      }, { context })
    })
    await module.evaluate()
    handler = module.namespace.recordPassiveSignal
  } else {
    const filename = path.resolve(__dirname, '../lib/apps/functions/src/passiveSignals.js')
    const module = { exports: {} }
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, console,
      require: (name) => {
        if (name === 'firebase-admin') return admin
        if (name === 'firebase-functions/v1') return functions
        throw new Error(`Unexpected module dependency: ${name}`)
      },
    }, { filename })
    handler = module.exports.recordPassiveSignal
  }

  const record = (payload, context = { auth: { uid } }, extra = {}) => handler({ type: 'location', payload, ...extra }, context)
  return { record, reads, writes, logs }
}

function stored(f) {
  assert.equal(f.writes.length, 1)
  assert.equal(f.writes[0].location, `users/${uid}/locations`)
  assert.equal(f.writes[0].data.ownerId, uid)
  assert.equal(f.writes[0].data.rawMediaStored, false)
  return f.writes[0].data.payload
}

for (const precision of ['approximate', undefined, null, '', 'unknown', 'precise', true, { precise: true }]) {
  test(`server approximate consent coarsens coordinates for client precision ${JSON.stringify(precision)}`, async () => {
    const f = await fixture()
    const result = await f.record({ ...coordinates, precision, originalLatitude: coordinates.latitude, originalLongitude: coordinates.longitude })
    assert.deepEqual(stored(f), { source: 'browser', precision: 'approximate', ...approximate })
    assert.deepEqual(JSON.parse(JSON.stringify(result)), { accepted: true, signalId: 'synthetic-location-signal', type: 'location', rawMediaStored: false })
    assert.deepEqual(f.reads, [`users/${uid}/privacyPolicy/current`])
    assert.equal(f.logs.length, 0)
  })
}

for (const precise of [undefined, null, 'true', 1, {}, []]) {
  test(`only server boolean true authorizes precision: ${JSON.stringify(precise)}`, async () => {
    const f = await fixture(policy({ mode: 'granted', precise }))
    await f.record({ ...coordinates, precision: 'approximate', precise: true, consent: { precise: true } }, undefined, { domains: policy({ mode: 'granted', precise: true }) })
    assert.deepEqual(stored(f), { source: 'browser', precision: 'approximate', ...approximate })
  })
}

for (const precision of ['precise', 'approximate']) {
  test(`explicit server precise consent preserves existing ${precision} payload behavior`, async () => {
    const f = await fixture(policy({ mode: 'granted', precise: true }))
    await f.record({ ...coordinates, precision })
    assert.deepEqual(stored(f), { source: 'browser', precision, ...coordinates })
  })
}

test('coarse retention keeps a larger sensor radius and normalizes numeric coordinate input', async () => {
  const f = await fixture()
  await f.record({ latitude: '-33.8688197', longitude: '151.2092955', accuracyMeters: 8000, precision: 'approximate' })
  assert.deepEqual(stored(f), { source: 'browser', precision: 'approximate', latitude: -33.87, longitude: 151.21, accuracyMeters: 8000 })
})

test('invalid coordinates are omitted and an absent accuracy receives the coarse floor', async () => {
  const f = await fixture()
  await f.record({ latitude: Infinity, longitude: 181, precision: 'approximate' })
  assert.deepEqual(stored(f), { source: 'browser', precision: 'approximate', accuracyMeters: 1000 })
})

for (const mode of ['paused', 'denied', 'unknown']) {
  test(`location ${mode} consent rejects before storing any signal`, async () => {
    const f = await fixture(policy({ mode, precise: true }))
    await assert.rejects(f.record({ ...coordinates, precision: 'precise' }), { code: 'permission-denied', message: 'PASSIVE_SIGNAL_LOCATION_CONSENT_REQUIRED' })
    assert.equal(f.writes.length, 0)
    assert.equal(f.logs.length, 0)
  })
}

test('missing location consent rejects even when client supplies an authorized policy', async () => {
  const f = await fixture({ workforce: { mode: 'granted', automationEnabled: true } })
  await assert.rejects(f.record(coordinates, undefined, { domains: policy({ mode: 'granted', precise: true }) }), { code: 'permission-denied' })
  assert.equal(f.writes.length, 0)
})

test('missing server policy rejects without retaining coordinates', async () => {
  const f = await fixture(undefined, false)
  await assert.rejects(f.record(coordinates), { code: 'permission-denied', message: 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED' })
  assert.equal(f.writes.length, 0)
})

test('workforce automation denial rejects despite location consent', async () => {
  const f = await fixture({ ...policy({ mode: 'granted', precise: true }), workforce: { mode: 'granted', automationEnabled: false } })
  await assert.rejects(f.record(coordinates), { code: 'permission-denied', message: 'PASSIVE_SIGNAL_AUTOMATION_CONSENT_REQUIRED' })
  assert.equal(f.writes.length, 0)
})

test('unauthenticated request cannot read policy or retain coordinates', async () => {
  const f = await fixture()
  await assert.rejects(f.record(coordinates, {}), { code: 'unauthenticated' })
  assert.equal(f.reads.length, 0)
  assert.equal(f.writes.length, 0)
})
