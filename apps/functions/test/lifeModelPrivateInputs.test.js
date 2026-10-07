import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const sha = value => createHash('sha256').update(value).digest('hex')
const SCHEMA = 'urai-private-life-model-inputs-v1'
const uid = 'ownerFixture'
const body = { sourceHandle: 'psh_opaque_source_fixture_01', transcriptRef: 'private:fixtures/transcript-01', provenanceRef: 'private:fixtures/provenance-01', requestedPurpose: 'memory-index', idempotencyKey: 'fixture-request-01' }
const sourceId = 'source-fixture-01'
const prefix = `users/${uid}`
const sourcePath = `${prefix}/privateLifeModelSources/${sourceId}`
const transcriptPath = `${prefix}/privateLifeModelTranscripts/${sha(body.transcriptRef)}`
const provenancePath = `${prefix}/privateLifeModelProvenance/${sha(body.provenanceRef)}`
const handlePath = `privateLifeModelSourceHandles/${sha(body.sourceHandle)}`
const narration = 'This is fictional test narration. No private source is present.'

function fixture(options = {}) {
  const shared = { schemaVersion: SCHEMA, state: 'current', synthetic: false, ownerId: uid, sourceId, sourceSha256: 'a'.repeat(64), sourceReceiptRef: 'private:fixtures/source-receipt-01', sourceRevision: 1 }
  const records = new Map([
    [handlePath, { ...shared, ownerDataEpoch: 0, transcriptRef: body.transcriptRef, provenanceRef: body.provenanceRef }],
    [sourcePath, { ...shared, revision: 1, sourceEvidenceClass: 'ATTRIBUTED_TESTIMONY', sourceFixityRef: 'private:fixtures/fixity-01', transcriptRef: body.transcriptRef, provenanceRef: body.provenanceRef, transcriptSha256: sha(narration), consentRevision: 4, consentState: 'authorized', externalProcessingConsent: true, purposes: ['memory-index'] }],
    [transcriptPath, { ...shared, opaqueRef: body.transcriptRef, text: narration, sha256: sha(narration) }],
    [provenancePath, { ...shared, opaqueRef: body.provenanceRef, transcriptSha256: sha(narration) }],
    [`${prefix}/privacyPolicy/current`, { ownerId: uid, revision: 4, domains: { memory: { mode: 'granted', modelContext: true }, models: { mode: 'limited', modelContext: true }, identity: { mode: 'limited' } }, enforcement: { state: 'fully-enforced' } }],
    [`${prefix}/providerConnections/openai`, { processingAllowed: true, revocationState: 'not-required' }],
  ])
  const stats = { reads: 0, transactions: 0, logs: [], deleted: [], files: new Map() }
  const snapshot = path => {
    const value = records.get(path)
    return { id: path.split('/').at(-1), ref: document(path), exists: value !== undefined,
      data: () => value === undefined ? undefined : structuredClone(value),
      get: key => key.split('.').reduce((result, part) => result?.[part], value) }
  }
  function document(path) {
    return { path, id: path.split('/').at(-1), collection: name => collection(`${path}/${name}`),
      async get() { stats.reads++; return snapshot(path) },
      async set(value, settings) { records.set(path, structuredClone(settings?.merge ? { ...records.get(path), ...value } : value)) },
      async update(value) { assert.ok(records.has(path)); records.set(path, structuredClone({ ...records.get(path), ...value })) },
      async delete() { records.delete(path) } }
  }
  function collection(path, filters = [], maximum = Infinity) {
    return { path, doc: id => document(`${path}/${id}`),
      where: (key, operator, value) => { assert.equal(operator, '=='); return collection(path, [...filters, [key, value]], maximum) },
      limit: limit => collection(path, filters, limit),
      async get() {
        const docs = [...records.keys()].filter(key => key.startsWith(path + '/') && key.slice(path.length + 1).split('/').length === 1)
          .filter(key => filters.every(([field, value]) => snapshot(key).get(field) === value)).sort().slice(0, maximum).map(snapshot)
        return { size: docs.length, docs, empty: docs.length === 0 }
      } }
  }
  const db = {
    doc: document, collection,
    async runTransaction(callback) {
      const writes = []
      const tx = { get: async ref => { stats.reads++; return snapshot(ref.path) }, getAll: async (...refs) => refs.map(ref => snapshot(ref.path)),
        set(ref, value, settings) { writes.push(() => ref.set(value, settings)) }, update(ref, value) { writes.push(() => ref.update(value)) } }
      const result = await callback(tx)
      for (const write of writes) await write()
      const count = ++stats.transactions
      await options.afterTransaction?.(count, records, service)
      return result
    },
    batch() {
      const writes = []
      return { set(ref, value, settings) { writes.push(() => ref.set(value, settings)) },
        async commit() { for (const write of writes) await write() } }
    },
    async recursiveDelete(ref) {
      stats.deleted.push(ref.path)
      for (const path of records.keys()) if (path === ref.path || path.startsWith(ref.path + '/')) records.delete(path)
    },
  }
  const functions = { region: () => functions, runWith: () => functions,
    https: { onRequest: handler => handler, onCall: handler => handler, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code } } },
    firestore: { document: () => ({ onCreate: handler => handler }) }, pubsub: { schedule: () => ({ onRun: handler => handler }) } }
  const firestore = Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'fixture-server-time' }, Timestamp: { fromMillis: value => ({ value }) } })
  const admin = { apps: [{}], firestore, initializeApp() {}, auth: () => ({ deleteUser: async () => {} }),
    storage: () => ({ bucket: () => ({ deleteFiles: async () => {}, file: path => ({ save: async bytes => { stats.files.set(path, Buffer.from(bytes)) } }) }) }) }
  const env = { URAI_PRIVATE_LIFE_MODEL_INPUTS_ENABLED: 'true', PRIVATE_SOURCE_REF_RESOLVER_TOKEN: 'fixture-resolver-token', GCLOUD_PROJECT: 'urai-4dc1d', URAI_SOURCE_SHA: 'c'.repeat(40), ...options.env }
  let service
  function load(filename) {
    const exports = {}
    const code = ts.transpileModule(fs.readFileSync(`src/${filename}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    vm.runInNewContext(code, { exports, Buffer, process: { env }, console: { warn: value => stats.logs.push(String(value)), error: value => stats.logs.push(String(value)), log: value => stats.logs.push(String(value)) },
      require(name) {
        if (name === 'firebase-functions/v1') return functions
        if (name === 'firebase-admin') return admin
        if (name === './lifeModelPrivateInputs') return service
        if (name === 'node:crypto') return require(name)
        throw new Error(`Unexpected private-input dependency: ${name}`)
      } }, { filename })
    return exports
  }
  service = load('lifeModelPrivateInputs')
  return { records, stats, db, service, load,
    async resolve(extra = {}, overrides = {}) {
      const response = { statusCode: 200, headers: {}, body: undefined, setHeader(key, value) { this.headers[key] = value }, status(value) { this.statusCode = value; return this }, json(value) { this.body = structuredClone(value) } }
      await service.resolveLifeModelPrivateInputs({ method: 'POST', path: '/resolve-life-model-inputs', headers: { authorization: 'Bearer fixture-resolver-token' }, body: { ...body, ...extra }, ...overrides }, response)
      return response
    } }
}

test('protected resolver derives owner and current private bytes from canonical receipt authority', async () => {
  const f = fixture(), response = await f.resolve()
  assert.equal(response.statusCode, 200)
  assert.equal(response.body.authorized, true)
  assert.equal(response.body.ownerUid, uid)
  assert.equal(response.body.transcriptText, narration)
  assert.equal(response.body.transcriptSha256, sha(narration))
  assert.equal(response.body.sourceHandle, body.sourceHandle)
  assert.equal(response.body.synthetic, false)
  assert.equal(response.headers['Cache-Control'], 'no-store, max-age=0')
  assert.equal(f.stats.transactions, 2)
  assert.equal(f.stats.logs.length, 0)
})

for (const [label, mutate] of [
  ['revoked source consent', f => { f.records.get(sourcePath).consentState = 'revoked' }],
  ['expired purpose grant', f => { f.records.get(sourcePath).purposes = ['transcribe'] }],
  ['absent explicit external-AI consent', f => { f.records.get(sourcePath).externalProcessingConsent = false }],
  ['foreign transcript owner', f => { f.records.get(transcriptPath).ownerId = 'foreignFixtureOwner' }],
  ['synthetic source authority', f => { f.records.get(sourcePath).synthetic = true }],
  ['unsupported evidence class', f => { f.records.get(sourcePath).sourceEvidenceClass = 'SYNTHETIC_SIMULATION' }],
  ['transcript byte mutation', f => { f.records.get(transcriptPath).text = 'Unbound fictional replacement' }],
  ['changed source fixity', f => { f.records.get(sourcePath).sourceSha256 = 'b'.repeat(64) }],
  ['changed source revision', f => { f.records.get(sourcePath).revision = 2 }],
  ['artifact source mismatch', f => { f.records.get(provenancePath).sourceId = 'foreign-fixture-source' }],
  ['pending privacy enforcement', f => { f.records.get(`${prefix}/privacyPolicy/current`).enforcement.state = 'pending' }],
  ['changed policy revision', f => { f.records.get(`${prefix}/privacyPolicy/current`).revision = 5 }],
  ['denied Memory domain', f => { f.records.get(`${prefix}/privacyPolicy/current`).domains.memory.mode = 'denied' }],
  ['denied Models context', f => { f.records.get(`${prefix}/privacyPolicy/current`).domains.models.modelContext = false }],
  ['denied Identity domain', f => { f.records.get(`${prefix}/privacyPolicy/current`).domains.identity.mode = 'denied' }],
  ['revoked provider processing', f => { f.records.get(`${prefix}/providerConnections/openai`).processingAllowed = false }],
]) {
  test(`protected resolver rejects ${label}`, async () => {
    const f = fixture(); mutate(f)
    const response = await f.resolve()
    assert.equal(response.statusCode, 403)
    assert.equal(response.body.authorized, false)
    assert.equal(response.body.transcriptText, undefined)
    assert.ok(f.stats.logs.every(value => !value.includes(narration) && !value.includes(uid)))
  })
}

test('service credential, exact source and canonical project are required before reads', async () => {
  for (const env of [{ URAI_PRIVATE_LIFE_MODEL_INPUTS_ENABLED: 'false' }, { PRIVATE_SOURCE_REF_RESOLVER_TOKEN: '' }, { GCLOUD_PROJECT: 'foreign-fixture-project' }, { URAI_SOURCE_SHA: '' }]) {
    const f = fixture({ env }); assert.equal((await f.resolve()).statusCode, 503); assert.equal(f.stats.reads, 0)
  }
  const f = fixture()
  assert.equal((await f.resolve({}, { headers: { authorization: 'Bearer foreign-fixture-token' } })).statusCode, 401)
  assert.equal(f.stats.reads, 0)
})

test('caller owner IDs, arbitrary refs and private inline text cannot select authority', async () => {
  const f = fixture()
  for (const extra of [{ ownerId: 'foreignFixtureOwner' }, { transcriptText: narration }, { transcriptRef: 'https://example.invalid/private' }]) {
    assert.equal((await f.resolve(extra)).statusCode, 400)
  }
  assert.equal(f.stats.reads, 0)
})

test('revocation or deletion during an initial read cannot deliver private bytes', async () => {
  for (const change of [records => { records.get(sourcePath).consentState = 'revoked' }, records => records.delete(transcriptPath)]) {
    const f = fixture({ afterTransaction: count => { if (count === 1) change(f.records) } })
    const response = await f.resolve()
    assert.equal(response.statusCode, 403)
    assert.equal(response.body.transcriptText, undefined)
  }
})

test('current consent revision cannot race a previously resolved input into delivery', async () => {
  const f = fixture({ afterTransaction: count => { if (count === 1) f.records.get(`${prefix}/privacyPolicy/current`).revision = 5 } })
  assert.equal((await f.resolve()).statusCode, 403)
})

test('permanent deletion barrier denies restored source records and delayed handle reuse', async () => {
  const f = fixture()
  const oldHandle = structuredClone(f.records.get(handlePath))
  await f.service.tombstonePrivateLifeModelInputs(f.db, uid, 'fixture-delete-time')
  assert.equal(f.records.get(handlePath).state, 'revoked')
  assert.equal(f.records.get(handlePath).ownerId, undefined)
  f.records.set(handlePath, oldHandle)
  assert.equal((await f.resolve()).statusCode, 403)
  assert.equal(f.records.get(`privateLifeModelOwnerBarriers/${sha(uid)}`).blocked, true)
})

test('deletion while resolving closes the entire owner input authority before delivery', async () => {
  const f = fixture({ afterTransaction: async (count, _records, service) => { if (count === 1) await service.tombstonePrivateLifeModelInputs(f.db, uid, 'fixture-delete-time') } })
  const response = await f.resolve()
  assert.equal(response.statusCode, 403)
  assert.equal(response.body.transcriptText, undefined)
})

test('actual life-model export includes private source, transcript and provenance records', async () => {
  const f = fixture(), privacy = f.load('privacyOperations')
  const jobPath = `${prefix}/exportJobs/fixture-export`
  f.records.set(jobPath, { uid, scopes: ['life-model'], state: 'queued', receiptId: 'fixture-receipt' })
  f.records.set(`${prefix}/privacyReceipts/fixture-receipt`, {})
  await privacy.processExportJob(await f.db.doc(jobPath).get())
  assert.equal(f.records.get(jobPath).state, 'ready')
  const payload = JSON.parse(f.stats.files.get(`private-exports/${uid}/fixture-export/export.json`).toString())
  assert.equal(payload.data.privateLifeModelSources.length, 1)
  assert.equal(payload.data.privateLifeModelTranscripts[0].text, narration)
  assert.equal(payload.data.privateLifeModelProvenance.length, 1)
  assert.equal(payload.data.privateLifeModelTranscripts[0].ownerId, uid)
  assert.equal(payload.data.privateLifeModelSourceHandles[0].id, sha(body.sourceHandle))
  assert.equal(payload.data.privateLifeModelSourceHandles[0].sourceId, sourceId)
})

test('actual life-model deletion tombstones handles before erasing all three private input tables', async () => {
  const f = fixture(), privacy = f.load('privacyOperations')
  const jobPath = 'deletionQueue/fixture-delete'
  f.records.set(jobPath, { uid, scope: 'life-model', state: 'queued', receiptId: 'fixture-receipt' })
  f.records.set(`${prefix}/deletionJobs/fixture-delete`, {})
  await privacy.processDeletionQueueItem(await f.db.doc(jobPath).get())
  assert.equal(f.records.get(jobPath).state, 'completed')
  assert.equal(f.records.has(sourcePath), false)
  assert.equal(f.records.has(transcriptPath), false)
  assert.equal(f.records.has(provenancePath), false)
  assert.equal(f.records.get(handlePath).state, 'revoked')
  assert.equal((await f.resolve()).statusCode, 403)
})
