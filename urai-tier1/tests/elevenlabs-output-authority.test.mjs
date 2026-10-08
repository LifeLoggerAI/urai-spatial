import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../../apps/functions/src/providerFunctions.ts', import.meta.url), 'utf8')

// Execute the current handler with explicit SDK/transport boundaries. The spend
// gateway is independently tested; these cases authorize no real paid request.
function fixture(options = {}) {
  const output = { status: null, error: null, bytes: 0, destroyed: false, ended: false, cancelled: 0, released: 0, calls: 0, checks: 0 }
  const records = { policy: { domains: { models: { mode: 'granted', modelContext: true } }, enforcement: { state: 'fully-enforced' } },
    connection: { processingAllowed: true }, uid: 'synthetic-owner' }
  const events = new Map(), timers = new Map()
  let timerId = 0, index = 0, signal
  const snapshot = data => ({ exists: true, data: () => data })
  const database = { doc: path => ({ get: async () => snapshot(path.includes('privacyPolicy') ? records.policy : path.includes('providerConnections') ? records.connection : {}), set: async () => {} }),
    runTransaction: async run => run({ get: async () => snapshot({}), set() {} }) }
  const firestore = Object.assign(() => database, { Timestamp: class { static fromMillis(value) { return { toMillis: () => value } } }, FieldValue: { serverTimestamp: () => 0 } })
  const exports = {}
  const reader = {
    async read() {
      await options.onRead?.(index, { records, events, timers, signal })
      const chunks = options.chunks ?? [16, 16]
      return index < chunks.length ? { done: false, value: Buffer.alloc(chunks[index++]) } : { done: true }
    },
    async cancel() { output.cancelled++ },
    releaseLock() { output.released++ },
  }
  const transport = async (_database, _uid, lane, provider, _model, _input, target, init) => {
    output.calls++
    assert.equal(lane, 'narrator-voice'); assert.equal(provider, 'elevenlabs')
    assert.equal(new URL(target).origin, 'https://api.elevenlabs.io')
    signal = init.signal
    assert.equal(timers.size, 1, 'deadline must remain active through the response')
    await options.onProvider?.({ records, events, timers, signal })
    return { ok: true, status: 200, headers: { get: name => name === 'content-length' ? options.declared ?? null : name === 'content-type' ? 'audio/mpeg' : null }, body: { getReader: () => reader } }
  }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports, require: id => id === 'firebase-admin' ? { apps: [{}], firestore, auth: () => ({ verifyIdToken: async (_token, checkRevoked) => { assert.equal(checkRevoked, true); if (records.uid === 'revoked') throw new Error('synthetic-revoked'); return { uid: records.uid } } }) }
      : id === 'firebase-functions/params' ? { defineSecret: () => ({ value: () => 'synthetic-key' }) }
      : id === 'firebase-functions/v2/https' ? { onRequest: (_options, handler) => handler }
      : id.endsWith('contentLanguage') ? { contentLanguage: () => ({ speechTag: 'en-US' }), URAI_CONTENT_LANGUAGE_TAGS: ['en-US'] }
      : id === './protectedProviderSpend' ? { paidSpatialFetch: transport, assertSpatialPaidOutputCurrent: () => { output.checks++; options.onOutputCheck?.(output.checks) }, SpatialSpendError: class extends Error {}, SPATIAL_SPEND_WORKER_TOKENS_JSON: {} }
      : require(id),
    process: { env: { ELEVENLABS_ALLOWED_VOICE_IDS: 'synthetic', ELEVENLABS_DEFAULT_VOICE_ID: 'synthetic', ELEVENLABS_MAX_RESPONSE_BYTES: options.limit ?? '32' } },
    Buffer, URL, AbortController,
    setTimeout: (callback, delay) => { const key = ++timerId; timers.set(key, { callback, delay }); return key },
    clearTimeout: key => timers.delete(key), console: { warn() {} },
  })
  const response = {
    headersSent: false,
    status(value) { output.status = value; return this },
    json(value) { output.error = value.error; this.headersSent = true }, setHeader() {},
    write(value) { this.headersSent = true; output.bytes += value.length },
    end() { output.ended = true }, destroy() { output.destroyed = true },
    on: (event, callback) => events.set('response:' + event, callback),
  }
  return { output, records, timers, invoke: async () => {
    await exports.elevenLabsVoiceProvider({ method: 'POST', headers: { authorization: 'Bearer synthetic-current-token' }, body: { text: 'Synthetic source', externalProcessingConsent: true }, on: (event, callback) => events.set(event, callback) }, response)
    assert.equal(timers.size, 0, 'all deadline/cleanup timers are released')
    return output
  } }
}

test('small exact-limit output is complete under current token, consent and spend authority', async () => {
  const result = await fixture({ declared: '32' }).invoke()
  assert.equal(result.bytes, 32); assert.equal(result.status, 200); assert.equal(result.destroyed, false)
  assert.equal(result.ended, true); assert.equal(result.cancelled, 0); assert.equal(result.released, 1)
  assert.ok(result.checks >= 5)
})
test('oversized declared length is denied before any output bytes', async () => {
  const result = await fixture({ declared: '65', chunks: [65] }).invoke()
  assert.equal(result.bytes, 0); assert.equal(result.error, 'ELEVENLABS_RESPONSE_TOO_LARGE'); assert.equal(result.cancelled, 1)
})
test('crossing the actual stream limit cancels upstream and fails the incomplete response', async () => {
  const result = await fixture({ chunks: [20, 20] }).invoke()
  assert.equal(result.bytes, 20); assert.equal(result.cancelled, 1); assert.equal(result.destroyed, true); assert.equal(result.ended, false)
})
for (const declared of ['bad', '-1', '1.5', '9007199254740992']) test(`invalid declared length ${declared} cannot become output authority`, async () => {
  const result = await fixture({ declared }).invoke(); assert.equal(result.bytes, 0); assert.equal(result.cancelled, 1)
})
for (const limit of ['NaN', 'Infinity', '0', '-1', '1.5', '9007199254740992', '']) test(`invalid configured limit ${JSON.stringify(limit)} prevents provider admission`, async () => {
  const result = await fixture({ limit }).invoke(); assert.equal(result.error, 'ELEVENLABS_OUTPUT_LIMIT_INVALID'); assert.equal(result.calls, 0)
})
const withdrawals = {
  'model consent': records => { records.policy.domains.models.mode = 'denied' },
  'provider consent': records => { records.connection.revocationState = 'requested' },
  'account identity': records => { records.uid = 'other-owner' },
  'revoked token': records => { records.uid = 'revoked' },
  'pending privacy projection': records => { records.policy.enforcement.state = 'pending' },
}
for (const [name, withdraw] of Object.entries(withdrawals)) {
  test(`${name} withdrawal during provider await emits no bytes`, async () => {
    const result = await fixture({ onProvider: ({ records }) => withdraw(records) }).invoke()
    assert.equal(result.bytes, 0); assert.equal(result.cancelled, 1); assert.notEqual(result.status, 200)
  })
  test(`${name} withdrawal during stream read suppresses the stale chunk`, async () => {
    const result = await fixture({ onRead: (index, { records }) => { if (index === 1) withdraw(records) } }).invoke()
    assert.equal(result.bytes, 16); assert.equal(result.cancelled, 1); assert.equal(result.destroyed, true); assert.equal(result.ended, false)
  })
}
for (const event of ['close', 'response:close', 'deadline']) test(`${event} during read cancels and suppresses the awaited chunk`, async () => {
  const result = await fixture({ onRead: (index, { events, timers }) => { if (index === 0) event === 'deadline' ? [...timers.values()].find(timer => timer.delay === 15000).callback() : events.get(event)() } }).invoke()
  assert.equal(result.bytes, 0); assert.equal(result.cancelled > 0, true); assert.notEqual(result.status, 200)
})
test('spend authority expiry after the read cannot be forwarded as valid output', async () => {
  const result = await fixture({ onOutputCheck: count => { if (count === 3) throw new Error('synthetic-expired-spend-window') } }).invoke()
  assert.equal(result.bytes, 0); assert.equal(result.cancelled, 1)
})
