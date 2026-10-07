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
const canonicalPath = `consentRecords/${uid}_data_export`, canonicalFencePath = `privacyDeletionTombstones/${uid}`
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const exportBody = Buffer.from('{"synthetic":true}'), manifestBody = Buffer.from('{"synthetic":"manifest"}'), runtimeBody = Buffer.from('synthetic-splat')
const exportChecksum = hash(exportBody), manifestChecksum = hash(manifestBody), runtimeChecksum = hash(runtimeBody)
const canonicalBinding = { canonicalExportReceiptHash: 'c'.repeat(64), canonicalExportConsentExpiresAt: now + 3600000 }
const receiptBinding = { ...canonicalBinding, consentRevision: 4, exportFenceGeneration: 0 }
const domains = Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(domain => [domain, {
  mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
  modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false,
}]))

function fixture(options = {}) {
  class Timestamp { constructor(value) { this.value = value }; toMillis() { return this.value }; toDate() { return new Date(this.value) }; static fromMillis(value) { return new Timestamp(value) } }
  const clone = value => value instanceof Timestamp ? new Timestamp(value.value) : Array.isArray(value) ? value.map(clone) : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clone(v)])) : value
  const records = new Map([
    [prefix, { ownerId: uid }],
    [canonicalPath, { uid, purpose:'data.export', consentTier:'C7', policyVersion:'1.0.0', status:'granted',receiptHash:canonicalBinding.canonicalExportReceiptHash,expiresAt:new Timestamp(canonicalBinding.canonicalExportConsentExpiresAt) }],
    [canonicalFencePath,{uid,exportConsentStatus:'granted',exportConsentReceiptHash:canonicalBinding.canonicalExportReceiptHash,exportConsentPolicyVersion:'1.0.0',exportConsentExpiresAt:new Timestamp(canonicalBinding.canonicalExportConsentExpiresAt)}],
    [policyPath, { version: 2, ownerId: uid, revision: 4, domains: clone(domains), enforcement: { state: 'fully-enforced' } }],
    [jobPath, { uid, ...canonicalBinding, exportBytes: exportBody.length, manifestBytes: manifestBody.length, manifestChecksum, state: 'ready', scopes: ['profile'], receiptId: 'synthetic-receipt', consentRevision: 4, exportFenceGeneration: 0,
      expiresAt: new Timestamp(now + 3600000), checksum: exportChecksum, exportObject: exportPath, exportGeneration: '11',
      manifestObject: `private-exports/${uid}/${jobId}/manifest.json`, manifestGeneration: '12', runtimeExports: [{ assetId: 'synthetic-asset',
        objectPath: `private-exports/${uid}/${jobId}/spatial/captured-reality/synthetic-asset/${runtimeChecksum}.splat`, exportGeneration: '13', runtimeSha256: runtimeChecksum, runtimeBytes: runtimeBody.length }] }],
    [receiptPath, { ...receiptBinding, ownerId: uid, kind: 'export', jobId, result: 'ready' }],
  ])
  const stats = { deleted: [], reads: [], signed: 0, streams: 0, chunks: [], transactions: 0, readOnlyTransactions: 0, queryPages: [], metadata: 0, logs: [], auth: [] }
  const objects = new Map([[exportPath, { generation: '11', contentType: 'application/json', bytes: exportBody }]])
  const job = records.get(jobPath)
  objects.set(job.manifestObject, { generation: '12', contentType: 'application/json', bytes: manifestBody })
  objects.set(job.runtimeExports[0].objectPath, { generation: '13', contentType: 'application/octet-stream', bytes: runtimeBody })
  let generation = 20
  const snapshot = (ref, view = records) => { const value = view.get(ref.path); return { id: ref.id, ref, exists: value !== undefined, readTime: new Timestamp(now), data: () => clone(value), get: key => key.split('.').reduce((v, part) => v?.[part], value) } }
  function doc(location) { return { path: location, id: location.split('/').at(-1), collection: name => collection(`${location}/${name}`),
    async get() { stats.reads.push(location); return snapshot(this) },
    async set(value, settings) { records.set(location, clone(settings?.merge ? { ...records.get(location), ...value } : value)) },
    async update(value) { assert.ok(records.has(location)); records.set(location, clone({ ...records.get(location), ...value })) },
    async delete() { records.delete(location) } } }
  function collection(location, filters = [], maximum = Infinity, afterId = '', ordered = false) {
    return { path: location, query: true, doc: id => doc(`${location}/${id ?? `synthetic-audit-${stats.transactions}`}`),
      where: (key, op, value) => collection(location, [...filters, [key, op, value]], maximum, afterId, ordered), limit: n => collection(location, filters, n, afterId, ordered),
      orderBy: field => { assert.equal(field,'__name__');return collection(location,filters,maximum,afterId,true) },
      startAfter: cursor => collection(location,filters,maximum,cursor.id,ordered),
      async get(view = records) { let keys = [...view.keys()].filter(key => key.startsWith(location + '/') && key.slice(location.length + 1).split('/').length === 1)
        .filter(key => filters.every(([field, op, value]) => op === 'in' ? value.includes(snapshot(doc(key),view).get(field)) : snapshot(doc(key),view).get(field) === value))
        if (ordered) keys.sort((a,b)=>Buffer.compare(Buffer.from(a),Buffer.from(b)))
        const docs = keys.filter(key=>!afterId||Buffer.compare(Buffer.from(doc(key).id),Buffer.from(afterId))>0).slice(0, maximum).map(key => snapshot(doc(key),view))
        stats.queryPages.push({location,maximum,afterId,size:docs.length})
        await options.afterQuery?.(location, records)
        return { docs, empty: docs.length === 0, size: docs.length, readTime:new Timestamp(options.snapshotChanged&&afterId?now+1:now) } } }
  }
  const db = { doc, collection,
    async runTransaction(callback, settings) {
      const writes = [], id = ++stats.transactions
      const view=settings?.readOnly ? new Map([...records].map(([key,value])=>[key,clone(value)])) : records
      if(settings?.readOnly)stats.readOnlyTransactions++
      const tx = { get: async ref => { assert.equal(writes.length, 0, 'no read after transaction writes'); return ref.query ? ref.get(view) : snapshot(ref,view) },
        create: (ref, value) => writes.push(() => { assert.ok(!records.has(ref.path)); records.set(ref.path, clone(value)) }),
        update: (ref, value) => writes.push(() => ref.update(value)), set: (ref, value, settings) => writes.push(() => ref.set(value, settings)) }
      const result = await callback(tx)
      if (options.failCommit === id) throw new Error('synthetic audit commit outage')
      for (const write of writes) await write()
      if (options.failAfterCommit === id || (typeof options.failAfterCommit==='function'&&options.failAfterCommit(id,records))) throw new Error('synthetic uncertain commit reply')
      await options.afterTransaction?.(id, records)
      return result
    },
    async recursiveDelete(ref) { stats.deleted.push(ref.path); for (const key of records.keys()) if (key === ref.path || key.startsWith(ref.path + '/')) records.delete(key) },
  }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const functions = { runWith: () => functions, https: { HttpsError, onCall: f => f, onRequest: f => f },
    firestore: { document: () => ({ onCreate: f => f }) }, pubsub: { schedule: () => ({ onRun: f => f }) } }
  const admin = { apps: [{}], firestore: Object.assign(() => db, { Timestamp, FieldPath:{documentId:()=> '__name__'}, FieldValue: { serverTimestamp: () => new Timestamp(now) } }),
    auth: () => ({ verifyIdToken: async (token, revoked) => { stats.auth.push({ revoked }); assert.equal(token, 'synthetic-token'); assert.equal(revoked, true); if (options.revokedToken) throw new Error('synthetic revoked session'); return { uid: options.authUid ?? uid, auth_time: options.authTime ?? Math.floor(now / 1000) - (options.staleAuth ? 400 : 0) } }, deleteUser: async () => {} }),
    storage: () => ({ bucket: () => ({ file: (location, settings) => ({ path: location,
      async getMetadata() { stats.metadata++; await options.afterMetadata?.(stats.metadata, records, objects); const object = objects.get(location); if (!object || (settings?.generation && settings.generation !== object.generation)) throw new Error('synthetic object generation missing'); return [{ generation: object.generation, size: String(object.bytes.length), contentType: object.contentType, metadata: object.metadata ?? {} }] },
      async getSignedUrl() { stats.signed++; return ['https://synthetic.invalid/irrevocable-signed-url'] },
      async save(bytes, options) { objects.set(location, { generation: String(++generation), bytes: Buffer.from(bytes), contentType: options.contentType, metadata: options.metadata?.metadata ?? {} }) },
      async setMetadata(value) { Object.assign(objects.get(location), clone(value)) },
      async copy(destination) { const source=objects.get(location); assert.equal(source.generation,settings.generation); objects.set(destination.path,{...source,bytes:Buffer.from(source.bytes),generation:String(++generation)}) },
      createReadStream() { stats.streams++; const object = objects.get(location); assert.equal(object.generation, settings.generation); if(options.realPipeline)return require('node:stream').Readable.from([object.bytes]); return { async *[Symbol.asyncIterator]() { yield object.bytes }, destroy() {} } },
    }), async deleteFiles({ prefix }) { for (const key of objects.keys()) if (key.startsWith(prefix)) objects.delete(key) } }) }) }
  const module = { exports: {} }
  let pagination
  const loadPagination = () => { if(pagination)return pagination; const result={exports:{}};vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../lib/apps/functions/src/exportPagination.js'),'utf8'),{module:result,exports:result.exports,Buffer,Error,Date:class extends Date{static now(){return options.clock?.value??now}},require:name=>{assert.equal(name,'firebase-admin');return admin}},{filename:'exportPagination.strict-compiled.js'});return pagination=result.exports }
  const filename = process.env.URAI_EXPORT_COMPILED_MODULE ?? path.resolve(__dirname, '../lib/apps/functions/src/privacyOperations.js')
  // Only actual strict-tsc output is accepted. No source transpilation fallback.
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module, exports: module.exports, Buffer, Error, URL, URLSearchParams,
    Date: class extends Date { static now() { return options.clock?.value ?? now } }, process: { env: { GCLOUD_PROJECT: 'urai-4dc1d', ...options.env } },
    console: Object.fromEntries(['log', 'info', 'error', 'warn'].map(method => [method, (...args) => stats.logs.push(args)])),
    require: name => {
      if (name === 'firebase-functions/v1') return functions
      if (name === 'firebase-admin') return admin
      if (name === 'node:crypto') return crypto
      if (name === 'node:stream/promises') return options.realPipeline ? require(name) : { pipeline: async (source, guard, response) => {
        assert.ok([...records.keys()].some(k => k.includes('/privacyAudit/') && records.get(k).action === 'export_download_authorized'), 'audit must commit before stream')
        try {
          const delivered = []
          for await (const chunk of guard(source)) { delivered.push(chunk); stats.chunks.push(chunk); response.headersSent = true; await options.afterChunk?.(stats.chunks.length, records) }
          response.body = Buffer.concat(delivered).toString(); response.writableFinished = true
        } catch (error) { response.destroyed = true; throw error }
      } }
      if (name === './personPresenceAuthority') return { revokePersonPresenceConsentDerivatives: async () => {} }
      if (name === './lifeModelPrivateInputs') return { exportPrivateLifeModelHandles: async () => [], tombstonePrivateLifeModelInputs: async () => {} }
      if (name === './exportPagination') return loadPagination()
      throw new Error(`Unexpected compiled module dependency: ${name}`)
    } }, { filename })
  const context = { auth: { uid, token: { auth_time: Math.floor(now / 1000) } }, rawRequest: { get: () => 'synthetic.invalid' } }
  const descriptor = (data = {}, auth = context) => (module.exports.getOperationalExportDownloadUrl||module.exports.getExportDownloadUrl)({ jobId, ...data }, auth)
  async function deliver(result, authenticated = true, requestOptions = {}) {
    const query = Object.fromEntries(new URL(result.url, 'https://synthetic.invalid').searchParams)
    let response = { headers: {}, statusCode: 200, headersSent: false, destroyed: false, writableFinished: false,
      set(key, value) { Object.assign(this.headers, typeof key === 'string' ? { [key]: value } : key); return this }, status(code) { this.statusCode = code; return this }, json(value) { this.body=clone(value); return this }, once() {}, end() { this.body = ''; this.writableFinished = true; return this } }
    if(options.realPipeline) {
      const headers={},bytes=[],{Writable}=require('node:stream')
      response=new Writable({highWaterMark:1,write(chunk,_encoding,callback){stats.chunks.push(Buffer.from(chunk));bytes.push(Buffer.from(chunk));response.headersSent=true;Promise.resolve(options.afterChunk?.(stats.chunks.length,records)).then(()=>callback(),callback)}})
      Object.assign(response,{headers,statusCode:200,headersSent:false,set(key,value){Object.assign(headers,typeof key==='string'?{[key]:value}:key);return this},status(code){this.statusCode=code;return this},json(value){this.end(JSON.stringify(value));return this}})
      Object.defineProperty(response,'body',{get:()=>Buffer.concat(bytes).toString()})
    }
    await module.exports.downloadOperationalExportPackage({ method: requestOptions.method ?? 'GET', query, get: name => {
      const supplied = requestOptions.headers?.[name.toLowerCase()] ?? (name === 'origin' ? requestOptions.origin : undefined)
      return supplied ?? (name === 'authorization' && authenticated ? 'Bearer synthetic-token' : undefined)
    } }, response)
    return response
  }
  return { records, objects, stats, context, descriptor, deliver, handlers: module.exports, db, Timestamp }
}

test('completed owner descriptor uses revocable authenticated delivery and committed audit', async () => {
  const f = fixture(), result = await f.descriptor()
  assert.equal(result.requiresAuthorization, true)
  assert.equal(result.ownerId, uid)
  assert.ok(result.url.startsWith('https://us-central1-urai-4dc1d.cloudfunctions.net/downloadOperationalExportPackage?'))
  assert.equal(result.downloadExpiresAt, now + 5 * 60000)
  assert.equal(f.stats.signed, 0)
  const response = await f.deliver(result)
  assert.equal(response.statusCode, 200); assert.equal(response.body, '{"synthetic":true}')
  assert.equal(response.headers['Cache-Control'], 'private, no-store'); assert.equal(f.stats.streams, 1)
})

for (const [label, change] of [
  ['missing canonical grant', f => f.records.delete(canonicalPath)],
  ['wrong canonical purpose',f=>{f.records.get(canonicalPath).purpose='memory.storage'}],
  ['missing canonical projection',f=>f.records.delete(canonicalFencePath)],
  ['foreign canonical projection',f=>{f.records.get(canonicalFencePath).uid='other-owner'}],
  ['revoked canonical projection',f=>{f.records.get(canonicalFencePath).exportConsentStatus='revoked'}],
  ['canonical projection receipt drift',f=>{f.records.get(canonicalFencePath).exportConsentReceiptHash='d'.repeat(64)}],
  ['canonical projection deadline drift',f=>{f.records.get(canonicalFencePath).exportConsentExpiresAt=new f.Timestamp(now+999999)}],
  ['canonical projection policy drift',f=>{f.records.get(canonicalFencePath).exportConsentPolicyVersion='old'}],
  ['canonical withdrawal', f => { f.records.get(canonicalPath).status='revoked' }],
  ['canonical denial', f => { f.records.get(canonicalPath).status='denied' }],
  ['wrong canonical tier', f => { f.records.get(canonicalPath).consentTier='C1' }],
  ['wrong canonical policy', f => { f.records.get(canonicalPath).policyVersion='0.0.0' }],
  ['foreign canonical owner', f => { f.records.get(canonicalPath).uid='other-owner' }],
  ['nonfinite canonical lifetime', f => { f.records.get(canonicalPath).expiresAt=new f.Timestamp(NaN) }],
  ['expired canonical grant', f => { f.records.get(canonicalPath).expiresAt=new f.Timestamp(now-1) }],
  ['missing canonical receipt', f => { delete f.records.get(canonicalPath).receiptHash }],
  ['corrected canonical receipt', f => { f.records.get(canonicalPath).receiptHash='d'.repeat(64) }],
  ['canonical subject deletion fence', f => f.records.set(canonicalFencePath,{active:true})],
  ['legacy canonical-unbound job', f => { delete f.records.get(jobPath).canonicalExportReceiptHash }],
  ['legacy canonical-unbound receipt', f => { delete f.records.get(receiptPath).canonicalExportReceiptHash }],
  ['limited operational export', f => { f.records.get(policyPath).domains.exports.mode='limited' }],
  ['partial operational enforcement', f => { f.records.get(policyPath).enforcement.state='partially-enforced' }],
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
  assert.equal(result.checksum, runtimeChecksum); assert.equal((await f.deliver(result)).body, 'synthetic-splat')
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

test('a stale queued deletion event cannot execute after current owner cancellation',async()=>{
  const f=fixture(),created=await f.handlers.createDeletionRequest({operationId:'synthetic-cancelled-event',scope:'memories',confirmation:'CONFIRM DELETE'},f.context)
  const queued=await f.db.doc(`deletionQueue/${created.jobId}`).get()
  f.records.set(`${prefix}/memories/private-synthetic`,{text:'Synthetic fixture retained after cancellation'})
  await f.handlers.cancelDeletionRequest({jobId:created.jobId},f.context)
  await f.handlers.processDeletionQueueItem(queued)
  assert.equal(f.records.get(`${prefix}/deletionJobs/${created.jobId}`).state,'cancelled')
  assert.ok(f.records.has(`${prefix}/memories/private-synthetic`));assert.equal(f.stats.deleted.length,0)
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
    const f = fixture(options)
    f.objects.get(exportPath).bytes = Buffer.alloc(128 * 1024, 's')
    f.records.get(jobPath).exportBytes = 128 * 1024; f.records.get(jobPath).checksum = hash(f.objects.get(exportPath).bytes)
    const result = await f.descriptor()
    const response = await f.deliver(result)
    assert.equal(f.stats.chunks.length, 1); assert.equal(f.stats.chunks[0].length, 64 * 1024)
    assert.equal(response.destroyed, true)
  })
}

for (const scope of ['memories', 'spatial']) {
  test(`1001 ${scope} records paginate completely with no partial-ready output`, async () => {
    const f = fixture()
    f.records.get(jobPath).state = 'queued'; f.records.get(jobPath).scopes = [scope]; f.records.get(receiptPath).result = 'queued'
    const name = scope === 'memories' ? 'memories' : 'capturedRealityAssets'
    for (let i = 0; i < 1001; i++) f.records.set(`${prefix}/${name}/synthetic-${String(i).padStart(5,'0')}`, { ownerId:uid, synthetic:i, apiKey:'must-not-export' })
    await f.handlers.processExportJob(await f.db.doc(jobPath).get())
    assert.equal(f.records.get(jobPath).state, 'ready')
    const payload=JSON.parse(f.objects.get(exportPath).bytes.toString()),rows=payload.data[name]
    assert.equal(rows.length,1001);assert.equal(new Set(rows.map(row=>row.id)).size,1001)
    assert.deepEqual(rows.map(row=>row.synthetic),Array.from({length:1001},(_,i)=>i))
    assert.ok(rows.every(row=>row.apiKey===undefined));assert.equal(payload.snapshotReadAt,new Date(now).toISOString())
    assert.equal(f.stats.readOnlyTransactions,1);assert.ok(f.stats.queryPages.filter(page=>page.location===`${prefix}/${name}`).every(page=>page.maximum===250))
  })
}

test('101 scenarios and601 nested branches use the same complete owner snapshot',async()=>{
  const f=fixture();f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['intelligence'];f.records.get(receiptPath).result='queued'
  for(let i=0;i<101;i++)f.records.set(`${prefix}/scenarios/scenario-${String(i).padStart(3,'0')}`,{label:i,id:'forged-stored-id'})
  for(let i=0;i<601;i++)f.records.set(`${prefix}/scenarios/scenario-000/branches/branch-${String(i).padStart(4,'0')}`,{meaning:i})
  f.records.set(`users/other-owner/scenarios/foreign`,{private:'never-owner-data'})
  await f.handlers.processExportJob(await f.db.doc(jobPath).get())
  const rows=JSON.parse(f.objects.get(exportPath).bytes.toString()).data.scenarios
  assert.equal(rows.length,101);assert.equal(rows[0].id,'scenario-000');assert.equal(rows[0].branches.length,601)
  assert.deepEqual(rows[0].branches.map(row=>row.meaning),Array.from({length:601},(_,i)=>i));assert.equal(f.stats.readOnlyTransactions,1)
})

test('cross-page insertion, deletion and correction cannot mix export snapshot versions',async()=>{
  let changed=false
  const f=fixture({afterQuery:(location,records)=>{if(location===`${prefix}/memories`&&!changed){changed=true;records.delete(`${location}/memory-0300`);records.get(`${location}/memory-0400`).meaning='later-correction';records.set(`${location}/memory-0601`,{meaning:'later-insertion'})}}})
  f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['memories'];f.records.get(receiptPath).result='queued'
  for(let i=0;i<601;i++)f.records.set(`${prefix}/memories/memory-${String(i).padStart(4,'0')}`,{meaning:i})
  await f.handlers.processExportJob(await f.db.doc(jobPath).get())
  const rows=JSON.parse(f.objects.get(exportPath).bytes.toString()).data.memories
  assert.equal(rows.length,601);assert.deepEqual(rows.map(row=>row.meaning),Array.from({length:601},(_,i)=>i))
  assert.equal(f.records.get(`${prefix}/memories/memory-0400`).meaning,'later-correction')
})

test('UTF8 document cursor order exports supplementary and BMP names without false overflow',async()=>{
  const f=fixture();f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['memories'];f.records.get(receiptPath).result='queued'
  const names=['a','\uE000','\u{10000}'];for(const name of names)f.records.set(`${prefix}/memories/${name}`,{name})
  await f.handlers.processExportJob(await f.db.doc(jobPath).get())
  assert.deepEqual(JSON.parse(f.objects.get(exportPath).bytes.toString()).data.memories.map(row=>row.id),names)
})

for(const reason of ['snapshot','byte-budget','time-budget','document-budget','withdrawal']) {
  test(`pagination ${reason} denial cleans staged output without publishing ready`,async()=>{
    const options={clock:{value:now},snapshotChanged:reason==='snapshot',afterQuery:(location,records)=>{if(reason==='withdrawal'&&location===`${prefix}/memories`)records.get(canonicalPath).status='withdrawn';if(reason==='time-budget'&&location===`${prefix}/memories`)options.clock.value=now+240001}}
    const f=fixture(options);f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['memories'];f.records.get(receiptPath).result='queued'
    for(let i=0;i<(reason==='byte-budget'?22:reason==='document-budget'?20001:601);i++)f.records.set(`${prefix}/memories/item-${String(i).padStart(5,'0')}`,{text:reason==='byte-budget'?'t'.repeat(800000):'small'})
    await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()),reason==='snapshot'?/EXPORT_SNAPSHOT_CHANGED/:reason.endsWith('budget')?/EXPORT_RESOURCE_BUDGET_EXCEEDED/:{code:'failed-precondition'})
    assert.equal(f.records.get(jobPath).state,'failed');assert.equal(f.records.get(receiptPath).result,'failed');assert.equal(f.objects.size,0)
    if(reason.endsWith('budget'))assert.equal(f.records.get(jobPath).failureCode,'EXPORT_RESOURCE_BUDGET_EXCEEDED')
  })
}

test('601 Captured Reality runtime records copy every validated source and keep source authority',async()=>{
  const f=fixture()
  f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['spatial'];f.records.get(receiptPath).result='queued'
  for(let i=0;i<601;i++) {
    const assetId=`captured-${String(i).padStart(4,'0')}`,sourcePath=`private-captured-reality/${uid}/${assetId}/runtime/${runtimeChecksum}.splat`
    f.objects.set(sourcePath,{generation:'77',bytes:runtimeBody,contentType:'application/octet-stream',metadata:{uraiRuntimeSha256:runtimeChecksum}})
    f.records.set(`${prefix}/capturedRealityAssets/${assetId}`,{ownerId:uid,runtimeObject:sourcePath,runtimeSha256:runtimeChecksum,runtimeStorageGeneration:'77'})
  }
  await f.handlers.processExportJob(await f.db.doc(jobPath).get())
  assert.equal(f.records.get(jobPath).state,'ready');assert.equal(f.records.get(jobPath).runtimeExports.length,601)
  const payload=JSON.parse(f.objects.get(exportPath).bytes.toString())
  assert.equal(payload.data.capturedRealityAssets.length,601);assert.equal(payload.data.capturedRealityRuntimeAssets.length,601)
  assert.equal([...f.objects.keys()].filter(path=>path.startsWith(`private-captured-reality/${uid}/`)).length,601)
  const descriptor=await f.descriptor({file:'runtime',assetId:'captured-0600'})
  assert.equal(descriptor.checksum,runtimeChecksum);assert.equal(descriptor.byteLength,runtimeBody.length)
})

test('uncertain successful publication reply preserves committed bytes and completion receipt', async () => {
  const f = fixture({ failAfterCommit: (_id,records)=>records.get(jobPath).state==='ready' })
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

test('canonical C7 grant is required for new work; operational compatibility cannot grant it', async () => {
  const f=fixture(); f.records.delete(canonicalPath)
  f.records.set(`${prefix}/consents/export`,{status:'granted',purpose:'data.export'})
  await assert.rejects(f.handlers.createExportRequest({operationId:'synthetic-canonical-required',scopes:['profile']},f.context),{code:'failed-precondition'})
  assert.equal([...f.records.keys()].filter(key=>key.includes('/exportJobs/')).length,1)
  const g=fixture(), created=await g.handlers.createExportRequest({operationId:'synthetic-canonical-bound',scopes:['profile']},g.context)
  const job=g.records.get(`${prefix}/exportJobs/${created.jobId}`), receipt=g.records.get(`${prefix}/privacyReceipts/${created.receiptId}`)
  for(const key of Object.keys(canonicalBinding)) { assert.equal(job[key],canonicalBinding[key]); assert.equal(receipt[key],canonicalBinding[key]) }
})

for(const tampered of [false,true]) {
  test(`Captured Reality publication ${tampered?'denies forged source checksum':'verifies actual runtime bytes and preserves the source'}`,async()=>{
    const f=fixture(),assetId='synthetic-captured-asset',sourcePath=`private-captured-reality/${uid}/${assetId}/runtime/${runtimeChecksum}.splat`
    f.objects.set(sourcePath,{generation:'77',bytes:tampered?Buffer.from('forged-runtime'):runtimeBody,contentType:'application/octet-stream',metadata:{uraiRuntimeSha256:runtimeChecksum}})
    f.records.set(`${prefix}/capturedRealityAssets/${assetId}`,{ownerId:uid,runtimeObject:sourcePath,runtimeSha256:runtimeChecksum,runtimeStorageGeneration:'77'})
    f.records.get(jobPath).state='queued';f.records.get(jobPath).scopes=['spatial'];f.records.get(receiptPath).result='queued'
    if(tampered) {
      await assert.rejects(f.handlers.processExportJob(await f.db.doc(jobPath).get()),/CAPTURED_REALITY_EXPORT_RUNTIME_CHECKSUM_CHANGED/)
      assert.equal(f.records.get(jobPath).state,'failed')
    } else {
      await f.handlers.processExportJob(await f.db.doc(jobPath).get())
      assert.equal(f.records.get(jobPath).state,'ready')
      const descriptor=await f.descriptor({file:'runtime',assetId})
      assert.equal(descriptor.checksum,runtimeChecksum);assert.equal(descriptor.byteLength,runtimeBody.length)
      assert.equal((await f.deliver(descriptor)).body,runtimeBody.toString())
    }
    assert.ok(f.objects.has(sourcePath))
  })
}

test('manifest and runtime descriptors bind the actual selected bytes and immutable metadata',async()=>{
  const f=fixture()
  for(const [file,expectedBytes,checksum,contentType,generation] of [
    ['export',exportBody,exportChecksum,'application/json','11'],
    ['manifest',manifestBody,manifestChecksum,'application/json','12'],
    ['runtime',runtimeBody,runtimeChecksum,'application/octet-stream','13'],
  ]) {
    const descriptor=await f.descriptor({file,...(file==='runtime'?{assetId:'synthetic-asset'}:{})})
    assert.equal(descriptor.schemaVersion,'urai-spatial-export-download-v1')
    assert.equal(descriptor.checksum,checksum);assert.equal(descriptor.byteLength,expectedBytes.length)
    assert.equal(descriptor.contentType,contentType);assert.equal(descriptor.storageGeneration,generation)
    assert.equal(descriptor.assetId,file==='runtime'?'synthetic-asset':null)
    const response=await f.deliver(descriptor);assert.equal(response.statusCode,200)
    assert.equal(response.headers['X-URAI-Checksum-SHA256'],checksum)
    assert.equal(response.headers['Content-Length'],String(expectedBytes.length))
  }
})

test('issued nonce prevents a reconstructed URL from extending its transport deadline',async()=>{
  const options={clock:{value:now}},f=fixture(options),descriptor=await f.descriptor()
  options.clock.value+=30000
  const url=new URL(descriptor.url,'https://synthetic.invalid');url.searchParams.set('expiresAt',String(descriptor.downloadExpiresAt+10000))
  assert.equal((await f.deliver({...descriptor,url:url.toString()})).statusCode,409)
  const forged=new URL(descriptor.url,'https://synthetic.invalid');forged.searchParams.set('authorityHash','f'.repeat(64))
  assert.equal((await f.deliver({...descriptor,url:forged.toString()})).statusCode,409)
  assert.equal(f.stats.streams,0)
})

test('project-pinned CORS preflight admits only controlled origins and no bytes or credentials',async()=>{
  const f=fixture(),descriptor=await f.descriptor()
  const accepted=await f.deliver(descriptor,false,{method:'OPTIONS',origin:'https://urai.app',headers:{'access-control-request-method':'GET','access-control-request-headers':'authorization'}})
  assert.equal(accepted.statusCode,204);assert.equal(accepted.headers['Access-Control-Allow-Origin'],'https://urai.app')
  assert.equal(accepted.headers['Access-Control-Allow-Credentials'],undefined)
  assert.equal((await f.deliver(descriptor,true,{origin:'https://untrusted.invalid'})).statusCode,403)
  assert.equal(f.stats.streams,0)
  const wrong=fixture({env:{GCLOUD_PROJECT:'other-project'}})
  await assert.rejects(wrong.descriptor(),{code:'failed-precondition'})
})

for(const reason of ['canonical-withdrawal','canonical-correction']) {
  test(`streaming stops after current ${reason}, before the next 64KiB`,async()=>{
    const options={afterChunk:(_count,records)=>{
      if(reason==='canonical-withdrawal')records.get(canonicalPath).status='revoked'
      else records.get(canonicalPath).receiptHash='d'.repeat(64)
    }},f=fixture(options)
    f.objects.get(exportPath).bytes=Buffer.alloc(128*1024,'s')
    f.records.get(jobPath).exportBytes=128*1024;f.records.get(jobPath).checksum=hash(f.objects.get(exportPath).bytes)
    const descriptor=await f.descriptor(),response=await f.deliver(descriptor)
    assert.equal(f.stats.chunks.length,1);assert.equal(f.stats.chunks[0].length,64*1024);assert.equal(response.destroyed,true)
  })
}

test('compiled Functions entry exports distinct Spatial names without canonical Privacy overwrite',()=>{
  const f=fixture(),entry={exports:{}}
  const filename=path.resolve(__dirname,'../lib/apps/functions/src/index.js')
  vm.runInNewContext(fs.readFileSync(filename,'utf8'),{exports:entry.exports,module:entry,require:name=>name==='./privacyOperations'?f.handlers:{}},{filename})
  const names={createExportRequest:'createSpatialExportRequest',cancelExportRequest:'cancelSpatialExportRequest',createDeletionRequest:'createSpatialDeletionRequest',cancelDeletionRequest:'cancelSpatialDeletionRequest',getOperationalExportDownloadUrl:'getOperationalExportDownloadUrl',downloadOperationalExportPackage:'downloadOperationalExportPackage'}
  for(const [canonical,owned] of Object.entries(names)) {if(canonical!==owned)assert.equal(Object.hasOwn(entry.exports,canonical),false);assert.equal(entry.exports[owned],f.handlers[canonical])}
})

test('actual Node pipeline obeys byte integrity/backpressure and stops canonical revocation before the next64KiB',async()=>{
  for(const revoke of [false,true]) {
    const f=fixture({realPipeline:true,afterChunk:(_count,records)=>{if(revoke)records.get(canonicalPath).status='revoked'}})
    f.objects.get(exportPath).bytes=Buffer.alloc(150000,65)
    f.records.get(jobPath).exportBytes=150000;f.records.get(jobPath).checksum=hash(f.objects.get(exportPath).bytes)
    const descriptor=await f.descriptor(),response=await f.deliver(descriptor)
    assert.equal(Buffer.byteLength(response.body),revoke?65536:150000)
    assert.equal(response.writableFinished,!revoke);assert.ok(f.stats.chunks.every(chunk=>chunk.length<=65536))
  }
})

test('deployment source guard rejects canonical namespace, wrong project, wrong route and Storage credentials',async()=>{
  const root=path.resolve(__dirname,'../../..')
  const {verifySpatialExportDeploymentBoundary:verify}=await import(path.join(root,'scripts/check-spatial-export-deployment-boundary.mjs'))
  const baseline={index:fs.readFileSync(path.join(root,'apps/functions/src/index.ts'),'utf8'),operations:fs.readFileSync(path.join(root,'apps/functions/src/privacyOperations.ts'),'utf8'),firebase:JSON.parse(fs.readFileSync(path.join(root,'firebase.json'),'utf8')),projects:JSON.parse(fs.readFileSync(path.join(root,'.firebaserc'),'utf8'))}
  assert.deepEqual(verify(baseline),[])
  const samples=[
    {...baseline,index:baseline.index.replace('getOperationalExportDownloadUrl,','getExportDownloadUrl,')},
    {...baseline,operations:baseline.operations+'\nfile.getSignedUrl({action:"read"})'},
    {...baseline,projects:{projects:{spatial:'other-project'}}},
    {...baseline,firebase:{...baseline.firebase,functions:{...baseline.firebase.functions,codebase:'default'}}},
    {...baseline,firebase:{...baseline.firebase,hosting:{...baseline.firebase.hosting,rewrites:baseline.firebase.hosting.rewrites.map(route=>route.source==='/api/privacy/export/download'?{...route,function:{functionId:'downloadExportPackage',region:'us-central1'}}:route)}}},
  ]
  for(const sample of samples)assert.ok(verify(sample).length>0)
})


const allowedBrowserOrigins = ['https://urai.app', 'https://www.urai.app', 'https://urai.life', 'https://uraispatial.com', 'http://localhost', 'https://urai-4dc1d.web.app',
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
  'https://urai.app/', 'https://localhost:4321', 'http://localhost:4321', 'https://other-project--review-ab12.web.app',
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
  { 'access-control-request-method': 'GET' },
  { 'access-control-request-method': 'GET', 'access-control-request-headers': '' },
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


test('preflight without an Origin cannot access authentication or private data', async () => {
  const f = fixture(), response = await f.deliver({ url: '/api/privacy/export/download' }, false, {
    method: 'OPTIONS', headers: { 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
  })
  assert.equal(response.statusCode, 403); assert.equal(response.headers['Access-Control-Allow-Origin'], undefined)
  assert.equal(f.stats.auth.length, 0); assert.equal(f.stats.transactions, 0); assert.equal(f.stats.metadata, 0); assert.equal(f.stats.streams, 0)
})

for (const phase of ['initial authority', 'metadata', 'audit']) {
  for (const drift of ['revocation', 'owner change', 'stale recent auth']) {
    test(`post-await ${drift} during ${phase} cannot start a private object stream`, async () => {
      const options = { realPipeline: true }
      const invalidate = () => {
        if (drift === 'revocation') options.revokedToken = true
        else if (drift === 'owner change') options.authUid = 'synthetic-other-owner'
        else options.authTime = Math.floor(now / 1000) - 301
      }
      options.afterTransaction = id => { if ((phase === 'initial authority' && id === 3) || (phase === 'audit' && id === 4)) invalidate() }
      options.afterMetadata = count => { if (phase === 'metadata' && count === 2) invalidate() }
      const f = fixture(options), descriptor = await f.descriptor(), response = await f.deliver(descriptor)
      assert.equal(f.stats.streams, 0, 'a revoked, foreign or stale token must be checked after awaits and before stream creation')
      assert.equal(response.statusCode, drift === 'revocation' ? 401 : drift === 'owner change' ? 403 : 409)
      if (phase === 'initial authority') assert.equal(f.stats.metadata, 1, 'do not read the private object using auth invalidated during authority lookup')
    })
  }
}
for (const readTransaction of [5, 6]) {
  for (const drift of ['revocation', 'owner change', 'stale recent auth']) {
    test(`real pipeline post-await ${drift} during chunk transaction${readTransaction} stops before that64KiB`, async () => {
      const options = { realPipeline: true, afterTransaction(id) {
        if (id !== readTransaction) return
        if (drift === 'revocation') options.revokedToken = true
        else if (drift === 'owner change') options.authUid = 'synthetic-other-owner'
        else options.authTime = Math.floor(now / 1000) - 301
      } }
      const f = fixture(options); f.objects.get(exportPath).bytes = Buffer.alloc(150000, 65)
      f.records.get(jobPath).exportBytes = 150000; f.records.get(jobPath).checksum = hash(f.objects.get(exportPath).bytes)
      const descriptor = await f.descriptor(), response = await f.deliver(descriptor)
      const alreadyAuthorized = (readTransaction - 5) * 65536
      assert.equal(Buffer.byteLength(response.body), alreadyAuthorized, 'no chunk may use token verification performed before an awaited authority read')
      assert.equal(f.stats.chunks.length, readTransaction - 5)
      assert.equal(response.writableFinished, false)
      assert.ok(f.stats.auth.every(check => check.revoked === true))
    })
  }
}

for (const drift of ['revocation', 'owner change', 'stale recent auth']) {
  test(`real pipeline final authority read cannot complete with post-await ${drift}`, async () => {
    const options = { realPipeline: true, afterTransaction(id) {
      if (id !== 8) return
      if (drift === 'revocation') options.revokedToken = true
      else if (drift === 'owner change') options.authUid = 'synthetic-other-owner'
      else options.authTime = Math.floor(now / 1000) - 301
    } }
    const f = fixture(options); f.objects.get(exportPath).bytes = Buffer.alloc(150000, 65)
    f.records.get(jobPath).exportBytes = 150000; f.records.get(jobPath).checksum = hash(f.objects.get(exportPath).bytes)
    const descriptor = await f.descriptor(), response = await f.deliver(descriptor)
    assert.equal(Buffer.byteLength(response.body), 150000, 'already authorized delivered bytes cannot be recalled')
    assert.equal(response.writableFinished, false, 'the transfer cannot finish using auth verified before its final authority await')
  })
}
