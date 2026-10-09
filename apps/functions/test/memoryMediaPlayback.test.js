'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { Readable, Writable } = require('node:stream')
const { createRequire } = require('node:module')
const http = require('node:http')
const { once } = require('node:events')

const uid = 'fictional-playback-owner', memoryId = 'fictional-playback-memory'
const receiptId = 'c'.repeat(64), schema = 'urai-owned-memory-media-v1'
const sha = value => crypto.createHash('sha256').update(value).digest('hex')
const userPath = `users/${uid}`, memoryPath = `${userPath}/memories/${memoryId}`
const policyPath = `${userPath}/privacyPolicy/current`, consentPath = `consentRecords/${uid}_memory_storage`
const receiptPath = `${userPath}/memoryMediaReceipts/${receiptId}`
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }

// The SDK boundary is fictional. All authority/delivery code and helpers below
// are the actual strict-tsc output; Node streams/pipeline and HTTP are real.
function fixture() {
  const clock = { value: Date.now() }
  class ClockDate extends Date { static now() { return clock.value } }
  class Timestamp {
    constructor(value) { this.value = value }
    toMillis() { return this.value }
    static fromMillis(value) { return new Timestamp(value) }
  }
  const clone = value => value instanceof Timestamp ? new Timestamp(value.value)
    : Buffer.isBuffer(value) ? Buffer.from(value) : Array.isArray(value) ? value.map(clone)
      : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) : value
  const bytes = Buffer.alloc(131_072)
  for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251
  bytes.write('ftyp', 4)
  const domain = { mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
    modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
  const policy = { version: 2, revision: 4, ownerId: uid,
    domains: Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(key => [key, { ...domain }])),
    enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } }
  const receipt = { schemaVersion: schema, ownerUid: uid, memoryId, receiptId, sha256: sha(bytes), contentType: 'video/mp4', kind: 'video',
    objectPath: `private-memory-media/${sha(uid)}/${sha(memoryId)}/${receiptId}/${sha(bytes)}.mp4`, bucketName: 'fictional-private-memory.appspot.com',
    byteLength: bytes.length, attemptNonce: 'd'.repeat(64), state: 'ready', storageGeneration: '123', leaseExpiresAt: new Timestamp(clock.value + 120_000),
    consentRevision: 4, consentReceiptHash: 'b'.repeat(64), consentExpiresAt: clock.value + 3_600_000, deletionGeneration: 0 }
  const docs = new Map([
    [userPath, { accountStatus: 'active' }], [memoryPath, { ownerId: uid, sourceMedia: [{ kind: 'video', mediaReceiptId: receiptId }] }],
    [policyPath, policy], [consentPath, { uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0',
      status: 'granted', receiptHash: receipt.consentReceiptHash, expiresAt: new Timestamp(receipt.consentExpiresAt) }], [receiptPath, receipt],
  ])
  const metadata = { generation: '123', size: String(bytes.length), contentType: 'video/mp4', metadata: {
    ownerHash: sha(uid), memoryHash: sha(memoryId), receiptId, attemptNonce: receipt.attemptNonce, sourceSha256: receipt.sha256 } }
  const objects = new Map([[receipt.objectPath, { bytes: Buffer.from(bytes), metadata }]])
  const bucketMetadata = { iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' } }
  const stats = { auth: 0, accounts: 0, transactions: 0, bucketMetadata: 0, objectMetadata: 0, streams: 0, signed: 0, fileSelections: [],
    sourceDestroyed: false, emittedChunks: [], logs: [] }
  let currentUid = uid, disabled = false, revoked = false, creationTime = '2026-10-01T00:00:00.000Z'
  let afterAuth, afterAccount, afterMetadata, afterWrite, beforeSource, generation = 123
  const snap = (location, view = docs) => { const value = clone(view.get(location)); return { exists: value !== undefined,
    id: location.split('/').at(-1), ref: ref(location), data: () => clone(value), get: key => key.split('.').reduce((parent, part) => parent?.[part], value) } }
  const ref = location => ({ path: location, id: location.split('/').at(-1), get: async () => snap(location),
    set: async (value, settings) => docs.set(location, clone(settings?.merge ? { ...docs.get(location), ...value } : value)),
    update: async value => docs.set(location, clone({ ...docs.get(location), ...value })) })
  function collection(location, filters = [], maximum = Infinity) {
    return { query: true, path: location, where: (key, op, value) => collection(location, [...filters, [key, op, value]], maximum),
      limit: n => collection(location, filters, n), get: async view => {
        const rows = [...(view || docs).keys()].filter(key => key.startsWith(location + '/') && key.slice(location.length + 1).split('/').length === 1)
          .filter(key => filters.every(([field, op, wanted]) => op === 'in' ? wanted.includes(snap(key, view || docs).get(field)) : snap(key, view || docs).get(field) === wanted))
          .slice(0, maximum).map(key => snap(key, view || docs))
        return { docs: rows, empty: rows.length === 0, size: rows.length }
      } }
  }
  const db = { doc: ref, collection, runTransaction: async callback => {
    stats.transactions++
    const view = new Map([...docs].map(([key, value]) => [key, clone(value)])), writes = [], reads = new Map()
    const result = await callback({ get: async target => {
      assert.equal(writes.length, 0, 'a real Firestore transaction cannot read after writes')
      if (target.query) return target.get(view)
      reads.set(target.path, JSON.stringify(view.get(target.path))); return snap(target.path, view)
    }, create: (target, value) => writes.push(() => { assert.ok(!docs.has(target.path)); docs.set(target.path, clone(value)) }),
    update: (target, value) => writes.push(() => target.update(value)), set: (target, value) => writes.push(() => target.set(value)) })
    if (writes.length && [...reads].some(([key, value]) => JSON.stringify(docs.get(key)) !== value)) return db.runTransaction(callback)
    for (const write of writes) await write()
    return result
  } }
  const auth = { verifyIdToken: async (bearer, checkRevoked) => {
    stats.auth++; assert.equal(checkRevoked, true); await afterAuth?.(stats.auth)
    if (revoked || bearer !== 'fictional-token') throw new Error('fictional revoked token')
    return { uid: currentUid, auth_time: Math.floor(clock.value / 1000), iat: Math.floor(clock.value / 1000), exp: Math.floor(clock.value / 1000) + 3600 }
  }, getUser: async requestedUid => { stats.accounts++; await afterAccount?.(stats.accounts)
    return { uid: requestedUid === currentUid ? currentUid : 'fictional-account-mismatch', disabled, metadata: { creationTime } } } }
  const bucket = { name: receipt.bucketName, getMetadata: async () => { stats.bucketMetadata++; return [clone(bucketMetadata)] },
    file: (location, settings) => {
      stats.fileSelections.push({ location, generation: settings?.generation })
      const read = () => {
        const object = objects.get(location)
        if (!object || (settings?.generation && object.metadata.generation !== settings.generation)) throw Object.assign(new Error('fictional generation absent'), { code: 404 })
        return object
      }
      return { getMetadata: async () => { stats.objectMetadata++; await afterMetadata?.(stats.objectMetadata); return [clone(read().metadata)] },
        getSignedUrl: async () => { stats.signed++; return ['https://fictional.invalid/bearer-capability'] },
        save: async (value, options) => { assert.equal(options.preconditionOpts.ifGenerationMatch, 0); assert.ok(!objects.has(location))
          objects.set(location, { bytes: Buffer.from(value), metadata: { generation: String(++generation), size: String(value.length), contentType: options.contentType,
            metadata: clone(options.metadata.metadata) } }) },
        createReadStream: () => { stats.streams++; beforeSource?.(); const stream = Readable.from([Buffer.from(read().bytes)])
          stream.on('close', () => { stats.sourceDestroyed = true }); return stream },
      }
    } }
  const admin = { apps: ['fictional'], firestore: Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => new Timestamp(clock.value) } }),
    auth: () => auth, storage: () => ({ bucket: () => bucket }) }
  const functions = { https: { HttpsError, onCall: callback => callback, onRequest: callback => callback }, runWith: () => functions,
    pubsub: { schedule: () => ({ onRun: callback => callback }) } }
  const filename = process.env.URAI_MEMORY_MEDIA_COMPILED_MODULE || path.resolve(__dirname, '../lib/apps/functions/src/memoryMedia.js')
  const nativeRequire = createRequire(filename), modules = new Map()
  const load = compiled => {
    if (modules.has(compiled)) return modules.get(compiled).exports
    const result = { exports: {} }; modules.set(compiled, result)
    vm.runInNewContext(fs.readFileSync(compiled, 'utf8'), { module: result, exports: result.exports, Buffer, URL, URLSearchParams,
      Date: ClockDate, console: Object.fromEntries(['log', 'warn', 'error'].map(key => [key, (...args) => stats.logs.push(args)])),
      process: { env: { GCLOUD_PROJECT: 'urai-4dc1d', FIREBASE_STORAGE_BUCKET: bucket.name } }, require: name => {
        if (name === 'firebase-admin') return admin
        if (name === 'firebase-functions/v1') return functions
        if (name.startsWith('./')) return load(path.resolve(path.dirname(compiled), name + '.js'))
        return nativeRequire(name)
      } }, { filename: compiled })
    return result.exports
  }
  const handler = load(filename), context = { auth: { uid, token: { auth_time: Math.floor(clock.value / 1000) } },
    rawRequest: { get: name => name === 'authorization' ? 'Bearer fictional-token' : undefined } }
  const selection = { memoryId, receiptId }
  const descriptor = (data = selection, actor = context) => handler.getMemoryMediaPlaybackAuthority(data, actor)
  const query = descriptor => Object.fromEntries(['memoryId', 'receiptId', 'authorityHash', 'expiresAt', 'storageGeneration'].map(key => [key, String(descriptor[key])]))
  async function deliver(descriptor, options = {}) {
    const chunks = [], headers = {}, requestHeaders = { authorization: 'Bearer fictional-token', ...options.headers }
    const request = { method: options.method || 'GET', query: { ...query(descriptor), ...options.query }, aborted: false,
      get: name => requestHeaders[name.toLowerCase()] }
    const response = new Writable({ highWaterMark: 1, write(chunk, _encoding, done) {
      response.headersSent = true; chunks.push(Buffer.from(chunk)); stats.emittedChunks.push(Buffer.from(chunk))
      Promise.resolve(afterWrite?.(chunks.length)).then(() => done(), done)
    } })
    Object.assign(response, { headers, statusCode: 200, headersSent: false,
      set(key, value) { Object.assign(headers, typeof key === 'string' ? { [key]: value } : key); return this },
      removeHeader(key) { delete headers[key] }, status(value) { this.statusCode = value; return this }, json(value) { this.end(JSON.stringify(value)); return this } })
    response.once('error', () => {})
    await handler.streamMemoryMediaPlayback(request, response)
    return { response, request, bytes: Buffer.concat(chunks), chunks }
  }
  return { bytes, docs, policy, receipt, metadata, objects, bucketMetadata, clock, stats, handler, context, selection, descriptor, deliver, query,
    revoke: () => { revoked = true }, disable: () => { disabled = true }, foreign: () => { currentUid = 'fictional-foreign-owner' },
    recreate: () => { creationTime = '2026-10-09T09:00:00.000Z' }, afterAuth: fn => { afterAuth = fn }, afterAccount: fn => { afterAccount = fn },
    afterMetadata: fn => { afterMetadata = fn }, afterWrite: fn => { afterWrite = fn }, beforeSource: fn => { beforeSource = fn }, Timestamp }
}

function assertDenied(output) {
  assert.ok(output.response.statusCode >= 400)
  assert.ok(output.bytes.length < 128, 'denial must not contain private source bytes')
  assert.equal(output.response.headers['X-URAI-Checksum-SHA256'], undefined)
  assert.equal(output.response.headers['Cache-Control'], 'private, no-store')
}

test('actual immutable receipt descriptor exposes no bearer, URL, bucket, object path or input bytes', async () => {
  const f = fixture(), d = await f.descriptor()
  assert.equal(d.schemaVersion, 'urai-owned-memory-media-playback-v1'); assert.equal(d.requiresAuthorization, true)
  assert.equal(d.ownerId, uid); assert.equal(d.memoryId, memoryId); assert.equal(d.receiptId, receiptId)
  assert.equal(d.sha256, sha(f.bytes)); assert.equal(d.byteLength, f.bytes.length); assert.equal(d.storageGeneration, '123')
  assert.match(d.sourceAuthorityHash, /^[a-f0-9]{64}$/); assert.match(d.authorityHash, /^[a-f0-9]{64}$/)
  assert.ok(d.expiresAt <= f.clock.value + 300_000 && d.expiresAt > f.clock.value)
  assert.doesNotMatch(JSON.stringify(d), /https?:|gs:|fictional-token|private-memory-media|\.appspot\.com|base64/)
  assert.equal(f.stats.signed, 0); assert.equal(f.stats.streams, 0)
  const out = await f.deliver(d)
  assert.equal(out.response.statusCode, 200); assert.deepEqual(out.bytes, f.bytes)
  assert.equal(out.chunks.length, 2); assert.ok(out.chunks.every(chunk => chunk.length <= 65_536))
  assert.equal(out.response.headers['X-URAI-Checksum-SHA256'], d.sha256)
  assert.equal(out.response.headers['X-URAI-Storage-Generation'], d.storageGeneration)
  assert.equal(out.response.headers['Content-Length'], String(f.bytes.length)); assert.equal(out.response.headers['Cache-Control'], 'private, no-store')
})

test('actual receipt-only upload can immediately resolve and deliver exact privately owned bytes', async () => {
  const f = fixture(); f.docs.delete(receiptPath); f.docs.get(memoryPath).sourceMedia = []
  const result = await f.handler.registerMemoryMedia({ memoryId, operationId: 'fictional-upload-roundtrip', contentType: 'video/mp4', kind: 'video', base64: f.bytes.toString('base64') }, f.context)
  const attached = f.docs.get(memoryPath).sourceMedia
  assert.equal(attached.length, 1); assert.equal(attached[0].mediaReceiptId, result.receiptId); assert.equal(attached[0].url, undefined)
  const d = await f.descriptor({ memoryId, receiptId: result.receiptId }), out = await f.deliver(d)
  assert.equal(d.sha256, result.sha256); assert.deepEqual(out.bytes, f.bytes); assert.equal(f.stats.signed, 0)
})

for (const [label, mutate] of [
  ['revoked token', f => f.revoke()], ['disabled current Auth account', f => f.disable()], ['foreign current token', f => f.foreign()],
  ['missing current owner', f => f.docs.delete(userPath)], ['deleted owner', f => { f.docs.get(userPath).deleted = true }],
  ['foreign memory owner', f => { f.docs.get(memoryPath).ownerId = 'fictional-foreign-owner' }],
  ['memory withdrawal', f => { f.policy.domains.memory.mode = 'denied' }], ['pending enforcement', f => { f.policy.enforcement.state = 'pending' }],
  ['memory Replay visibility disabled', f => { f.policy.domains.memory.replayVisible = false }],
  ['canonical C1 withdrawal', f => { f.docs.get(consentPath).status = 'revoked' }], ['canonical C1 expiry', f => { f.docs.get(consentPath).expiresAt = new f.Timestamp(f.clock.value) }],
  ['canonical C1 receipt replacement', f => { f.docs.get(consentPath).receiptHash = 'f'.repeat(64) }],
  ['deletion planning lease', f => f.docs.set(`privacyDeletionTombstones/${uid}`, { uid, active: false, deletionPlanningLeaseToken: 'fictional-lease' })],
  ['active deletion', f => f.docs.set(`privacyDeletionTombstones/${uid}`, { uid, active: true })],
  ['queued deletion', f => f.docs.set(`${userPath}/deletionJobs/fictional`, { state: 'queued' })],
  ['local pending deletion', f => f.docs.set(`${userPath}/privacyRuntime/exportAuthority`, { generation: 0, pendingDeletions: { fictional: true } })],
  ['permanent deletion', f => f.docs.set(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`, { ownerHash: sha(uid), deleted: true, deletionEpoch: 1 })],
  ['malformed permanent fence', f => f.docs.set(`uraiPrivateLifeModelOwnerFences/${sha(uid)}`, { deleted: false })],
  ['purpose block', f => f.docs.set(`jobConsentBlocks/${sha(uid + '\n' + 'memory.storage')}`, { ownerUid: uid, purpose: 'memory.storage', active: true })],
  ['foreign purpose fence', f => f.docs.set(`jobConsentBlocks/${sha(uid + '\n' + 'memory.storage')}`, { ownerUid: 'fictional-foreign-owner', purpose: 'memory.storage', active: false })],
  ['removed receipt attachment', f => { f.docs.get(memoryPath).sourceMedia = [] }],
  ['duplicated attachment', f => { f.docs.get(memoryPath).sourceMedia.push({ kind: 'video', mediaReceiptId: receiptId }) }],
  ['receipt attached to different memory', f => { f.receipt.memoryId = 'fictional-other-memory' }],
  ['nonready receipt', f => { f.receipt.state = 'closing' }],
  ['unbound bearer URL attachment', f => { f.docs.get(memoryPath).sourceMedia[0].url = 'https://fictional.invalid/private?token=fictional' }],
]) test(label + ' denies new authority before private storage access', async () => {
  const f = fixture(); mutate(f); await assert.rejects(f.descriptor())
  assert.equal(f.stats.bucketMetadata, 0); assert.equal(f.stats.objectMetadata, 0); assert.equal(f.stats.streams, 0)
})

test('anonymous callable and issued descriptor delivery still require a current owner token', async () => {
  const f = fixture(); await assert.rejects(f.descriptor(f.selection, {}))
  const d = await f.descriptor(), out = await f.deliver(d, { headers: { authorization: '' } })
  assert.equal(out.response.statusCode, 401); assertDenied(out); assert.equal(f.stats.streams, 0)
})
for (const [label, mutate] of [
  ['foreign actor', f => f.foreign()], ['same UID recreated account', f => f.recreate()], ['expired descriptor', f => { f.clock.value += 300_001 }],
  ['corrected consent revision', f => { f.policy.revision++ }], ['removed attachment', f => { f.docs.get(memoryPath).sourceMedia = [] }],
  ['changed storage generation', f => { f.receipt.storageGeneration = '124' }], ['changed receipt fixity', f => { f.receipt.sha256 = 'f'.repeat(64) }],
]) test(label + ' cannot reuse an issued immutable descriptor', async () => {
  const f = fixture(), d = await f.descriptor(); mutate(f); assertDenied(await f.deliver(d)); assert.equal(f.stats.streams, 0)
})

for (const [header, start, end] of [['bytes=17-500', 17, 500], ['bytes=100000-', 100000, 131071], ['bytes=-17', 131055, 131071], ['bytes=131060-999999', 131060, 131071]]) {
  test('actual range ' + header + ' has exact 206 byte boundaries and headers', async () => {
    const f = fixture(), d = await f.descriptor(), out = await f.deliver(d, { headers: { range: header } })
    assert.equal(out.response.statusCode, 206); assert.deepEqual(out.bytes, f.bytes.subarray(start, end + 1))
    assert.equal(out.response.headers['Content-Range'], `bytes ${start}-${end}/${f.bytes.length}`)
    assert.equal(out.response.headers['Content-Length'], String(end - start + 1)); assert.equal(out.response.headers.ETag, `"${d.sha256}"`)
  })
}
for (const header of ['bytes=131072-', 'bytes=500-17', 'bytes=-0', 'bytes=0-0,2-3', 'bytes=1e3-2e3', 'bytes=9007199254740992-', 'bytes=-', 'items=0-10']) {
  test('invalid or unsatisfiable range ' + header + ' fails before source bytes', async () => {
    const f = fixture(), d = await f.descriptor(), out = await f.deliver(d, { headers: { range: header } })
    assert.equal(out.response.statusCode, 416); assert.equal(out.bytes.length, 0); assert.equal(f.stats.streams, 0)
    assert.equal(out.response.headers['Content-Range'], `bytes */${f.bytes.length}`)
  })
}
test('If-Range cannot select bytes from a different immutable source', async () => {
  const f = fixture(), d = await f.descriptor(), out = await f.deliver(d, { headers: { range: 'bytes=0-17', 'if-range': '"fictional-other-source"' } })
  assert.equal(out.response.statusCode, 412); assert.equal(out.bytes.length, 0); assert.equal(f.stats.streams, 0)
})
test('authenticated HEAD returns verified range headers without source bytes', async () => {
  const f = fixture(), d = await f.descriptor(), out = await f.deliver(d, { method: 'HEAD', headers: { range: 'bytes=17-500' } })
  assert.equal(out.response.statusCode, 206); assert.equal(out.bytes.length, 0)
  assert.equal(out.response.headers['Content-Length'], '484'); assert.equal(out.response.headers['Content-Range'], `bytes 17-500/${f.bytes.length}`)
})

for (const [label, mutate] of [
  ['bucket public prevention inherited', f => { f.bucketMetadata.iamConfiguration.publicAccessPrevention = 'inherited' }],
  ['bucket legacy access', f => { f.bucketMetadata.iamConfiguration.uniformBucketLevelAccess.enabled = false }],
  ['Firebase download bearer', f => { f.metadata.metadata.firebaseStorageDownloadTokens = 'fictional-prohibited-token' }],
  ['wrong object owner', f => { f.metadata.metadata.ownerHash = 'f'.repeat(64) }],
  ['wrong object nonce', f => { f.metadata.metadata.attemptNonce = 'f'.repeat(64) }],
  ['wrong MIME', f => { f.metadata.contentType = 'text/html' }],
]) test(label + ' denies descriptor without signing a portable capability', async () => {
  const f = fixture(); mutate(f); await assert.rejects(f.descriptor()); assert.equal(f.stats.streams, 0); assert.equal(f.stats.signed, 0)
})
test('tampered bytes at exact pinned generation fail full verification before any full or partial response', async () => {
  for (const range of [undefined, 'bytes=17-500']) {
    const f = fixture(), d = await f.descriptor(); f.objects.get(f.receipt.objectPath).bytes[64000] ^= 1
    const out = await f.deliver(d, { headers: { range } }); assert.equal(out.response.statusCode, 409); assertDenied(out)
    assert.equal(out.response.headers['Content-Length'], undefined)
  }
})
test('withdrawal during an awaited object metadata read denies both descriptor issuance and subsequent bytes', async () => {
  const f = fixture(); f.afterMetadata(() => { f.docs.get(consentPath).status = 'revoked' })
  await assert.rejects(f.descriptor()); assert.equal(f.stats.streams, 0)
})
test('withdrawal during the final Auth await is re-read before any source response', async () => {
  const f = fixture(), d = await f.descriptor(); let changed = false, authAfterSource = 0
  f.afterAuth(() => { if (f.stats.streams && ++authAfterSource === 2) { f.docs.get(consentPath).status = 'revoked'; changed = true } })
  const out = await f.deliver(d); assert.equal(changed, true); assertDenied(out)
})
for (const [label, mutate] of [
  ['C1 withdrawal', f => { f.docs.get(consentPath).status = 'revoked' }], ['deletion fence', f => f.docs.set(`privacyDeletionTombstones/${uid}`, { uid, active: true })],
  ['Replay visibility withdrawal', f => { f.policy.domains.memory.replayVisible = false }],
  ['receipt correction', f => { f.receipt.storageGeneration = '124' }], ['token revocation', f => f.revoke()], ['disabled current account', f => f.disable()],
]) test(label + ' after first 64 KiB terminates the actual Node output pipeline', async () => {
  const f = fixture(), d = await f.descriptor(); f.afterWrite(count => { if (count === 1) mutate(f) })
  const out = await f.deliver(d); assert.equal(out.bytes.length, 65_536); assert.deepEqual(out.bytes, f.bytes.subarray(0, 65_536))
  assert.equal(out.response.destroyed, true); assert.equal(f.stats.sourceDestroyed, true)
})
test('foreign browser origin is denied without reading source storage', async () => {
  const f = fixture(), d = await f.descriptor(), reads = f.stats.objectMetadata
  assertDenied(await f.deliver(d, { headers: { origin: 'https://fictional-foreign.invalid' } }))
  assert.equal(f.stats.objectMetadata, reads); assert.equal(f.stats.streams, 0)
})
test('descriptor extra identity or locator fields cannot override owner or select a private object', async () => {
  const f = fixture(), d = await f.descriptor()
  assertDenied(await f.deliver(d, { query: { uid: 'fictional-foreign-owner', objectPath: f.receipt.objectPath } }))
  assert.equal(f.stats.streams, 0)
})

test('actual compiled HTTP handler delivers authenticated closed, open and suffix ranges through a real server', async () => {
  const f = fixture(), d = await f.descriptor()
  const server = http.createServer(async (request, response) => {
    request.query = Object.fromEntries(new URL(request.url, 'http://127.0.0.1').searchParams); request.get = name => request.headers[name.toLowerCase()]
    response.set = (key, value) => { for (const [name, content] of Object.entries(typeof key === 'string' ? { [key]: value } : key)) response.setHeader(name, content); return response }
    response.status = status => { response.statusCode = status; return response }; response.json = value => response.end(JSON.stringify(value))
    await f.handler.streamMemoryMediaPlayback(request, response)
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}/streamMemoryMediaPlayback?${new URLSearchParams(f.query(d))}`
    for (const [range, start, end] of [['bytes=17-500', 17, 500], ['bytes=100000-', 100000, 131071], ['bytes=-17', 131055, 131071]]) {
      const response = await fetch(endpoint, { headers: { Authorization: 'Bearer fictional-token', Range: range }, redirect: 'error' })
      assert.equal(response.status, 206); assert.equal(response.headers.get('cache-control'), 'private, no-store')
      assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${f.bytes.length}`)
      assert.equal(response.headers.get('x-urai-checksum-sha256'), d.sha256); assert.deepEqual(Buffer.from(await response.arrayBuffer()), f.bytes.subarray(start, end + 1))
    }
    f.disable(); const denied = await fetch(endpoint, { headers: { Authorization: 'Bearer fictional-token', Range: 'bytes=17-500' } })
    assert.equal(denied.status, 401); assert.equal(denied.headers.get('x-urai-checksum-sha256'), null)
  } finally { server.closeAllConnections(); await new Promise(done => server.close(done)) }
})

test('actual backend and browser adapter agree on private descriptor, full immutable bytes and per-mount Blob', async () => {
  const f = fixture(), d = await f.descriptor(), ts = require('typescript')
  const clientPath = path.resolve(__dirname, '../../../urai-tier1/src/spatial/memory/ownedMemoryMediaPlayback.ts'), client = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(clientPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { module: client, exports: client.exports, URL, Uint8Array, Blob, AbortController, setTimeout, clearTimeout, fetch, crypto: crypto.webcrypto,
    require: name => { throw new Error(`Unexpected private browser dependency ${name}`) } }, { filename: clientPath })
  assert.equal(client.exports.validateOwnedMemoryPlaybackDescriptor(d, { ownerId: uid, memoryId, receipt: { kind: 'video', mediaReceiptId: receiptId } }), true)
  const server = http.createServer(async (request, response) => {
    request.query = Object.fromEntries(new URL(request.url, 'http://127.0.0.1').searchParams); request.get = name => request.headers[name.toLowerCase()]
    response.set = (key, value) => { for (const [name, content] of Object.entries(typeof key === 'string' ? { [key]: value } : key)) response.setHeader(name, content); return response }
    response.status = status => { response.statusCode = status; return response }; response.json = value => response.end(JSON.stringify(value))
    await f.handler.streamMemoryMediaPlayback(request, response)
  })
  server.listen(0, '127.0.0.1'); await once(server, 'listening')
  let requests = 0
  const fetcher = async (endpoint, options) => {
    const url = new URL(endpoint); requests++
    assert.equal(url.origin, 'https://us-central1-urai-4dc1d.cloudfunctions.net'); assert.equal(url.pathname, '/streamMemoryMediaPlayback')
    assert.deepEqual(Object.fromEntries(url.searchParams), f.query(d)); assert.equal(options.headers.Authorization, 'Bearer fictional-token')
    assert.equal(options.cache, 'no-store'); assert.equal(options.credentials, 'omit'); assert.equal(options.redirect, 'error'); assert.equal(options.referrerPolicy, 'no-referrer')
    return fetch(`http://127.0.0.1:${server.address().port}${url.pathname}${url.search}`, options)
  }
  try {
    const blob = await client.exports.fetchOwnedMemoryPlayback(d, 'urai-4dc1d', { signal: new AbortController().signal,
      isCurrent: () => true, requestHeaders: async () => ({ Authorization: 'Bearer fictional-token' }) }, fetcher)
    assert.equal(blob.type, 'video/mp4'); assert.equal(blob.size, d.byteLength); assert.deepEqual(Buffer.from(await blob.arrayBuffer()), f.bytes)
    assert.equal(requests, 1); assert.equal(f.stats.signed, 0)
    f.docs.get(consentPath).status = 'revoked'
    await assert.rejects(client.exports.fetchOwnedMemoryPlayback(d, 'urai-4dc1d', { signal: new AbortController().signal,
      isCurrent: () => true, requestHeaders: async () => ({ Authorization: 'Bearer fictional-token' }) }, fetcher), /PRIVATE_MEDIA_BYTES_UNAVAILABLE/)
  } finally { server.closeAllConnections(); await new Promise(done => server.close(done)) }
})
