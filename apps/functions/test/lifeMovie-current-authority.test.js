import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Actual Functions callable under an in-memory Firestore contract: no cloud,
// no live owner data and no paid services. Real emulator acceptance is separate.
const source = fs.readFileSync(new URL('../src/lifeMovie.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'lifeMovie.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
})
assert.equal(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error).length ?? 0, 0)

const uid = 'fictional-owner-a'
const memoryPath = 'users/' + uid + '/memories/fictional-memory'
const scenePath = 'users/' + uid + '/sceneTruthPackets/fictional-scene'
const moviePath = 'users/' + uid + '/lifeMovies/fictional-movie'

function fixture({ consentState = 'authorized', beforeTransaction = null, status = 'ready' } = {}) {
  const records = new Map([
    [memoryPath, { ownerId: uid, consentState, deleted: false,
      lifeMovie: { sceneTruthPacketId: 'fictional-scene', provenance: { sourceIds: ['fictional'] } } }],
    [scenePath, { ownerId: uid, state: 'current', schemaVersion: 'urai-life-model-v1',
      syntheticOutputMayBecomeHistoricalSource: false, decision: 'READY', dependencyIds: [] }],
  ])
  const stats = { transactionReads: [], writes: [], audits: [], outsideReads: 0 }
  const snapshot = path => ({
    exists: records.has(path), id: path.split('/').at(-1),
    ref: { parent: { parent: { id: path.split('/')[1] } } },
    get(field) { return records.get(path)?.[field] },
  })
  const db = {
    doc(path) { return { path } },
    async getAll(...refs) { stats.outsideReads++; return refs.map(ref => snapshot(ref.path)) },
    collection(path) { return { async add(value) { stats.audits.push({ path, value }) } } },
    async runTransaction(fn) {
      beforeTransaction?.(records)
      const pending = []
      const result = await fn({
        async get(ref) { stats.transactionReads.push(ref.path); return snapshot(ref.path) },
        set(ref, value) { pending.push({ path: ref.path, value }) },
      })
      for (const entry of pending) records.set(entry.path, entry.value)
      stats.writes.push(...pending)
      return result
    },
  }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const functions = { region: () => ({ https: { onCall: value => value } }), https: { HttpsError } }
  const firestore = Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'fictional-clock' } })
  const admin = { apps: [{}], firestore, initializeApp() { throw Error('FORBIDDEN_INIT') } }
  const module = { exports: {} }
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, URL, URLSearchParams,
    require(name) {
      if (name === 'firebase-admin') return admin
      if (name === 'firebase-functions/v1') return functions
      throw Error('UNEXPECTED_MODULE ' + name)
    },
  }, { filename: 'original-lifeMovie-compiled.js' })
  const data = { movieId: 'fictional-movie', status,
    chapters: [{ id: 'fictional-chapter', memoryId: 'fictional-memory', order: 0 }] }
  return { records, stats, save: () => module.exports.upsertLifeMovieManifest(data, { auth: { uid } }) }
}

const denied = async f => {
  await assert.rejects(f.save(), error => error?.code === 'failed-precondition')
  assert.equal(f.stats.writes.length, 0)
  assert.equal(f.stats.audits.length, 0)
}

test('approved owner and current SceneTruth succeed within one transaction', async () => {
  const f = fixture(), result = await f.save()
  assert.equal(result.chapterCount, 1)
  assert.equal(result.status, 'ready')
  assert.equal(f.records.get(moviePath)?.consentState, 'authorized')
  assert.ok(f.stats.transactionReads.includes(memoryPath))
  assert.ok(f.stats.transactionReads.includes(scenePath))
  assert.equal(f.stats.outsideReads, 0)
  assert.equal(f.stats.audits.length, 1)
})
for (const state of [undefined, null, 'pending', 'revoked', 'denied', 'unreviewed']) {
  test('missing or non-authorized consent is denied: ' + String(state), async () => {
    const f = fixture()
    f.records.get(memoryPath).consentState = state
    await denied(f)
  })
}
test('revocation between old read and manifest transaction denies any write', async () => {
  await denied(fixture({ beforeTransaction: records => { records.get(memoryPath).consentState = 'revoked' } }))
})
test('SceneTruth withdrawal before transaction denies any ready movie', async () => {
  await denied(fixture({ beforeTransaction: records => { records.get(scenePath).state = 'revoked' } }))
})
test('foreign memory owner is rejected', async () => {
  const f = fixture()
  f.records.get(memoryPath).ownerId = 'foreign-user'
  await denied(f)
})
test('drafts remain private and need transactional owner and consent', async () => {
  const f = fixture({ status: 'draft' }), result = await f.save()
  assert.equal(result.status, 'draft')
  assert.ok(f.stats.transactionReads.includes(memoryPath))
  assert.equal(f.stats.transactionReads.includes(scenePath), false)
})
