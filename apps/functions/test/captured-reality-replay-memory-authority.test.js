'use strict'
const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { createHash } = require('node:crypto')
const { createRequire } = require('node:module')
const uid = 'fictional-captured-owner', memoryId = 'fictional-captured-memory', assetId = 'crp_fictional_001'
const sha = value => createHash('sha256').update(value).digest('hex')
const memoryPath = `users/${uid}/memories/${memoryId}`, policyPath = `users/${uid}/privacyPolicy/current`
class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
class Timestamp { constructor(value) { this.value = value } toMillis() { return this.value } }

// Fictional SDK rows exercise the actual strict-compiled authority code. They
// are not real approvals, capture receipts, source bytes or family-world proof.
function fixture() {
  const documents = new Map(), reads = [], consents = ['memory.storage', 'location.context'].map(purpose => ({ purpose,
    policyVersion: 'fictional-v1', decisionReceiptId: `fictional-${purpose}` }))
  const source = { sourceReceiptRef: 'psr_fictional_capture_000001', sourceRevision: 1, sourceSha256: 'a'.repeat(64),
    sourceByteLength: 1234, sourceFixityRef: 'private:fictional/fixity', sourceConsentSha256: sha(JSON.stringify(consents)) }
  const domain = { mode: 'granted', retentionDays: 365, precise: false, replayVisible: true, lifeMapVisible: true,
    modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
  const policy = { version: 2, revision: 1, ownerId: uid,
    domains: Object.fromEntries(['memory', 'location', 'models', 'exports', 'workforce', 'identity'].map(key => [key, { ...domain }])),
    enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } }
  const asset = { ownerId: uid, state: 'ready', reviewState: 'accepted', releaseState: 'private-pilot', truthClass: 'spatially-reconstructable',
    browserCertified: true, mobileCertified: true, anchorEntityId: 'fictional-place', truthLabel: 'Fictional authority fixture', storageBucket: 'fictional-private-bucket',
    runtimeObject: `private-captured-reality/${uid}/${assetId}/runtime/${'b'.repeat(64)}.splat`, runtimeSha256: 'b'.repeat(64), runtimeBytes: 32,
    reviewApprovedRuntimeSha256: 'b'.repeat(64), reviewApprovedStorageGeneration: '123', sourceManifestSha256: 'c'.repeat(64),
    reviewApprovedSourceManifestSha256: 'c'.repeat(64), sourceBindings: [source] }
  documents.set(`users/${uid}`, { accountStatus: 'active' }); documents.set(policyPath, policy)
  documents.set(`users/${uid}/privacyRuntime/location-collection`, { enabled: true })
  documents.set(memoryPath, { ownerId: uid, privacy: 'private', title: 'Fictional memory', sourceMedia: [] })
  const bindingPath = `users/${uid}/capturedRealityReplayBindings/${memoryId}`
  documents.set(bindingPath, { ownerId: uid, memoryId, state: 'accepted', capturedRealityAssetId: assetId, placeEntityId: 'fictional-place' })
  documents.set(`users/${uid}/capturedRealityAssets/${assetId}`, asset)
  documents.set(`uraiPrivateSourceReceipts/${sha(source.sourceReceiptRef)}`, { ...source, schemaVersion: 'urai-private-source-receipt-v2',
    ownerUid: uid, status: 'ACTIVE', synthetic: false, purposes: ['reconstruct-place'], consents })
  const clone = value => value instanceof Timestamp ? new Timestamp(value.value) : Array.isArray(value) ? value.map(clone)
    : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, child]) => [key, clone(child)])) : value
  let afterRead, afterAuth, disabled = false, revoked = false, currentUid = uid, creationTime = '2026-10-01T00:00:00.000Z', authCount = 0
  const snap = (location, view = documents) => { const value = clone(view.get(location)); return { exists: value !== undefined,
    id: location.split('/').at(-1), ref: ref(location), data: () => clone(value), get: key => key.split('.').reduce((parent, part) => parent?.[part], value), updateTime: new Timestamp(1) } }
  const ref = location => ({ path: location, get: async () => { reads.push(location); const value = snap(location); await afterRead?.(location); return value } })
  const db = { doc: ref, runTransaction: async callback => {
    const view = new Map([...documents].map(([key, value]) => [key, clone(value)]))
    return callback({ get: async target => { reads.push(target.path); const value = snap(target.path, view); await afterRead?.(target.path); return value },
      create: (target, value) => { assert.ok(!documents.has(target.path)); documents.set(target.path, clone(value)) } })
  } }
  const admin = { apps: ['fictional'], firestore: Object.assign(() => db, { Timestamp, FieldValue: { serverTimestamp: () => new Timestamp(Date.now()) } }),
    auth: () => ({ verifyIdToken: async (bearer, checkRevoked) => { assert.equal(checkRevoked, true); authCount++; await afterAuth?.(authCount)
      if (revoked || bearer !== 'fictional-token') throw new Error('fictional revoked token'); return { uid: currentUid, exp: Math.floor(Date.now() / 1000) + 3600 } },
    getUser: async requestedUid => ({ uid: requestedUid === currentUid ? uid : currentUid, disabled, metadata: { creationTime } }) }),
    storage: () => ({ bucket: () => ({ getMetadata: async () => [{ iamConfiguration: { uniformBucketLevelAccess: { enabled: true }, publicAccessPrevention: 'enforced' } }],
      file: () => ({ getMetadata: async () => [{ generation: '123', size: '32', contentType: 'application/octet-stream', metadata: { uraiRuntimeSha256: 'b'.repeat(64) } }] }) }) }) }
  const region = { https: { onCall: fn => fn, onRequest: fn => fn }, runWith: () => region }
  const filename = process.env.URAI_CAPTURED_MEMORY_COMPILED_MODULE || path.resolve(__dirname, '../lib/apps/functions/src/capturedReality.js')
  const nativeRequire = createRequire(filename), result = { exports: {} }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { module: result, exports: result.exports, Buffer, URL, URLSearchParams, Date, console,
    process: { env: { URAI_ENABLE_CAPTURED_REALITY: 'true', FIREBASE_STORAGE_BUCKET: 'fictional-private-bucket', GCLOUD_PROJECT: 'urai-4dc1d' } },
    require: name => name === 'firebase-admin' ? admin : name === 'firebase-functions/v1' ? { https: { HttpsError }, region: () => region } : nativeRequire(name) }, { filename })
  const context = { auth: { uid }, rawRequest: { get: name => name === 'authorization' ? 'Bearer fictional-token' : undefined } }
  return { documents, policy, asset, bindingPath, reads, context, handlers: result.exports,
    entry: () => result.exports.getCapturedRealityReplayEntry({ memoryId, deviceTier: 'desktop' }, context),
    standalone: () => result.exports.getCapturedRealityRuntimeUrl({ assetId, deviceTier: 'desktop', accessMode: 'runtime' }, context),
    afterRead: fn => { afterRead = fn }, afterAuth: fn => { afterAuth = fn }, disable: () => { disabled = true }, revoke: () => { revoked = true },
    recreate: () => { creationTime = '2026-10-09T00:00:00.000Z' }, foreign: () => { currentUid = 'fictional-other-owner' } }
}
async function assertUnavailable(work) {
  let result
  try { result = await work() } catch (error) { assert.ok(error instanceof HttpsError, 'a loader or SDK fixture error is not privacy denial');
    assert.ok(['permission-denied', 'failed-precondition', 'unauthenticated', 'not-found'].includes(error.code)); return }
  assert.equal(result.available, false, 'an accepted place binding cannot authorize an unavailable Replay memory')
  assert.equal(result.assetId, undefined)
}

test('valid current owner memory and visible Replay policy retain the accepted private entry', async () => {
  const f = fixture(), result = await f.entry(); assert.equal(result.available, true); assert.equal(result.assetId, assetId)
  assert.doesNotMatch(JSON.stringify(result), /private-captured-reality|storageBucket|sourceReceiptRef|fictional-place/)
})
for (const [label, mutate] of [
  ['missing selected memory', f => f.documents.delete(memoryPath)], ['deleted selected memory', f => { f.documents.get(memoryPath).deleted = true }],
  ['hidden selected memory', f => { f.documents.get(memoryPath).privacy = 'hidden' }],
  ['foreign selected memory', f => { f.documents.get(memoryPath).ownerId = 'fictional-other-owner' }],
  ['revoked selected memory consent', f => { f.documents.get(memoryPath).consentState = 'revoked' }],
  ['pending selected memory consent', f => { f.documents.get(memoryPath).consentState = 'pending' }],
  ['Replay visibility disabled', f => { f.policy.domains.memory.replayVisible = false }],
]) test(label + ' denies the existing accepted place binding', async () => { const f = fixture(); mutate(f); await assertUnavailable(f.entry) })

for (const [label, mutate] of [
  ['memory deletion', f => { f.documents.get(memoryPath).deleted = true }], ['hidden memory', f => { f.documents.get(memoryPath).privacy = 'hidden' }],
  ['Replay withdrawal', f => { f.policy.domains.memory.replayVisible = false }],
]) test(label + ' during binding read cannot return a stale Replay entry', async () => {
  const f = fixture(); let changed = false
  f.afterRead(location => { if (!changed && location === f.bindingPath) { changed = true; mutate(f) } })
  await assertUnavailable(f.entry); assert.equal(changed, true)
})
test('Replay memory withdrawal during final authentication await is coherently re-read before admission', async () => {
  const f = fixture(); let changed = false
  f.afterAuth(count => { if (count > 1) { changed = true; f.policy.domains.memory.replayVisible = false } })
  await assertUnavailable(f.entry); assert.equal(changed, true)
})
test('place anchor changed during final authentication cannot admit a stale memory-to-place relationship', async () => {
  const f = fixture(); let changed = false
  f.afterAuth(count => { if (count > 1) { changed = true; f.asset.anchorEntityId = 'fictional-other-place' } })
  await assertUnavailable(f.entry); assert.equal(changed, true)
})
for (const [label, mutate] of [['revoked token', f => f.revoke()], ['disabled account', f => f.disable()], ['foreign current actor', f => f.foreign()]]) {
  test(label + ' cannot resolve the Replay entry', async () => { const f = fixture(); mutate(f); await assertUnavailable(f.entry) })
}
test('standalone captured place remains available when no Replay memory is selected', async () => {
  const f = fixture(); f.documents.delete(memoryPath); f.policy.domains.memory.replayVisible = false
  const result = await f.standalone(); assert.equal(result.requiresAuthorization, true); assert.equal(result.assetId, assetId)
})
