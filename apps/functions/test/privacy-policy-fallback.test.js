'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const { createHash } = require('node:crypto')
const ts = require('typescript')

const root = process.env.CONSENT_SERVER_SOURCE_ROOT || path.resolve(__dirname, '..')
const source = fs.readFileSync(path.join(root, 'src/privacyOperations.ts'), 'utf8')
const ast = ts.createSourceFile('privacyOperations.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const constants = ['CONSENT_DOMAINS', 'CONSENT_MODES', 'REAUTH_WINDOW_SECONDS', 'STORED_DOMAIN_KEYS', 'STORED_PERMISSION_KEYS', 'STORED_AUTHORITY_IDENTIFIER', 'getPassportSnapshot', 'applyConsentPolicy']
const selected = ast.statements.filter(n => ts.isFunctionDeclaration(n) || (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => constants.includes(d.name.getText(ast)))))
for (const name of ['parseStoredPolicy', 'defaultPolicy']) assert.equal(selected.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name).length, 1, name)
const code = ts.transpileModule(selected.map(n => n.getText(ast)).join('\n') + '\nexports.testParseStoredPolicy = parseStoredPolicy; exports.testDefaultPolicy = defaultPolicy;', { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } }).outputText
const owner = 'synthetic-consent-owner'
const domains = ['memory', 'location', 'models', 'exports', 'workforce', 'identity']
const permissionKeys = ['precise', 'replayVisible', 'lifeMapVisible', 'modelContext', 'sharingEnabled', 'automationEnabled', 'likenessEnabled']
const clone = value => JSON.parse(JSON.stringify(value))

// SDK/DAO boundaries are controlled in memory; only the actual source functions execute.
// No Firebase initialization, token acquisition, network, deployed policy or provider proof is involved.
function fixture(policy, { absent = false } = {}) {
  const documents = new Map(), calls = []
  const policyPath = 'users/' + owner + '/privacyPolicy/current'
  if (!absent) documents.set(policyPath, policy)
  const ref = p => ({ path: p, get: async () => snapshot(p), collection: name => query(p + '/' + name) })
  const snapshot = p => ({ exists: documents.has(p), data: () => documents.get(p), get: k => documents.get(p)?.[k], ref: ref(p), id: p.split('/').at(-1) })
  const query = p => ({ doc: name => ref(p + '/' + name), limit: () => query(p), orderBy: () => query(p), get: async () => { calls.push({ kind: 'read-query', path: p }); return { docs: [] } } })
  const db = {
    doc: ref,
    collection: query,
    runTransaction: async callback => callback({ get: async r => { calls.push({ kind: 'transaction-read', path: r.path }); return snapshot(r.path) }, set: (r, v) => { calls.push({ kind: 'write', path: r.path }); documents.set(r.path, v) }, create: (r, v) => { assert.equal(documents.has(r.path), false); calls.push({ kind: 'create', path: r.path }); documents.set(r.path, v) } }),
  }
  const output = {}, functions = { https: { onCall: fn => fn, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code } } } }
  vm.runInNewContext(code, { exports: output, functions, db, createHash, fieldValue: { serverTimestamp: () => ({ seconds: 1770000000, nanoseconds: 1 }) } })
  return { output, calls, documents, policyPath }
}

function validPolicy() {
  const policy = { version: 2, revision: 7, ownerId: owner, domains: {}, enforcement: { state: 'partially-enforced', jobId: 'valid-consent-job', affectedTargets: ['privacy-authority', 'memory-collection'], providerState: 'pending' } }
  for (const [index, domain] of domains.entries()) policy.domains[domain] = { mode: ['granted', 'limited', 'paused', 'denied'][index % 4], retentionDays: [null, 30, 90, 365][index % 4], precise: false, replayVisible: true, lifeMapVisible: true, modelContext: domain === 'memory' || domain === 'models', sharingEnabled: domain === 'exports', automationEnabled: false, likenessEnabled: false }
  return policy
}

function assertUnresolved(policy) {
  assert.equal(policy.version, 2)
  assert.equal(policy.ownerId, owner)
  assert.equal(policy.revision, 0)
  assert.equal(policy.enforcement.state, 'pending')
  assert.equal(policy.enforcement.providerState, 'pending')
  assert.equal(policy.enforcement.jobId, null)
  assert.deepEqual(Array.from(policy.enforcement.affectedTargets), [])
  for (const domain of domains) {
    assert.equal(policy.domains[domain].mode, 'denied', domain)
    assert.equal(policy.domains[domain].retentionDays, null, domain)
    for (const permission of permissionKeys) assert.equal(policy.domains[domain][permission], false, domain + '.' + permission)
  }
}

const malformed = [
  ['absent', () => undefined], ['null', () => null], ['array', () => []],
  ['wrong owner', p => ({ ...p, ownerId: 'other-owner' })], ['missing owner', p => { delete p.ownerId; return p }],
  ['wrong schema version', p => { p.version = 1; return p }],
  ['missing domains', p => { delete p.domains; return p }], ['partial domains', p => { delete p.domains.memory; return p }],
  ['unknown domain', p => { p.domains.extra = p.domains.memory; return p }],
  ['missing permission', p => { delete p.domains.memory.modelContext; return p }],
  ['string permission', p => { p.domains.models.modelContext = 'false'; return p }],
  ['unknown permission', p => { p.domains.memory.autoGrant = true; return p }],
  ['unknown mode', p => { p.domains.memory.mode = 'verified'; return p }],
  ['string retention', p => { p.domains.memory.retentionDays = '365'; return p }],
  ['unknown retention', p => { p.domains.memory.retentionDays = 1; return p }],
  ['missing revision', p => { delete p.revision; return p }], ['string revision', p => { p.revision = '7'; return p }],
  ['negative revision', p => { p.revision = -1; return p }], ['fractional revision', p => { p.revision = 1.5; return p }],
  ['NaN revision', p => { p.revision = NaN; return p }], ['infinite revision', p => { p.revision = Infinity; return p }],
  ['unsafe revision', p => { p.revision = Number.MAX_SAFE_INTEGER + 1; return p }],
  ['missing enforcement', p => { delete p.enforcement; return p }], ['string enforcement', p => { p.enforcement = 'fully-enforced'; return p }],
  ['unknown enforcement', p => { p.enforcement.state = 'certified'; return p }],
  ['unknown provider state', p => { p.enforcement.providerState = 'approved'; return p }],
  ['missing provider state', p => { delete p.enforcement.providerState; return p }],
  ['missing targets', p => { delete p.enforcement.affectedTargets; return p }],
  ['null targets', p => { p.enforcement.affectedTargets = null; return p }],
  ['non-string target', p => { p.enforcement.affectedTargets = [42]; return p }],
  ['duplicate target', p => { p.enforcement.affectedTargets = ['memory-collection', 'memory-collection']; return p }],
  ['sparse targets', p => { p.enforcement.affectedTargets = Array(1); return p }],
  ['over-limit targets', p => { p.enforcement.affectedTargets = Array.from({ length: 1025 }, (_, i) => 'target_' + i); return p }],
  ['invalid job ID', p => { p.enforcement.jobId = {}; return p }],
  ['unknown top authority', p => { p.approved = true; return p }],
  ['inherited policy', p => Object.create(p)], ['inherited domains', p => { p.domains = Object.create(p.domains); return p }],
]

for (const [name, mutate] of malformed) test('stored authority falls back to denied and pending: ' + name, async () => {
  const policy = mutate(validPolicy()), f = fixture(policy)
  assertUnresolved(f.output.testParseStoredPolicy(policy, owner))
  const response = await f.output.getPassportSnapshot({}, { auth: { uid: owner, token: {} } })
  assertUnresolved({ version: 2, ownerId: owner, ...response.consent })
  assert.equal(f.calls.filter(c => c.kind === 'write' || c.kind === 'create').length, 0, 'Passport read must not invent persisted authority')
})

test('actual absent-policy Passport handler reports no grants or fabricated enforcement', async () => {
  const f = fixture(undefined, { absent: true }), response = await f.output.getPassportSnapshot({}, { auth: { uid: owner, token: {} } })
  assertUnresolved({ version: 2, ownerId: owner, ...response.consent })
  assert.equal(f.documents.size, 0)
})

test('malformed stored snapshots do not execute accessors or coercion hooks', () => {
  let calls = 0
  for (const field of ['revision', 'mode', 'retention', 'permission', 'target']) {
    const policy = validPolicy()
    if (field === 'revision') Object.defineProperty(policy, 'revision', { enumerable: true, get() { calls++; return 7 } })
    if (field === 'mode') policy.domains.memory.mode = { toString() { calls++; return 'granted' } }
    if (field === 'retention') policy.domains.memory.retentionDays = { valueOf() { calls++; return 365 } }
    if (field === 'permission') Object.defineProperty(policy.domains.memory, 'modelContext', { enumerable: true, get() { calls++; return true } })
    if (field === 'target') Object.defineProperty(policy.enforcement.affectedTargets, '0', { enumerable: true, get() { calls++; return 'memory-collection' } })
    assertUnresolved(fixture().output.testParseStoredPolicy(policy, owner))
  }
  assert.equal(calls, 0)
})

test('valid saved permissions, safe revisions and enforcement records are preserved exactly', async () => {
  for (const mode of ['granted', 'limited', 'paused', 'denied']) for (const retentionDays of [null, 30, 90, 365]) for (const enabled of [false, true]) {
    const policy = validPolicy()
    for (const domain of domains) policy.domains[domain] = Object.fromEntries([['mode', mode], ['retentionDays', retentionDays], ...permissionKeys.map(k => [k, enabled])])
    policy.updatedAt = { seconds: 1770000000, nanoseconds: 1 }
    const f = fixture(policy), parsed = clone(f.output.testParseStoredPolicy(policy, owner))
    const expected = clone(policy); delete expected.updatedAt
    assert.deepEqual(parsed, expected)
    const response = await f.output.getPassportSnapshot({}, { auth: { uid: owner, token: {} } })
    assert.deepEqual(clone(response.consent), { revision: expected.revision, domains: expected.domains, enforcement: expected.enforcement })
  }
  for (const state of ['pending', 'partially-enforced', 'fully-enforced', 'failed', 'conflicted']) for (const providerState of ['not-applicable', 'pending', 'partial', 'complete', 'failed']) {
    const policy = validPolicy(); policy.enforcement.state = state; policy.enforcement.providerState = providerState
    assert.deepEqual(clone(fixture().output.testParseStoredPolicy(policy, owner)), policy)
  }
})

test('an explicit authenticated change affects only its requested domain on absent or malformed authority', async () => {
  const next = validPolicy().domains.memory
  for (const [name, mutate] of malformed) {
    const f = fixture(mutate(validPolicy()))
    const response = await f.output.applyConsentPolicy({ operationId: 'synthetic-consent-operation', domain: 'memory', next, expectedRevision: 0 }, { auth: { uid: owner } })
    assert.equal(response.state, 'requested', name)
    const policy = f.documents.get(f.policyPath)
    assert.equal(policy.revision, 1, name); assert.deepEqual(clone(policy.domains.memory), next, name)
    const remaining = clone(policy); remaining.revision = 0; remaining.domains.memory = clone(f.output.testDefaultPolicy(owner).domains.memory); remaining.enforcement.jobId = null; remaining.enforcement.affectedTargets = []
    assertUnresolved(remaining)
  }
})

test('valid existing authority retains all other permissions when the actual handler changes one domain', async () => {
  for (const domain of domains) for (const mode of ['granted', 'limited', 'paused', 'denied']) for (const retentionDays of [null, 30, 90, 365]) {
    const policy = validPolicy(), next = { ...policy.domains[domain], mode, retentionDays }, f = fixture(policy)
    const response = await f.output.applyConsentPolicy({ operationId: 'synthetic-consent-operation', domain, next, expectedRevision: 7 }, { auth: { uid: owner } })
    assert.equal(response.revision, 8)
    const stored = f.documents.get(f.policyPath)
    for (const other of domains.filter(d => d !== domain)) assert.deepEqual(clone(stored.domains[other]), policy.domains[other])
    assert.deepEqual(clone(stored.domains[domain]), next)
    assert.equal(stored.enforcement.state, 'pending'); assert.equal(stored.enforcement.providerState, 'pending')
  }
})

test('authentication and revision conflict still reject before authority writes', async () => {
  const f = fixture(validPolicy())
  await assert.rejects(f.output.getPassportSnapshot({}, {}), e => e.code === 'unauthenticated')
  await assert.rejects(f.output.applyConsentPolicy({ operationId: 'synthetic-consent-operation', domain: 'memory', next: validPolicy().domains.memory, expectedRevision: 0 }, { auth: { uid: owner } }), e => e.code === 'aborted')
  assert.equal(f.calls.filter(c => c.kind === 'write' || c.kind === 'create').length, 0)
})

test('the last safe revision remains a valid stored policy and read-only Passport authority', async () => {
  const policy = validPolicy(); policy.revision = Number.MAX_SAFE_INTEGER
  const f = fixture(policy)
  assert.deepEqual(clone(f.output.testParseStoredPolicy(policy, owner)), policy)
  const response = await f.output.getPassportSnapshot({}, { auth: { uid: owner, token: {} } })
  assert.equal(response.consent.revision, Number.MAX_SAFE_INTEGER)
  assert.deepEqual(clone(response.consent.domains), policy.domains)
})

test('exhausted revision rejects the actual change before any policy, job or receipt write', async () => {
  const policy = validPolicy(); policy.revision = Number.MAX_SAFE_INTEGER
  const f = fixture(policy)
  await assert.rejects(f.output.applyConsentPolicy({ operationId: 'synthetic-consent-operation', domain: 'memory', next: policy.domains.memory, expectedRevision: policy.revision }, { auth: { uid: owner } }), e => e.code === 'failed-precondition' && e.message === 'CONSENT_REVISION_EXHAUSTED')
  assert.equal(f.calls.filter(c => c.kind === 'write' || c.kind === 'create').length, 0)
  assert.deepEqual(f.documents.get(f.policyPath), policy)
})

test('the penultimate revision produces a still-valid final safe actual response', async () => {
  const policy = validPolicy(); policy.revision = Number.MAX_SAFE_INTEGER - 1
  const f = fixture(policy)
  const response = await f.output.applyConsentPolicy({ operationId: 'synthetic-consent-operation', domain: 'memory', next: policy.domains.memory, expectedRevision: policy.revision }, { auth: { uid: owner } })
  assert.equal(response.revision, Number.MAX_SAFE_INTEGER)
  const saved = f.documents.get(f.policyPath)
  assert.equal(f.output.testParseStoredPolicy(saved, owner).revision, Number.MAX_SAFE_INTEGER)
  assert.deepEqual(clone(saved.domains), policy.domains)
})
