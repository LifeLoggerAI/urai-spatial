import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
const nativeRequire = createRequire(import.meta.url)
const sha = value => createHash('sha256').update(value).digest('hex')
const consentSource = fs.readFileSync(new URL('../../apps/functions/src/consentPolicyAuthority.ts', import.meta.url), 'utf8')
const consentExports = {}
vm.runInNewContext(ts.transpileModule(consentSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { exports: consentExports })

const source = fs.readFileSync(new URL('../../apps/functions/src/capturedReality.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText

function callable({ place = 'place-1', anchor = 'place-1', missingAnchors = false, bindingOwner = 'owner', assetOwner = 'owner', release = true, consent = true } = {}) {
  const domain = { mode: 'granted', retentionDays: null, precise: false, replayVisible: false, lifeMapVisible: false, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false }
  const sourceBinding = { sourceReceiptRef: 'psr_synthetic_capture_000001', sourceRevision: 1, sourceSha256: 'a'.repeat(64), sourceByteLength: 1234, sourceFixityRef: 'private:synthetic/fixity', sourceConsentSha256: sha(JSON.stringify(['memory.storage','location.context'].map(purpose => ({ purpose, policyVersion: 'synthetic-v1', decisionReceiptId: 'synthetic-' + purpose })))) }
  const documents = {
    'users/owner': { accountStatus: 'active' },
    ['uraiPrivateSourceReceipts/' + sha(sourceBinding.sourceReceiptRef)]: { ...sourceBinding, ownerUid: 'owner', schemaVersion: 'urai-private-source-receipt-v2', status: 'ACTIVE', synthetic: false, purposes: ['reconstruct-place'], consents: ['memory.storage','location.context'].map(purpose => ({ purpose, policyVersion: 'synthetic-v1', decisionReceiptId: 'synthetic-' + purpose })) },
    'users/owner/privacyPolicy/current': { version: 2, revision: 1, ownerId: 'owner', domains: Object.fromEntries(['memory','location','models','exports','workforce','identity'].map(key => [key, { ...domain, mode: key === 'memory' && !consent ? 'denied' : 'granted' }])), enforcement: { state: 'fully-enforced', jobId: null, affectedTargets: [], providerState: 'not-applicable' } },
    'users/owner/privacyRuntime/location-collection': { enabled: true },
    'users/owner/capturedRealityReplayBindings/memory-1': {
      ownerId: bindingOwner, memoryId: 'memory-1', state: 'accepted', capturedRealityAssetId: 'asset-1', placeEntityId: place,
    },
    'users/owner/capturedRealityAssets/asset-1': {
      ownerId: assetOwner, state: 'ready', reviewState: 'accepted', truthClass: 'spatially-reconstructable',
      anchorEntityId: anchor, releaseState: 'private-pilot', browserCertified: true, mobileCertified: true,
      truthLabel: 'Reconstruction from recorded evidence',
      storageBucket: 'synthetic-private-bucket', runtimeObject: 'private-captured-reality/owner/asset-1/runtime/' + 'b'.repeat(64) + '.splat', runtimeSha256: 'b'.repeat(64), runtimeBytes: 32, reviewApprovedRuntimeSha256: 'b'.repeat(64), reviewApprovedStorageGeneration: '123', sourceBindings: [sourceBinding], sourceManifestSha256: 'c'.repeat(64), reviewApprovedSourceManifestSha256: 'c'.repeat(64),
    },
  }
  if (missingAnchors) {
    delete documents['users/owner/capturedRealityReplayBindings/memory-1'].placeEntityId
    delete documents['users/owner/capturedRealityAssets/asset-1'].anchorEntityId
  }
  const snapshot = path => ({ exists: Boolean(documents[path]), data: () => documents[path], get: key => key.split('.').reduce((value, part) => value?.[part], documents[path]), updateTime: { toMillis: () => 1 } })
  const db = { doc: path => ({ path, get: async () => snapshot(path) }), runTransaction: callback => callback({ get: async ref => snapshot(ref.path) }) }
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code } }
  const https = { onCall: handler => handler, onRequest: handler => handler, HttpsError }
  const region = { https, runWith: () => region }
  const modules = {
    'firebase-functions/v1': {
      https,
      region: regionName => {
        assert.equal(regionName, 'us-central1')
        return region
      },
    },
    'firebase-admin': { apps: [{}], firestore: () => db, auth: () => ({ verifyIdToken: async () => ({ uid: 'owner', exp: Math.floor(Date.now()/1000) + 3600 }), getUser: async () => ({ uid: 'owner', disabled: false, metadata: { creationTime: 'synthetic-created' } }) }) },
    './consentPolicyAuthority': consentExports,
    'node:crypto': nativeRequire('node:crypto'),
    'node:stream/promises': nativeRequire('node:stream/promises'),
  }
  const context = { exports: {}, process: { env: { URAI_ENABLE_CAPTURED_REALITY: String(release), FIREBASE_STORAGE_BUCKET: 'synthetic-private-bucket' } }, require: name => {
    assert.ok(modules[name], `unexpected dependency ${name}`)
    return modules[name]
  } }
  vm.runInNewContext(compiled, context)
  return tier => context.exports.getCapturedRealityReplayEntry({ memoryId: 'memory-1', deviceTier: tier ?? 'desktop' }, { auth: { uid: 'owner' }, rawRequest: { get: () => 'Bearer synthetic-token' } })
}

test('Replay callable rejects missing, blank and non-string place anchors even when both fields match', async () => {
  for (const value of [null, '', ' ', '\n\t', 12, false]) {
    assert.equal((await callable({ place: value, anchor: value })()).available, false, String(value))
  }
  assert.equal((await callable({ missingAnchors: true })()).available, false)
  assert.equal((await callable({ place: 'place-1', anchor: null })()).available, false)
})

test('Replay callable requires the exact same valid place and retains valid desktop/mobile entries', async () => {
  assert.equal((await callable({ place: 'place-1', anchor: 'place-2' })()).available, false)
  for (const tier of ['desktop', 'mobile']) {
    const result = await callable()(tier)
    assert.equal(result.available, true)
    assert.equal(result.assetId, 'asset-1')
    assert.equal(result.truthLabel, 'Reconstruction from recorded evidence')
    assert.equal('placeEntityId' in result, false)
  }
  for (const id of ['place:family/home', 'place-1', 'place_α', 'x'.repeat(129)]) {
    assert.equal((await callable({ place: id, anchor: id })()).available, true, id)
  }
})

test('Replay callable keeps owner, release and consent gates while validating bindings', async () => {
  assert.equal((await callable({ bindingOwner: 'other' })()).available, false)
  assert.equal((await callable({ assetOwner: 'other' })()).available, false)
  assert.equal((await callable({ release: false })()).available, false)
  await assert.rejects(callable({ consent: false })(), error => error.code === 'permission-denied')
})
