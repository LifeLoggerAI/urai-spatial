'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')

const uid = 'synthetic-export-owner', jobId = 'synthetic-export-job', prefix = `users/${uid}`
const policyPath = `${prefix}/privacyPolicy/current`, jobPath = `${prefix}/exportJobs/${jobId}`
const fencePath = `${prefix}/privacyRuntime/exportAuthority`, receiptPath = `${prefix}/privacyReceipts/synthetic-receipt`
const exportPath = `private-exports/${uid}/${jobId}/export.json`
const now = 1800000000000
const domains = Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(domain => [domain, {
  mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
  modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false,
}]))

function fixture(options = {}) {
  class Timestamp { constructor(value) { this.value = value }; toMillis() { return this.value }; toDate() { return new Date(this.value) }; static fromMillis(value) { return new Timestamp(value) } }
  const clone = value => value instanceof Timestamp ? new Timestamp(value.value) : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value
  const records = new Map([
    [prefix, { ownerId: uid }],
    [policyPath, { version: 2, ownerId: uid, revision: 4, domains: clone(domains), enforcement: { state: 'fully-enforced' } }],
    [jobPath, { uid, state: 'ready', scopes: ['profile'], receiptId: 'synthetic-receipt', consentRevision: 4, exportFenceGeneration: 0,
      expiresAt: new Timestamp(now + 3600000), checksum: 'a'.repeat(64), exportObject: exportPath, exportGeneration: '11',
      manifestObject: `private-exports/${uid}/${jobId}/manifest.json`, manifestGeneration: '12', runtimeExports: [{ assetId: 'synthetic-asset',
        objectPath: `private-exports/${uid}/${jobId}/spatial/captured-reality/synthetic-asset/${'b'.repeat(64)}.splat`, exportGeneration: '13', runtimeSha256: 'b'.repeat(64) }] }],
    [receiptPath, { ownerId: uid, kind: 'export', jobId, result: 'ready' }],
  ])
  const stats = { reads: [], signed: 0, streams: 0, chunks: [], transactions: 0, metadata: 0, logs: [], auth: [] }
  const objects = new Map([[exportPath, { generation: '11', bytes: Buffer.from('{"synthetic":true}') }]])
  const job = records.get(jobPath)
  objects.set(job.manifestObject, { generation: '12', bytes: Buffer.from('{"synthetic":"manifest"}') })
  objects.set(job.runtimeExports[0].objectPath, { generation: '13', bytes: Buffer.from('synthetic-splat') })
  let generation = 20
  const snapshot = ref => { const value = records.get(ref.path); return { id: ref.id, ref, exists: value !== undefined, data: () => clone(value), get: key => key.split('.').reduce((v, part) => v?.[part], value) } }
  function doc(location) { return { path: location, id: location.split('/').at(-1), collection: name => collection(`${location}/${name}`),
    async get() { stats.reads.push(location); return snapshot(this) },
    async set(value, settings) { records.set(location, clone(settings?.merge ? { ...records.get(location), ...value } : value)) },
    async update(value) { assert.ok(records.has(location)); records.set(location, clone({ ...records.get(location), ...value })) },
    async delete() { records.delete(location) } } }
  function collection(location, filters = [], maximum = Infinity) {
    return { path: location, query: true, doc: id => doc(`${location}/${id ?? `synthetic-audit-${stats.transactions}`}`),
      where: (key, op, value) => collection(location, [...filters, [key, op, value]], maximum), limit: n => collection(location, filters, n),
      async get() { const docs = [...records.keys()].filter(key => key.startsWith(location + '/') && key.slice(location.length + 1).split('/').length === 1)
        .filter(key => filters.every(([field, op, value]) => op === 'in' ? value.includes(snapshot(doc(key)).get(field)) : snapshot(doc(key)).get(field) === value)).slice(0, maximum).map(key => snapshot(doc(key)))
        await options.afterQuery?.(location, records)
        return { docs, empty: docs.length === 0, size: docs.length } } }
  }
  const db = { doc, collection,
    async runTransaction(callback) {
      const writes = [], id = ++stats.transactions
      const tx = { get: async ref => { assert.equal(writes.length, 0, 'no read after transaction writes'); return ref.query ? ref.get() : snapshot(ref) },
        create: (ref, value) => writes.push(() => { assert.ok(!records.has(ref.path)); records.set(ref.path, clone(value)) }),
        update: (ref, value) => writes.push(() => ref.update(value)), set: (ref, value, settings) => writes.push(() => ref.set(value, settings)) }
      const result = await callback(tx)
      if (options.failCommit === id) throw new Error('synthetic audit commit outage')
      for (const write of writes) await write()
      if (options.failAfterCommit === id) throw new Error('synthetic uncertain commit reply')
      await options.afterTransaction?.(id, records)
      return result
    },
    async recursiveDelete(ref) { for (const key of records.keys()) if (key === ref.path || key.startsWith(ref.path + '/')) records.delete(key) },
  }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const functions = { runWith: () => functions, https: { HttpsError, onCall: f => f, onRequest: f => f },
    firestore: { document: () => ({ onCreate: f => f }) }, pubsub: { schedule: () => ({ onRun: f => f }) } }
  const admin = { apps: [{}], firestore: Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => new Timestamp(now) } }),
    auth: () => ({ verifyIdToken: async (token, revoked) => { stats.auth.push({ revoked }); assert.equal(token, 'synthetic-token'); assert.equal(revoked, true); if (options.revokedToken) throw new Error('synthetic revoked session'); return { uid: options.authUid ?? uid, auth_time: options.authTime ?? Math.floor(now / 1000) - (options.staleAuth ? 400 : 0) } }, deleteUser: async () => {} }),
    storage: () => ({ bucket: () => ({ file: (location, settings) => ({
      async getMetadata() { stats.metadata++; await options.afterMetadata?.(stats.metadata, records, objects); const object = objects.get(location); if (!object || (settings?.generation && settings.generation !== object.generation)) throw new Error('synthetic object generation missing'); return [{ generation: object.generation, metadata: {} }] },
      async getSignedUrl() { stats.signed++; return ['https://synthetic.invalid/irrevocable-signed-url'] },
      async save(bytes) { objects.set(location, { generation: String(++generation), bytes: Buffer.from(bytes) }) },
      createReadStream() { stats.streams++; const object = objects.get(location); assert.equal(object.generation, settings.generation); return { async *[Symbol.asyncIterator]() { yield object.bytes }, destroy() {} } },
    }), async deleteFiles({ prefix }) { for (const key of objects.keys()) if (key.startsWith(prefix)) objects.delete(key) } }) }) }
  const module = { exports: {} }
  const filename = process.env.URAI_EXPORT_COMPILED_MODULE ?? path.resolve(__dirname, '../lib/apps/functions/src/privacyOperations.js')
  // Only actual strict-tsc output is accepted. No source transpilation fallback.
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, Buffer, URL, URLSearchParams,
    Date: class extends Date { static now() { return options.clock?.value ?? now } }, process: { env: options.env ?? {} },
    console: Object.fromEntries(['log', 'info', 'error', 'warn'].map(method => [method, (...args) => stats.logs.push(args)])),
    require: name => {
      if (name === 'firebase-functions/v1') return functions
      if (name === 'firebase-admin') return admin
      if (name === 'node:crypto') return crypto
      if (name === 'node:stream/promises') return { pipeline: async (source, guard, response) => {
        assert.ok([...records.keys()].some(k => k.includes('/privacyAudit/') && records.get(k).action === 'export_download_authorized'), 'audit must commit before stream')
        try {
          const delivered = []
          for await (const chunk of guard(source)) { delivered.push(chunk); stats.chunks.push(chunk); response.headersSent = true; await options.afterChunk?.(stats.chunks.length, records) }
          response.body = Buffer.concat(delivered).toString(); response.writableFinished = true
        } catch (error) { response.destroyed = true; throw error }
      } }
      if (name === './personPresenceAuthority') return { revokePersonPresenceConsentDerivatives: async () => {} }
      if (name === './lifeModelPrivateInputs') return { exportPrivateLifeModelHandles: async () => [], tombstonePrivateLifeModelInputs: async () => {} }
      throw new Error(`Unexpected compiled module dependency: ${name}`)
    } }, { filename })
  const context = { auth: { uid, token: { auth_time: Math.floor(now / 1000) } }, rawRequest: { get: () => 'synthetic.invalid' } }
  const descriptor = (data = {}, auth = context) => module.exports.getExportDownloadUrl({ jobId, ...data }, auth)
  async function deliver(result, authenticated = true, requestOptions = {}) {
    const query = Object.fromEntries(new URL(result.url, 'https://synthetic.invalid').searchParams)
    const response = { headers: {}, statusCode: 200, headersSent: false, destroyed: false, writableFinished: false,
      set(key, value) { Object.assign(this.headers, typeof key === 'string' ? { [key]: value } : key); return this }, status(code) { this.statusCode = code; return this }, json(value) { this.body = clone(value); return this }, end() { this.body = ''; this.writableFinished = true; return this }, once() {} }
    await module.exports.downloadExportPackage({ method: requestOptions.method ?? 'GET', query, get: name => {
      const supplied = requestOptions.headers?.[name.toLowerCase()]
      return supplied ?? (name === 'authorization' && authenticated ? 'Bearer synthetic-token' : undefined)
    } }, response)
    return response
  }
  return { records, objects, stats, context, descriptor, deliver, handlers: module.exports, db, Timestamp }
}

const allowedBrowserOrigins = ['https://urai.app', 'https://www.urai.app', 'https://urai-4dc1d.web.app',
  'https://urai-4dc1d.firebaseapp.com', 'https://urai-4dc1d--export-review-ab12.web.app', 'https://localhost', 'capacitor://localhost']
for (const origin of allowedBrowserOrigins) {
  test(`export preflight permits only GET Authorization for owned origin ${origin} without accessing auth or data`, async () => {
    const f = fixture({ env: { GCLOUD_PROJECT: 'urai-4dc1d' } })
    const response = await f.deliver({ url: '/api/privacy/export/download' }, false, { method: 'OPTIONS', headers: {
      origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization',
    } })
    assert.equal(response.statusCode, 204); assert.equal(response.body, '')
    assert.equal(response.headers['Access-Control-Allow-Origin'], origin)
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'GET')
    assert.equal(response.headers['Access-Control-Allow-Headers'], 'Authorization')
    assert.equal(response.headers['Access-Control-Allow-Credentials'], undefined)
    assert.match(response.headers.Vary, /Origin/)
    assert.equal(f.stats.auth.length, 0); assert.equal(f.stats.transactions, 0); assert.equal(f.stats.metadata, 0); assert.equal(f.stats.streams, 0)
  })
}
for (const origin of ['null', 'https://foreign.invalid', 'https://urai.app.foreign.invalid', 'https://user:pass@urai.app',
  'https://urai.app/', 'https://localhost:4321', 'http://localhost', 'https://other-project--review-ab12.web.app',
  'https://urai-4dc1d--review-ab12.web.app.foreign.invalid']) {
  test(`unknown export origin ${origin} denies before authentication or private object access`, async () => {
    const f = fixture({ env: { GCLOUD_PROJECT: 'urai-4dc1d' } }), result = await f.descriptor()
    const response = await f.deliver(result, true, { headers: { origin } })
    assert.equal(response.statusCode, 403); assert.equal(response.headers['Access-Control-Allow-Origin'], undefined)
    assert.equal(f.stats.auth.length, 0); assert.equal(f.stats.transactions, 2); assert.equal(f.stats.metadata, 1); assert.equal(f.stats.streams, 0)
  })
}
for (const origin of ['https://localhost', 'capacitor://localhost', 'https://urai-4dc1d--export-review-ab12.web.app']) {
  test(`allowed native or preview origin ${origin} still requires current Bearer authority for bytes`, async () => {
    const f = fixture({ env: { GCLOUD_PROJECT: 'urai-4dc1d' } }), result = await f.descriptor()
    const denied = await f.deliver(result, false, { headers: { origin } })
    assert.equal(denied.statusCode, 401); assert.equal(f.stats.streams, 0)
    const allowed = await f.deliver(result, true, { headers: { origin } })
    assert.equal(allowed.statusCode, 200); assert.equal(allowed.body, '{"synthetic":true}')
    assert.equal(allowed.headers['Access-Control-Allow-Origin'], origin)
    assert.ok(f.stats.auth.every(check => check.revoked === true))
  })
}
for (const headers of [
  { 'access-control-request-method': 'POST', 'access-control-request-headers': 'authorization' },
  { 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization, content-type' },
  { 'access-control-request-method': 'GET', 'access-control-request-headers': 'x-private-token' },
  { 'access-control-request-headers': 'authorization' },
]) {
  test(`export preflight denies incompatible request ${JSON.stringify(headers)} without private reads`, async () => {
    const f = fixture(), response = await f.deliver({ url: '/api/privacy/export/download' }, false, {
      method: 'OPTIONS', headers: { origin: 'capacitor://localhost', ...headers },
    })
    assert.equal(response.statusCode, 403); assert.equal(response.headers['Access-Control-Allow-Origin'], undefined)
    assert.equal(f.stats.auth.length, 0); assert.equal(f.stats.transactions, 0); assert.equal(f.stats.metadata, 0); assert.equal(f.stats.streams, 0)
  })
}

test('completed owner descriptor uses revocable authenticated delivery and committed audit', async () => {
  const f = fixture(), result = await f.descriptor()
  assert.equal(result.requiresAuthorization, true)
  assert.equal(result.ownerId, uid)
  assert.ok(result.url.startsWith('/api/privacy/export/download?'))
  assert.equal(result.downloadExpiresAt, now + 15 * 60000)
  assert.equal(f.stats.signed, 0)
  const response = await f.deliver(result)
  assert.equal(response.statusCode, 200); assert.equal(response.body, '{"synthetic":true}')
  assert.equal(response.headers['Cache-Control'], 'private, no-store'); assert.equal(f.stats.streams, 1)
})

for (const [label, change] of [
  ['missing policy', f => f.records.delete(policyPath)], ['missing owner', f => f.records.delete(prefix)],
  ['paused export', f => { f.records.get(policyPath).domains.exports.mode = 'paused' }],
  ['denied export', f => { f.records.get(policyPath).domains.exports.mode = 'denied' }],
  ['unknown export mode', f => { f.records.get(policyPath).domains.exports.mode = 'unknown' }],
  ['changed consent revision', f => { f.records.get(policyPath).revision = 5 }],
  ['pending enforcement', f => { f.records.get(policyPath).enforcement.state = 'pending' }],
  ['pending deletion', f => f.records.set(`${prefix}/deletionJobs/pending`, { state: 'awaiting-grace' })],
  ['failed deletion', f => f.records.set(`${prefix}/deletionJobs/failed`, { state: 'failed' })],
  ['deletion epoch replacement', f => f.records.set(fencePath, { generation: 1, pendingDeletions: {} })],
  ['legacy unbound job', f => { delete f.records.get(jobPath).consentRevision }],
  ['cancelled receipt', f => { f.records.get(receiptPath).result = 'cancelled' }],
  ['foreign receipt owner', f => { f.records.get(receiptPath).ownerId = 'other-owner' }],
  ['expired package', f => { f.records.get(jobPath).expiresAt = new f.Timestamp(now - 1) }],
  ['missing package lifetime', f => { delete f.records.get(jobPath).expiresAt }],
]) {
  test(`descriptor denies ${label} before capability creation`, async () => {
    const f = fixture(); change(f)
    await assert.rejects(f.descriptor(), { code: 'failed-precondition' })
    assert.equal(f.stats.signed, 0); assert.equal(f.stats.streams, 0)
  })
  test(`previous descriptor denies ${label} at delivery`, async () => {
    const f = fixture(), result = await f.descriptor(); change(f)
    const response = await f.deliver(result)
    assert.equal(response.statusCode, 409); assert.equal(f.stats.streams, 0)
  })
}

test('canonical withdrawal changes current revision and revokes an already issued descriptor', async () => {
  const f = fixture(), result = await f.descriptor()
  await f.handlers.applyConsentPolicy({ operationId: 'synthetic-withdrawal-001', domain: 'exports', expectedRevision: 4, next: { ...domains.exports, mode: 'denied' } }, f.context)
  assert.equal((await f.deliver(result)).statusCode, 409); assert.equal(f.stats.streams, 0)
})

test('revocation after Storage await denies descriptor and actual delivery', async () => {
  const f = fixture({ afterMetadata: (_count, records) => { records.get(policyPath).domains.exports.mode = 'denied' } })
  await assert.rejects(f.descriptor(), { code: 'failed-precondition' }); assert.equal(f.stats.signed, 0)
  const g = fixture({ afterMetadata: (count, records) => { if (count === 2) records.get(policyPath).revision = 5 } }), result = await g.descriptor()
  assert.equal((await g.deliver(result)).statusCode, 409); assert.equal(g.stats.streams, 0)
})

for (const options of [{ revokedToken: true }, { authUid: 'other-owner' }, { staleAuth: true }]) {
  test(`delivery denies stale or foreign authentication ${JSON.stringify(options)}`, async () => {
    const f = fixture(options), result = await f.descriptor(), response = await f.deliver(result)
    assert.ok([401, 409].includes(response.statusCode)); assert.equal(f.stats.streams, 0)
  })
}

test('future or string recent-authentication claims cannot authorize descriptor or delivery', async () => {
  for (const authTime of [Math.floor(now / 1000) + 1, String(Math.floor(now / 1000))]) {
    const f = fixture({ authTime }), result = await f.descriptor()
    assert.equal((await f.deliver(result)).statusCode, 409)
    await assert.rejects(f.descriptor({}, { ...f.context, auth: { uid, token: { auth_time: authTime } } }), { code: 'failed-precondition' })
    assert.equal(f.stats.streams, 0)
  }
})

test('deletion request cannot normalize malformed or overflowed denial authority into a grant', async () => {
  for (const fence of [{ generation: '0', pendingDeletions: {} }, { generation: 0, pendingDeletions: null },
    { generation: Number.MAX_SAFE_INTEGER, pendingDeletions: {} }]) {
    const f = fixture(); f.records.set(fencePath, fence)
    await assert.rejects(f.handlers.createDeletionRequest({ operationId: 'synthetic-malformed-fence', scope: 'memories', confirmation: 'CONFIRM DELETE' }, f.context), { code: 'failed-precondition' })
    assert.deepEqual(f.records.get(fencePath), fence)
    assert.equal([...f.records.keys()].some(key => key.includes('/deletionJobs/')), false)
  }
})

test('anonymous delivery and malformed job path deny without object reads', async () => {
  const f = fixture(), result = await f.descriptor()
  assert.equal((await f.deliver(result, false)).statusCode, 401)
  await assert.rejects(f.descriptor({ jobId: '../other-owner' }), { code: 'invalid-argument' })
  assert.equal(f.stats.streams, 0)
})

test('audit commit outage cannot return a descriptor or begin delivery', async () => {
  const f = fixture({ failCommit: 2 }); await assert.rejects(f.descriptor(), /audit commit outage/); assert.equal(f.stats.signed, 0)
  const g = fixture({ failCommit: 4 }), result = await g.descriptor()
  assert.equal((await g.deliver(result)).statusCode, 500); assert.equal(g.stats.streams, 0)
})

test('actual runtime binary download retains published destination generation and checksum', async () => {
  const f = fixture(), result = await f.descriptor({ file: 'runtime', assetId: 'synthetic-asset' })
  assert.equal(result.checksum, 'b'.repeat(64)); assert.equal((await f.deliver(result)).body, 'synthetic-splat')
  assert.equal(f.stats.signed, 0)
})

test('two concurrent deletion requests retain separate pending authority and invalidate old packages after cancellation', async () => {
  const f = fixture(), result = await f.descriptor()
  const one = await f.handlers.createDeletionRequest({ operationId: 'synthetic-deletion-one', scope: 'memories', confirmation: 'CONFIRM DELETE' }, f.context)
  const two = await f.handlers.createDeletionRequest({ operationId: 'synthetic-deletion-two', scope: 'intelligence', confirmation: 'CONFIRM DELETE' }, f.context)
  assert.equal(Object.keys(f.records.get(fencePath).pendingDeletions).length, 2)
  await f.handlers.cancelDeletionRequest({ jobId: one.jobId }, f.context)
  assert.equal(Object.keys(f.records.get(fencePath).pendingDeletions).length, 1)
  await assert.rejects(f.handlers.createExportRequest({ operationId: 'synthetic-new-export', scopes: ['profile'] }, f.context), { code: 'failed-precondition' })
  await f.handlers.cancelDeletionRequest({ jobId: two.jobId }, f.context)
  assert.equal(Object.keys(f.records.get(fencePath).pendingDeletions).length, 0)
  assert.equal((await f.deliver(result)).statusCode, 409)
  const fresh = await f.handlers.createExportRequest({ operationId: 'synthetic-new-export', scopes: ['profile'] }, f.context)
  assert.equal(f.records.get(`${prefix}/exportJobs/${fresh.jobId}`).exportFenceGeneration, 2)
})

test('export publication requires the same current request revision after all Storage writes', async () => {
  const f = fixture({ afterMetadata: (_count, records) => { records.get(policyPath).revision = 5 } })
  f.records.get(jobPath).state = 'queued'; f.records.get(receiptPath).result = 'queued'
  await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()), { code: 'failed-precondition' })
  assert.equal(f.records.get(jobPath).state, 'failed'); assert.equal(f.objects.size, 0)
})

for (const reason of ['withdrawal', 'revision', 'deletion', 'session', 'expiry']) {
  test(`live streaming stops before the next 64KiB after ${reason}`, async () => {
    const options = { clock: { value: now }, afterChunk: (_count, records) => {
      if (reason === 'withdrawal') records.get(policyPath).domains.exports.mode = 'denied'
      else if (reason === 'revision') records.get(policyPath).revision++
      else if (reason === 'deletion') records.set(fencePath, { generation: 1, pendingDeletions: { synthetic: true } })
      else if (reason === 'session') options.revokedToken = true
      else options.clock.value = now + 3600001
    } }
    const f = fixture(options), result = await f.descriptor()
    f.objects.get(exportPath).bytes = Buffer.alloc(128 * 1024, 's')
    const response = await f.deliver(result)
    assert.equal(f.stats.chunks.length, 1); assert.equal(f.stats.chunks[0].length, 64 * 1024)
    assert.equal(response.destroyed, true)
  })
}

for (const scope of ['memories', 'spatial']) {
  test(`501 documents in ${scope} cannot publish a silently truncated ready package`, async () => {
    const f = fixture()
    f.records.get(jobPath).state = 'queued'; f.records.get(jobPath).scopes = [scope]; f.records.get(receiptPath).result = 'queued'
    const collection = scope === 'memories' ? 'memories' : 'capturedRealityAssets'
    for (let i = 0; i < 501; i++) f.records.set(`${prefix}/${collection}/synthetic-${i}`, { synthetic: true })
    await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()), /EXPORT_COLLECTION_LIMIT_EXCEEDED/)
    assert.equal(f.records.get(jobPath).state, 'failed'); assert.equal(f.records.get(receiptPath).result, 'failed')
    assert.equal(f.objects.size, 0); assert.equal(f.stats.streams, 0)
  })
}

test('late captured-runtime inventory growth to 501 fails before any copy or ready publication', async () => {
  let grown = false
  const f = fixture({ afterQuery: (location, records) => {
    if (location === `${prefix}/capturedRealityAssets` && !grown) {
      grown = true
      for (let i = 0; i < 501; i++) records.set(`${location}/synthetic-${i}`, { ownerId: uid, synthetic: true })
    }
  } })
  f.records.get(jobPath).state = 'queued'; f.records.get(jobPath).scopes = ['spatial']; f.records.get(receiptPath).result = 'queued'
  await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()), /CAPTURED_REALITY_EXPORT_COLLECTION_LIMIT_EXCEEDED/)
  assert.equal(f.records.get(jobPath).state, 'failed'); assert.equal(f.objects.size, 0)
})

test('uncertain successful publication reply preserves committed bytes and completion receipt', async () => {
  const f = fixture({ failAfterCommit: 2 })
  f.records.get(jobPath).state = 'queued'; f.records.get(receiptPath).result = 'queued'
  await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()), /uncertain commit reply/)
  assert.equal(f.records.get(jobPath).state, 'ready'); assert.equal(f.records.get(receiptPath).result, 'ready')
  assert.ok(f.objects.has(exportPath))
})

test('late cancellation cannot be overwritten by ready or failed publication', async () => {
  const f = fixture({ afterMetadata: (_count, records) => { records.get(jobPath).state = 'cancelled'; records.get(receiptPath).result = 'cancelled' } })
  f.records.get(jobPath).state = 'queued'; f.records.get(receiptPath).result = 'queued'
  await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()), { code: 'failed-precondition' })
  assert.equal(f.records.get(jobPath).state, 'cancelled'); assert.equal(f.records.get(receiptPath).result, 'cancelled')
  assert.equal(f.objects.size, 0)
})

test('a duplicate worker that did not claim cannot delete another preparing attempt', async () => {
  const f = fixture(); f.records.get(jobPath).state = 'queued'
  const old = await f.db.doc(jobPath).get()
  // Capture the event's immutable source bytes before current server state moves.
  const event = { id: old.id, ref: old.ref, data: () => ({ ...old.data(), state: 'queued' }) }
  f.records.get(jobPath).state = 'preparing'
  await assert.rejects(f.handlers.processExportJob(event), { code: 'failed-precondition' })
  assert.equal(f.records.get(jobPath).state, 'preparing'); assert.ok(f.objects.has(exportPath))
})
