const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const uid = 'synthetic-memory-owner', now = 1800000000000
const root = `users/${uid}`, grantPath = `consentRecords/${uid}_memory_storage`, policyPath = `${root}/privacyPolicy/current`
function fixture(options = {}) {
  const records = new Map([
    [root, { uid }], [grantPath, { uid, purpose: 'memory.storage', consentTier: 'C1', policyVersion: '1.0.0', status: 'granted', receiptHash: 'a'.repeat(64), expiresAt: { toMillis: () => now + 60000 } }],
    [policyPath, { version: 2, revision: 1, ownerId: uid, domains: { memory: { mode: 'granted' } }, enforcement: { state: 'fully-enforced' } }],
    [`${root}/memories/memory-one`, { ownerId: uid, consentState: 'authorized', deleted: false, truthClass: 'RECORDED_SOURCE_TRUTH' }],
  ])
  const writes = [], reads = []
  const snapshot = ref => { const fingerprint = JSON.stringify(records.get(ref.path)); return ({ updateTime: { fingerprint, isEqual: other => other.fingerprint === fingerprint }, ref, id: ref.path.split('/').at(-1), exists: records.has(ref.path), get: key => key.split('.').reduce((v, k) => v?.[k], records.get(ref.path)) }) }
  const doc = location => ({ path: location, id: location.split('/').at(-1), parent: { parent: { id: uid } }, get: async () => { reads.push(location); await options.onRead?.(location, records); return snapshot(doc(location)) } })
  const db = { doc, getAll: (...refs) => Promise.all(refs.map(ref => ref.get())), collection: location => ({ add: async data => { writes.push([location, data]) } }),
    runTransaction: async callback => {
      await options.beforeTransaction?.(records)
      const pending = []
      const tx = { get: ref => ref.get(), getAll: (...refs) => Promise.all(refs.map(ref => ref.get())), set: (ref, data) => pending.push([ref.path, data]) }
      await callback(tx)
      for (const [key, value] of pending) { records.set(key, value); writes.push([key, value]) }
    } }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const functions = { region: () => functions, https: { HttpsError, onCall: f => f } }
  const admin = { apps: [{}], firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => now } }), auth: () => ({ getUser: async () => options.user ?? { uid, disabled: false, tokensValidAfterTime: new Date(now - 60000).toISOString() } }) }
  const cache = {}
  function load(name) {
    if (cache[name]) return cache[name]
    const module = { exports: {} }
    vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, `../lib/apps/functions/src/${name}.js`), 'utf8'), {
      module, exports: module.exports, URL, Date: class extends Date { static now() { return now } },
      require: id => id === 'firebase-functions/v1' ? functions : id === 'firebase-admin' ? admin : id === 'node:crypto' ? require('node:crypto') : id === './memoryDomainConsentGuard' ? load('memoryDomainConsentGuard') : (() => { throw Error(`unexpected dependency ${id}`) })(),
    })
    return cache[name] = module.exports
  }
  const context = { auth: { uid, token: { auth_time: (now - 1000) / 1000 } } }
  return { records, writes, reads, context, db, replay: () => load('lifeModelFunctions').getReplayLifeModelAuthority({ memoryId: 'memory-one' }, context), guard: () => load('memoryDomainConsentGuard').requireMemoryDomainProcessingConsent(db, uid, context), movie: () => load('lifeMovie').upsertLifeMovieManifest({ movieId: 'movie-one', status: 'draft', chapters: [{ id: 'chapter-one', memoryId: 'memory-one', order: 0 }] }, context) }
}
for (const mode of ['granted', 'limited']) test(`valid canonical storage and operational ${mode} authority admits draft`, async () => {
  const f = fixture(); f.records.get(policyPath).domains.memory.mode = mode
  await f.movie()
  assert.equal(f.records.get(`${root}/lifeMovies/movie-one`).ownerId, uid)
  assert.equal(f.records.get(`${root}/lifeMovies/movie-one`).chapters.length, 1)
})
for (const [name, mutate] of [
  ['missing root', f => f.records.delete(root)], ['wrong root', f => f.records.set(root, { uid: 'other' })],
  ['account fence', f => f.records.set(`accountDeletionFences/${uid}`, {})], ['canonical tombstone', f => f.records.set(`privacyDeletionTombstones/${uid}`, { active: true })],
  ['missing canonical grant', f => f.records.delete(grantPath)], ['revoked grant', f => f.records.get(grantPath).status = 'revoked'],
  ['wrong grant subject', f => f.records.get(grantPath).uid = 'other'], ['wrong purpose', f => f.records.get(grantPath).purpose = 'life-movie.render'],
  ['wrong tier', f => f.records.get(grantPath).consentTier = 'C7'], ['wrong policy version', f => f.records.get(grantPath).policyVersion = 'other'],
  ['expired grant', f => f.records.get(grantPath).expiresAt = { toMillis: () => now }], ['malformed expiry', f => f.records.get(grantPath).expiresAt = { toMillis: () => { throw Error('malformed') } }],
  ['invalid receipt', f => f.records.get(grantPath).receiptHash = 'bad'], ['pending enforcement', f => f.records.get(policyPath).enforcement.state = 'pending'],
  ['policy owner mismatch', f => f.records.get(policyPath).ownerId = 'other'], ['policy revision malformed', f => f.records.get(policyPath).revision = NaN],
]) test(`processing denies ${name} before private source reads`, async () => {
  const f = fixture(); mutate(f)
  await assert.rejects(f.movie(), { code: 'permission-denied' })
  assert.equal(f.writes.length, 0)
  assert.equal(f.reads.some(key => key.includes('/memories/')), false)
})
for (const [name, mutate] of [
  ['withdrawal', rows => rows.get(grantPath).status = 'revoked'],
  ['grant replacement', rows => rows.get(grantPath).receiptHash = 'b'.repeat(64)],
  ['policy replacement', rows => rows.get(policyPath).revision++],
  ['account fencing', rows => rows.set(`accountDeletionFences/${uid}`, {})],
  ['memory revocation', rows => rows.get(`${root}/memories/memory-one`).consentState = 'revoked'],
]) test(`manifest transaction rejects ${name} after initial admission`, async () => {
  const f = fixture({ beforeTransaction: mutate })
  await assert.rejects(f.movie())
  assert.equal(f.writes.length, 0)
})

function replayFixture(options = {}) {
  const f = fixture(options)
  f.records.get(`${root}/memories/memory-one`).lifeMovie = { sceneTruthPacketId: 'scene-one', personModelBundleIds: [] }
  f.records.set(`${root}/sceneTruthPackets/scene-one`, { ownerId: uid, schemaVersion: 'urai-life-model-v1', state: 'current', syntheticOutputMayBecomeHistoricalSource: false, decision: 'READY', presentationClass: 'recorded' })
  return f
}
test('current canonical authority returns only the existing scene projection', async () => {
  const f = replayFixture(), result = await f.replay()
  assert.equal(result.available, true)
  assert.equal(result.sceneTruthPacketId, 'scene-one')
  assert.equal(f.writes.length, 0)
})
for (const [name, mutate] of [
  ['canonical withdrawal', rows => rows.get(grantPath).status = 'revoked'],
  ['grant replacement', rows => rows.get(grantPath).receiptHash = 'b'.repeat(64)],
  ['account fence', rows => rows.set(`accountDeletionFences/${uid}`, {})],
  ['policy revision replacement', rows => rows.get(policyPath).revision++],
]) test(`Replay authority does not release private projection after ${name} during source reads`, async () => {
  const f = replayFixture({ onRead: (key, rows) => { if (key.endsWith('/sceneTruthPackets/scene-one')) mutate(rows) } })
  await assert.rejects(f.replay(), { code: 'permission-denied' })
  assert.equal(f.writes.length, 0)
})

test('Replay denies revoked selected memory before loading its scene', async () => {
  const f = replayFixture(); f.records.get(`${root}/memories/memory-one`).consentState = 'revoked'
  assert.equal((await f.replay()).available, false)
  assert.equal(f.reads.some(key => key.includes('/sceneTruthPackets/')), false)
})
for (const [name, mutate] of [
  ['selected memory withdrawal', rows => rows.get(`${root}/memories/memory-one`).consentState = 'revoked'],
  ['selected memory source correction', rows => rows.get(`${root}/memories/memory-one`).title = 'corrected'],
  ['scene withdrawal', rows => rows.get(`${root}/sceneTruthPackets/scene-one`).state = 'revoked'],
]) test(`Replay declines mixed source versions after ${name}`, async () => {
  let sceneReads = 0
  const f = replayFixture({ onRead: (key, rows) => {
    // Mutate after the first scene read was captured, when final source reread begins.
    if (key.endsWith('/sceneTruthPackets/scene-one')) sceneReads++
    if (key.endsWith('/memories/memory-one') && sceneReads === 1) mutate(rows)
  } })
  const result = await f.replay()
  assert.equal(result.available, false)
  assert.equal(result.reason, 'MEMORY_SOURCE_CHANGED')
})
