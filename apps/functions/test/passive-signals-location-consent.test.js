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

async function fixture(domains = policy(), policyExists = true, options = {}) {
  const reads = [], writes = [], logs = [], allocatedIds = [], stagedWrites = []
  let currentDomains = domains, currentExists = policyExists, revision = 0, beforeCommitCalled = false, transactionAttempts = 0
  const changePolicy = (nextDomains, exists = true) => { currentDomains = nextDomains; currentExists = exists; revision += 1 }
  const policySnapshot = () => {
    const capturedDomains = structuredClone(currentDomains)
    return { exists: currentExists, get: (field) => field === 'domains' ? capturedDomains : undefined }
  }
  const beforeCommit = async () => {
    if (options.beforeCommit && !beforeCommitCalled) { beforeCommitCalled = true; await options.beforeCommit(changePolicy) }
  }
  const commit = (pending) => {
    if (options.commitError) throw options.commitError
    writes.push(...pending)
  }
  const db = {
    doc: (location) => ({ location, get: async () => {
      reads.push(location)
      return policySnapshot()
    } }),
    collection: (location) => ({ doc: () => {
      allocatedIds.push('synthetic-location-signal')
      return { id: 'synthetic-location-signal', location, set: async (data) => {
        await beforeCommit()
        commit([{ location, data: JSON.parse(JSON.stringify(data)) }])
      } }
    } }),
    // Deterministic optimistic-conflict model for actual handler behavior.
    // This is not the Firestore emulator or a claim about production lock timing.
    runTransaction: async (callback) => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        transactionAttempts += 1
        const pending = []
        let readRevision
        const transaction = {
          get: async (ref) => { readRevision = revision; return ref.get() },
          set: (ref, data) => {
            const write = { location: ref.location, data: JSON.parse(JSON.stringify(data)) }
            pending.push(write); stagedWrites.push(write)
          },
        }
        const result = await callback(transaction)
        await beforeCommit()
        if (readRevision !== revision) continue
        commit(pending)
        return result
      }
      throw new Error('Synthetic transaction retries exhausted')
    },
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
  return { record, reads, writes, logs, allocatedIds, stagedWrites, transactionAttempts: () => transactionAttempts }
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


const allSignalDomains = () => ({
  ...policy({ mode: 'granted', precise: true }),
  models: { mode: 'granted', modelContext: true },
  identity: { mode: 'granted', likenessEnabled: true },
})
const sensitivePayloads = {
  'voice-interaction': { transcript: 'Synthetic private transcript', toneTag: 'reflective', rawAudio: 'must-not-store' },
  'camera-emotion': { emotionTag: 'calm', colorTag: 'blue', rawImage: 'must-not-store' },
  location: { ...coordinates, precision: 'precise' },
}
const revocations = [
  ['location', 'location', { mode: 'denied', precise: true }, 'PASSIVE_SIGNAL_LOCATION_CONSENT_REQUIRED'],
  ['location', 'workforce', { mode: 'granted', automationEnabled: false }, 'PASSIVE_SIGNAL_AUTOMATION_CONSENT_REQUIRED'],
  ['motion', 'workforce', { mode: 'paused', automationEnabled: true }, 'PASSIVE_SIGNAL_AUTOMATION_CONSENT_REQUIRED'],
  ['voice-interaction', 'models', { mode: 'granted', modelContext: false }, 'PASSIVE_SIGNAL_MODEL_CONTEXT_CONSENT_REQUIRED'],
  ['voice-interaction', 'models', { mode: 'denied', modelContext: true }, 'PASSIVE_SIGNAL_MODEL_CONTEXT_CONSENT_REQUIRED'],
  ['camera-emotion', 'identity', { mode: 'granted', likenessEnabled: false }, 'PASSIVE_SIGNAL_LIKENESS_CONSENT_REQUIRED'],
  ['camera-emotion', 'identity', { mode: 'paused', likenessEnabled: true }, 'PASSIVE_SIGNAL_LIKENESS_CONSENT_REQUIRED'],
]

for (const [type, domain, replacement, message] of revocations) {
  test(`policy ${domain} revocation during ${type} persistence retries and denies without committing`, async () => {
    const initial = allSignalDomains()
    const f = await fixture(initial, true, { beforeCommit: (changePolicy) => changePolicy({ ...initial, [domain]: replacement }) })
    await assert.rejects(f.record(sensitivePayloads[type] || { intensity: 5 }, undefined, { type }), { code: 'permission-denied', message })
    assert.equal(f.writes.length, 0)
    assert.equal(f.transactionAttempts(), 2)
    assert.equal(f.stagedWrites.length, 1)
    assert.deepEqual(f.reads, [`users/${uid}/privacyPolicy/current`, `users/${uid}/privacyPolicy/current`])
    assert.deepEqual(f.allocatedIds, ['synthetic-location-signal'])
    assert.equal(f.logs.length, 0)
  })
}

test('policy deletion during persistence discards the staged signal and denies on retry', async () => {
  const f = await fixture(allSignalDomains(), true, { beforeCommit: (changePolicy) => changePolicy(undefined, false) })
  await assert.rejects(f.record(coordinates), { code: 'permission-denied', message: 'PASSIVE_SIGNAL_CONSENT_POLICY_REQUIRED' })
  assert.equal(f.writes.length, 0)
  assert.equal(f.transactionAttempts(), 2)
  assert.equal(f.logs.length, 0)
})

test('precise-to-approximate conflict retries minimization and commits one coarse signal with the same id', async () => {
  const initial = allSignalDomains()
  const f = await fixture(initial, true, { beforeCommit: (changePolicy) => changePolicy({ ...initial, location: { mode: 'limited', precise: false } }) })
  const result = await f.record({ ...coordinates, precision: 'precise', originalLatitude: coordinates.latitude, originalLongitude: coordinates.longitude })
  assert.deepEqual(stored(f), { source: 'browser', precision: 'approximate', ...approximate })
  assert.equal(f.transactionAttempts(), 2)
  assert.equal(f.stagedWrites.length, 2)
  assert.deepEqual(f.allocatedIds, ['synthetic-location-signal'])
  assert.equal(result.signalId, f.writes[0].data.signalId)
  assert.equal(f.logs.length, 0)
})

for (const type of ['voice-interaction', 'camera-emotion']) {
  test(`unchanged ${type} consent commits one minimized sensitive signal`, async () => {
    const f = await fixture(allSignalDomains())
    const result = await f.record(sensitivePayloads[type], undefined, { type })
    assert.equal(result.accepted, true)
    assert.equal(f.writes.length, 1)
    assert.equal(f.writes[0].location, `users/${uid}/${type === 'voice-interaction' ? 'voiceEvents' : 'behaviorSignals'}`)
    assert.equal(f.writes[0].data.ownerId, uid)
    assert.equal(f.writes[0].data.privacyClass, 'sensitive')
    assert.equal(f.writes[0].data.rawMediaStored, false)
    assert.equal(f.writes[0].data.payload[type === 'voice-interaction' ? 'rawAudioStored' : 'rawImageStored'], false)
    assert.equal(Object.hasOwn(f.writes[0].data.payload, 'rawAudio'), false)
    assert.equal(Object.hasOwn(f.writes[0].data.payload, 'rawImage'), false)
    assert.equal(f.transactionAttempts(), 1)
    assert.equal(f.logs.length, 0)
  })
}

test('failed commit never returns accepted and never leaves a committed signal', async () => {
  const f = await fixture(allSignalDomains(), true, { commitError: new Error('Synthetic storage unavailable') })
  await assert.rejects(f.record(coordinates), { message: 'Synthetic storage unavailable' })
  assert.equal(f.writes.length, 0)
  assert.equal(f.logs.length, 0)
})

test('unsupported signal rejects before reading policy or starting a transaction', async () => {
  const f = await fixture()
  await assert.rejects(f.record({}, undefined, { type: 'unsupported' }), { code: 'invalid-argument' })
  assert.equal(f.reads.length, 0)
  assert.equal(f.transactionAttempts(), 0)
  assert.equal(f.writes.length, 0)
})
