'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const { test } = require('node:test')

const moduleRoot = process.env.CONSENT_ADMISSION_COMPILED_DIR || path.resolve(__dirname, '../lib/apps/functions/src')
const candidateRoot = path.resolve(__dirname, '../lib/apps/functions/src')
const policyAuthority = require(path.join(candidateRoot, 'consentPolicyAuthority.js'))
const exportTest = path.join(__dirname, 'privacy-export-download.test.js')
const source = fs.readFileSync(exportTest, 'utf8')
const prefixEnd = source.indexOf("test('completed owner descriptor")
const mediaStart = source.indexOf('const fictionalPng =')
const mediaEnd = source.indexOf("test('actual compiled producer registers")
assert.ok(prefixEnd > 0 && mediaStart > prefixEnd && mediaEnd > mediaStart)
// This existing DAO fixture uses name ordering; Passport's unrelated receipt
// list also orders by createdAt. Admit that actual SDK method shape only in
// this isolated copy. No application check or retained assertion is changed.
const prefix = source.slice(0, prefixEnd).replace("assert.equal(field,'__name__');return collection",
  "assert.ok(['__name__','createdAt'].includes(field));return collection")
const fixtureModule = { exports: {} }
vm.runInNewContext(prefix + '\n' + source.slice(mediaStart, mediaEnd)
  + '\nmodule.exports={fixture,mediaFixture,uid,policyPath};', {
  require: createRequire(exportTest), module: fixtureModule, exports: fixtureModule.exports, __dirname,
  process: { env: { ...process.env, URAI_EXPORT_COMPILED_MODULE: path.join(moduleRoot, 'privacyOperations.js') } },
  Buffer, URL, URLSearchParams, console,
}, { filename: 'actual-controlled-export-media-fixtures.js' })
const { uid, policyPath } = fixtureModule.exports
const providers = ['anthropic', 'gemini', 'xai', 'mistral']
const councilCode = fs.readFileSync(path.join(moduleRoot, 'councilProviderFunctions.js'), 'utf8')
const clone = value => JSON.parse(JSON.stringify(value))

function councilFixture(f, provider = 'anthropic') {
  const stats = { auth: 0, paid: 0, initialized: 0, secretReads: 0, rateWrites: 0, telemetry: [] }
  const db = {
    doc: location => ({
      get: async () => ({ exists: f.records.has(location), data: () => f.records.get(location) }),
      set: async value => {
        assert.match(location, /\/providerTelemetry\/council-/)
        assert.equal(['prompt', 'message', 'context', 'response'].some(key => Object.hasOwn(value, key)), false)
        stats.telemetry.push({ location, value })
      },
    }),
    runTransaction: async () => { stats.rateWrites++; throw Error('NO RATE-LIMIT MUTATION EXPECTED') },
  }
  const firestore = Object.assign(() => db, { FieldValue: { increment: n => n, serverTimestamp: () => 'synthetic-clock' } })
  const admin = {
    apps: [{}], initializeApp() { stats.initialized++; throw Error('NO SDK INITIALIZATION') }, firestore,
    auth: () => ({ verifyIdToken: async (token, revoked) => {
      stats.auth++; assert.equal(token, 'synthetic-token'); assert.equal(revoked, true); return { uid }
    } }),
  }
  const exports = {}
  vm.runInNewContext(councilCode + '\nexports.testAdmission = requireProviderConsent;', {
    exports, Buffer, console, setTimeout, clearTimeout, AbortController,
    process: { env: Object.fromEntries(providers.map(p => ['URAI_COUNCIL_' + p.toUpperCase() + '_ENABLED', 'true'])) },
    require(name) {
      if (name === 'node:crypto') return crypto
      if (name === 'firebase-admin') return admin
      if (name === './consentPolicyAuthority') return policyAuthority
      if (name === 'firebase-functions/params') return { defineSecret: () => ({
        value() { stats.secretReads++; throw Error('NO CREDENTIAL READ EXPECTED') },
      }) }
      if (name === 'firebase-functions/v2/https') return { onRequest: (_options, handler) => handler }
      if (name === './protectedProviderSpend') return {
        paidSpatialFetch() { stats.paid++; throw Error('NO PAID/PROVIDER ACTION') },
        SpatialSpendError: class extends Error {}, SPATIAL_SPEND_WORKER_TOKENS_JSON: {},
      }
      throw Error('Unexpected controlled Council dependency: ' + name)
    },
  }, { filename: 'actual-strict-compiled-council.js' })
  return {
    exports, stats,
    async invoke() {
      const response = { statusCode: 200, body: null, headersSent: false,
        status(code) { this.statusCode = code; return this }, json(value) { this.body = value; return this },
        setHeader() { throw Error('NO SUCCESS PUBLICATION EXPECTED') }, on() {}, end() {},
      }
      await exports[provider === 'xai' ? 'xaiCouncilProvider' : provider + 'CouncilProvider']({
        method: 'POST', headers: { authorization: 'Bearer synthetic-token' },
        body: { message: 'Synthetic public test request.', context: [], aiProcessingConsent: true, requestId: 'a'.repeat(64) },
      }, response)
      return response
    },
  }
}
function canonical(f) {
  const policy = f.records.get(policyPath)
  policy.domains.models.modelContext = true
  return policy
}
const malformed = [
  ['missing-policy', (f, p) => f.records.delete(policyPath)],
  ['null-policy', (f, p) => f.records.set(policyPath, null)],
  ['array-policy', (f, p) => f.records.set(policyPath, [])],
  ['partial-grant-only', (f, p) => f.records.set(policyPath, { version: 2, revision: 4, ownerId: uid,
    domains: { memory: { mode: 'granted' }, models: { mode: 'granted', modelContext: true } }, enforcement: { state: 'fully-enforced' } })],
  ['foreign-owner', (f, p) => { p.ownerId = 'foreign-owner' }],
  ['missing-owner', (f, p) => { delete p.ownerId }],
  ['old-schema', (f, p) => { p.version = 1 }],
  ['missing-revision', (f, p) => { delete p.revision }],
  ['string-revision', (f, p) => { p.revision = '4' }],
  ['fractional-revision', (f, p) => { p.revision = 4.5 }],
  ['unsafe-revision', (f, p) => { p.revision = Number.MAX_SAFE_INTEGER + 1 }],
  ['missing-other-domain', (f, p) => { delete p.domains.location }],
  ['unknown-domain', (f, p) => { p.domains.extra = clone(p.domains.memory) }],
  ['missing-permission', (f, p) => { delete p.domains.memory.replayVisible }],
  ['string-permission', (f, p) => { p.domains.memory.modelContext = 'false' }],
  ['string-retention', (f, p) => { p.domains.memory.retentionDays = '365' }],
  ['unknown-mode', (f, p) => { p.domains.identity.mode = 'approved' }],
  ['missing-enforcement-job', (f, p) => { delete p.enforcement.jobId }],
  ['missing-enforcement-targets', (f, p) => { delete p.enforcement.affectedTargets }],
  ['missing-enforcement-provider-state', (f, p) => { delete p.enforcement.providerState }],
  ['unknown-enforcement-provider-state', (f, p) => { p.enforcement.providerState = 'approved' }],
  ['duplicate-targets', (f, p) => { p.enforcement.affectedTargets = ['same-target', 'same-target'] }],
  ['non-string-target', (f, p) => { p.enforcement.affectedTargets = [42] }],
  ['unknown-top-level-authority', (f, p) => { p.approved = true }],
  ['unknown-permission', (f, p) => { p.domains.memory.autoGrant = true }],
]
for (const [name, mutate] of malformed) test('malformed or foreign policy rejects media and AI admission: ' + name, async () => {
  const f = fixtureModule.exports.mediaFixture(), p = canonical(f)
  mutate(f, p)
  const before = JSON.stringify([...f.records])
  const passport = await f.handlers.getPassportSnapshot({}, f.context)
  assert.equal(passport.consent.domains.memory.mode, 'denied')
  assert.equal(passport.consent.domains.models.mode, 'denied')
  assert.equal(passport.consent.enforcement.state, 'pending')
  await assert.rejects(f.media.getMemoryMediaUploadAuthority({ memoryId: 'synthetic-memory' }, f.context))
  await assert.rejects(f.upload())
  assert.equal(JSON.stringify([...f.records]), before, 'no source, media receipt, grant or policy mutation')
  assert.equal(f.stats.storageWrites.length, 0)
  assert.equal(f.stats.streams, 0)
  for (const provider of providers) {
    const council = councilFixture(f, provider)
    await assert.rejects(council.exports.testAdmission(uid, provider, true))
    const response = await council.invoke()
    assert.equal(response.statusCode, 403)
    assert.equal(response.body.error, 'CONSENT_POLICY_REQUIRED')
    assert.equal(council.stats.paid, 0)
    assert.equal(council.stats.rateWrites, 0)
    assert.equal(council.stats.secretReads, 0)
    assert.equal(council.stats.initialized, 0)
    assert.equal(council.stats.auth, 1)
    // Existing aggregate failure telemetry is retained and contains no prompt or
    // output. It is not an authorization, source-content or provider operation.
    assert.equal(council.stats.telemetry.length, 1)
  }
})

test('canonical valid stored policy keeps actual media upload and all four AI grants', async () => {
  const f = fixtureModule.exports.mediaFixture(), policy = canonical(f)
  const passport = await f.handlers.getPassportSnapshot({}, f.context)
  assert.equal(passport.consent.domains.memory.mode, 'granted')
  assert.equal(passport.consent.enforcement.state, 'fully-enforced')
  assert.equal(policyAuthority.isCanonicalStoredPolicy(policy, uid), true)
  const authority = await f.media.getMemoryMediaUploadAuthority({ memoryId: 'synthetic-memory' }, f.context)
  assert.equal(authority.ownerId, uid)
  const result = await f.upload()
  assert.equal(result.state, 'ready')
  assert.equal(f.stats.storageWrites.length, 1)
  for (const provider of providers) {
    const council = councilFixture(f, provider)
    await council.exports.testAdmission(uid, provider, true)
    assert.equal(council.stats.paid, 0, 'admission-only positive never performs a provider action')
  }
})
for (const reason of ['memory-denied', 'c1-revoked', 'c1-foreign-owner', 'memory-foreign-owner', 'enforcement-pending']) {
  test('existing media authority remains denied: ' + reason, async () => {
    const f = fixtureModule.exports.mediaFixture(), p = canonical(f)
    if (reason === 'memory-denied') p.domains.memory.mode = 'denied'
    if (reason === 'c1-revoked') f.records.get('consentRecords/' + uid + '_memory_storage').status = 'revoked'
    if (reason === 'c1-foreign-owner') f.records.get('consentRecords/' + uid + '_memory_storage').uid = 'foreign-owner'
    if (reason === 'memory-foreign-owner') f.records.get('users/' + uid + '/memories/synthetic-memory').ownerId = 'foreign-owner'
    if (reason === 'enforcement-pending') p.enforcement.state = 'pending'
    await assert.rejects(f.upload())
    assert.equal(f.stats.storageWrites.length, 0)
  })
}
for (const reason of ['models-denied', 'model-context-denied', 'enforcement-pending', 'explicit-consent-false', 'provider-revoked', 'provider-processing-denied']) {
  test('existing AI authority remains denied: ' + reason, async () => {
    const f = fixtureModule.exports.mediaFixture(), p = canonical(f)
    if (reason === 'models-denied') p.domains.models.mode = 'denied'
    if (reason === 'model-context-denied') p.domains.models.modelContext = false
    if (reason === 'enforcement-pending') p.enforcement.state = 'pending'
    for (const provider of providers) {
      if (reason === 'provider-revoked' || reason === 'provider-processing-denied') f.records.set('users/' + uid + '/providerConnections/' + provider, {
        processingAllowed: reason !== 'provider-processing-denied', revocationState: reason === 'provider-revoked' ? 'pending' : 'not-required',
      })
      const council = councilFixture(f, provider)
      await assert.rejects(council.exports.testAdmission(uid, provider, reason !== 'explicit-consent-false'))
      assert.equal(council.stats.paid, 0)
    }
  })
}
test('validation itself invokes no accessor or coercion and rejects inherited authority', () => {
  const f = fixtureModule.exports.mediaFixture(), policy = canonical(f)
  assert.equal(policyAuthority.isCanonicalStoredPolicy(Object.create(policy), uid), false)
  let calls = 0
  const accessor = clone(policy)
  Object.defineProperty(accessor, 'revision', { enumerable: true, get() { calls++; return 4 } })
  assert.equal(policyAuthority.isCanonicalStoredPolicy(accessor, uid), false)
  const coercion = clone(policy)
  coercion.domains.memory.retentionDays = { valueOf() { calls++; return 365 } }
  assert.equal(policyAuthority.isCanonicalStoredPolicy(coercion, uid), false)
  assert.equal(calls, 0)
})
test('canonical zero revision and provider absence preserve existing AI policy semantics', async () => {
  const f = fixtureModule.exports.mediaFixture(), p = canonical(f)
  p.revision = 0
  assert.equal(policyAuthority.isCanonicalStoredPolicy(p, uid), true)
  for (const provider of providers) {
    f.records.delete('users/' + uid + '/providerConnections/' + provider)
    await councilFixture(f, provider).exports.testAdmission(uid, provider, true)
  }
  await assert.rejects(f.upload(), 'the existing media positive-revision requirement remains')
  assert.equal(f.stats.storageWrites.length, 0)
})
test('export and deletion rights remain distinct from memory/model/identity collection grants', async () => {
  const exported = fixtureModule.exports.fixture()
  for (const domain of ['memory', 'models', 'identity']) {
    exported.records.get(policyPath).domains[domain].mode = 'denied'
    exported.records.get(policyPath).domains[domain].modelContext = false
  }
  const descriptor = await exported.descriptor()
  assert.equal(descriptor.requiresAuthorization, true)
  assert.equal(descriptor.ownerId, uid)
  assert.equal(descriptor.schemaVersion, 'urai-spatial-export-download-v1')
  assert.equal(new URL(descriptor.url).origin, 'https://us-central1-urai-4dc1d.cloudfunctions.net')
  assert.equal(new URL(descriptor.url).pathname, '/downloadOperationalExportPackage')
  assert.equal(exported.records.get('users/' + uid + '/exportJobs/synthetic-export-job').state, 'ready')
  const deletion = fixtureModule.exports.fixture()
  for (const domain of Object.values(deletion.records.get(policyPath).domains)) {
    domain.mode = 'denied'; domain.modelContext = false
  }
  const request = await deletion.handlers.createDeletionRequest({
    operationId: 'synthetic-owner-rights-delete', scope: 'memories', confirmation: 'CONFIRM DELETE',
  }, deletion.context)
  assert.equal(request.state, 'queued')
  assert.equal(deletion.stats.storageWrites.length, 0)
  assert.equal(deletion.stats.deleted.length, 0, 'only a synthetic request is created; no deletion worker executes')
})
