'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const crypto = require('node:crypto')

const source = fs.readFileSync(path.join(__dirname, '../../apps/functions/src/privacyOperations.ts'), 'utf8')
const domains = ['memory', 'location', 'models', 'exports', 'workforce', 'identity']
const uid = 'synthetic-policy-owner'
const policyPath = `users/${uid}/privacyPolicy/current`
const denied = () => ({ mode: 'denied', retentionDays: null, precise: false, replayVisible: false,
  lifeMapVisible: false, modelContext: false, sharingEnabled: false, automationEnabled: false, likenessEnabled: false })
const validPolicy = () => ({ version: 2, revision: 3, ownerId: uid,
  domains: Object.fromEntries(domains.map(domain => [domain, denied()])),
  enforcement: { state: 'fully-enforced', providerState: 'not-applicable', jobId: 'prior-job', affectedTargets: ['privacy-authority'] } })
const context = () => ({ auth: { uid, token: { auth_time: Math.floor(Date.now() / 1000) } } })

function harness(policy) {
  const docs = new Map([[`users/${uid}`, { displayName: 'Synthetic owner' }]])
  if (policy !== undefined) docs.set(policyPath, structuredClone(policy))
  const writes = []
  class Timestamp { toDate() { return new Date(0) } }
  class HttpsError extends Error { constructor(code, message, details) { super(message); this.code = code; this.details = details } }
  const query = key => ({ limit: () => query(key), orderBy: () => query(key),
    doc: id => ref(`${key}/${id}`), get: async () => {
      const rows = [...docs].filter(([item]) => item.startsWith(`${key}/`) && !item.slice(key.length + 1).includes('/'))
        .map(([item, data]) => ({ id: item.split('/').at(-1), get: field => data[field], data: () => data }))
      return { docs: rows, empty: rows.length === 0 }
    } })
  const ref = key => ({ path: key, id: key.split('/').at(-1), collection: name => query(`${key}/${name}`),
    get: async () => ({ exists: docs.has(key), data: () => docs.get(key), get: field => docs.get(key)?.[field] }) })
  const db = {
    doc: ref,
    runTransaction: async callback => {
      const staged = []
      const result = await callback({ get: r => r.get(),
        set: (r, data) => staged.push([r.path, data]), create: (r, data) => staged.push([r.path, data]) })
      for (const [key, data] of staged) { docs.set(key, data); writes.push(key) }
      return result
    },
  }
  const firestore = () => db
  const trigger = handler => handler
  const functions = {
    https: { HttpsError, onCall: handler => ({ run: handler }) },
    auth: { user: () => ({ onDelete: trigger }) },
    firestore: { document: () => ({ onCreate: trigger, onUpdate: trigger, onWrite: trigger }) },
    pubsub: { schedule: () => ({ onRun: trigger }) },
  }
  const admin = { apps: [{}], firestore, auth: () => ({ getUser: async () => ({ uid, disabled: false }) }),
    app: () => ({ options: { projectId: 'demo-urai-policy-unit' } }) }
  const dependencies = { 'firebase-functions/v1': functions, 'firebase-admin': admin,
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => new Timestamp() }, Timestamp }, 'node:crypto': crypto }
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', compiled)(name => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency ${name}`)
    return dependencies[name]
  }, module, module.exports)
  return { api: module.exports, docs, writes }
}

test('missing policy passport denies every domain and reports enforcement pending', async () => {
  const h = harness()
  const result = await h.api.getPassportSnapshot.run({}, context())
  for (const domain of domains) assert.deepEqual(result.consent.domains[domain], denied())
  assert.equal(result.consent.revision, 0)
  assert.equal(result.consent.enforcement.state, 'pending')
  assert.equal(result.consent.enforcement.providerState, 'pending')
  assert.deepEqual(h.writes, [])
})

for (const selected of domains) test(`first explicit ${selected} update grants no unrelated domain`, async () => {
  const h = harness()
  const next = { ...denied(), mode: 'granted', retentionDays: 30, replayVisible: true }
  const result = await h.api.applyConsentPolicy.run({ domain: selected, next,
    expectedRevision: 0, operationId: `bootstrap-${selected}-0001` }, context())
  const saved = h.docs.get(policyPath)
  assert.equal(result.state, 'requested')
  assert.equal(saved.revision, 1)
  assert.equal(saved.enforcement.state, 'pending')
  for (const domain of domains) assert.deepEqual(saved.domains[domain], domain === selected ? next : denied())
  const job = h.docs.get(`privacyEnforcementJobs/${result.jobId}`)
  assert.deepEqual(job.previous, denied())
  assert.equal(job.state, 'requested')
})

const malformed = [
  ['foreign owner', p => { p.ownerId = 'other-owner' }],
  ['missing version', p => { delete p.version }],
  ['wrong version', p => { p.version = 1 }],
  ['string revision', p => { p.revision = '3' }],
  ['negative revision', p => { p.revision = -1 }],
  ['fractional revision', p => { p.revision = 1.5 }],
  ['unsafe revision', p => { p.revision = Number.MAX_SAFE_INTEGER + 1 }],
  ['missing domain', p => { delete p.domains.memory }],
  ['invalid boolean', p => { p.domains.memory.modelContext = 'true' }],
  ['coerced retention', p => { p.domains.memory.retentionDays = '30' }],
  ['missing enforcement', p => { delete p.enforcement }],
  ['unknown enforcement', p => { p.enforcement.state = 'unverified' }],
  ['unknown provider state', p => { p.enforcement.providerState = 'unverified' }],
  ['missing job identity', p => { delete p.enforcement.jobId }],
  ['invalid target', p => { p.enforcement.affectedTargets = ['privacy-authority', null] }],
]
for (const [label, mutate] of malformed) test(`${label} fails closed on read and update without writes`, async () => {
  const policy = validPolicy(); mutate(policy)
  const h = harness(policy)
  const rejectsAuthority = error => error.code === 'failed-precondition' && error.message === 'STORED_CONSENT_POLICY_INVALID'
  await assert.rejects(h.api.getPassportSnapshot.run({}, context()), rejectsAuthority)
  await assert.rejects(h.api.applyConsentPolicy.run({ domain: 'exports', next: denied(),
    expectedRevision: 3, operationId: 'reject-malformed-0001' }, context()), rejectsAuthority)
  assert.deepEqual(h.writes, [])
  assert.deepEqual(h.docs.get(policyPath), policy)
})

test('valid existing explicit policy is preserved when another domain changes', async () => {
  const policy = validPolicy()
  policy.domains.memory = { ...denied(), mode: 'granted', retentionDays: 90, replayVisible: true }
  const h = harness(policy)
  await h.api.applyConsentPolicy.run({ domain: 'exports', next: { ...denied(), mode: 'limited', retentionDays: 30 },
    expectedRevision: 3, operationId: 'explicit-update-0001' }, context())
  assert.deepEqual(h.docs.get(policyPath).domains.memory, policy.domains.memory)
  assert.equal(h.docs.get(policyPath).revision, 4)
})

test('existing revision conflicts still reject atomically', async () => {
  const h = harness(validPolicy())
  await assert.rejects(h.api.applyConsentPolicy.run({ domain: 'exports', next: denied(),
    expectedRevision: 2, operationId: 'revision-conflict-0001' }, context()), error => error.code === 'aborted')
  assert.deepEqual(h.writes, [])
})

test('maximum safe stored revision cannot be incremented into unsafe authority', async () => {
  const policy = validPolicy(); policy.revision = Number.MAX_SAFE_INTEGER
  const h = harness(policy)
  await assert.rejects(h.api.applyConsentPolicy.run({ domain: 'exports', next: denied(),
    expectedRevision: Number.MAX_SAFE_INTEGER, operationId: 'revision-exhausted-0001' }, context()),
  error => error.code === 'failed-precondition' && error.message === 'CONSENT_REVISION_EXHAUSTED')
  assert.deepEqual(h.writes, [])
  assert.deepEqual(h.docs.get(policyPath), policy)
})

test('unsafe expected revision is rejected before transaction writes', async () => {
  const h = harness(validPolicy())
  await assert.rejects(h.api.applyConsentPolicy.run({ domain: 'exports', next: denied(),
    expectedRevision: Number.MAX_SAFE_INTEGER + 1, operationId: 'revision-unsafe-0001' }, context()),
  error => error.code === 'invalid-argument')
  assert.deepEqual(h.writes, [])
})

test('passport serializes receipt timestamps through the imported Admin SDK class', async () => {
  const h = harness()
  await h.api.applyConsentPolicy.run({ domain: 'exports', next: denied(),
    expectedRevision: 0, operationId: 'timestamp-receipt-0001' }, context())
  const passport = await h.api.getPassportSnapshot.run({}, context())
  assert.equal(passport.receipts.length, 1)
  assert.equal(passport.receipts[0].createdAt, '1970-01-01T00:00:00.000Z')
})
