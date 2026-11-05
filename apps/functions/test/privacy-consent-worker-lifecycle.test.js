'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const { createHash } = require('node:crypto')
const ts = require('typescript')

// Execute the actual callable and onCreate handler. Only Firestore/SDK boundaries
// are controlled; this is not a deployed emulator, provider or privacy acceptance.
const root = process.env.CONSENT_WORKER_SOURCE_ROOT || path.resolve(__dirname, '..')
const sourceFile = process.env.CONSENT_WORKER_SOURCE_FILE || 'privacyOperations.ts'
const source = fs.readFileSync(path.join(root, 'src', sourceFile), 'utf8')
const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const names = ['CONSENT_DOMAINS', 'CONSENT_MODES', 'STORED_DOMAIN_KEYS', 'STORED_PERMISSION_KEYS',
  'STORED_AUTHORITY_IDENTIFIER', 'CONSENT_ENFORCEMENT_LIMITS', 'CONSENT_DERIVATIVE_COLLECTIONS',
  'REAUTH_WINDOW_SECONDS', 'applyConsentPolicy', 'processPrivacyEnforcementJob']
const selected = ast.statements.filter(n => ts.isFunctionDeclaration(n)
  || (ts.isImportDeclaration(n) && n.moduleSpecifier.text === './consentPolicyAuthority')
  || (ts.isVariableStatement(n) && n.declarationList.declarations.some(d => names.includes(d.name.getText(ast)))))
assert.equal(selected.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'enforceConsentJob').length, 1)
const code = ts.transpileModule(selected.map(n => n.getText(ast)).join('\n')
  + '\nexports.testDefaultPolicy = defaultPolicy; exports.testTargets = affectedTargets;',
{ compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const presence = fs.readFileSync(path.join(root, 'src/personPresenceAuthority.ts'), 'utf8')
const presenceAst = ts.createSourceFile('personPresenceAuthority.ts', presence, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const presenceCode = ts.transpileModule(presenceAst.statements.filter(n => ts.isFunctionDeclaration(n)
  && ['fail', 'invalidateCollections', 'revokePersonPresenceConsentDerivatives'].includes(n.name?.text))
  .map(n => n.getText(presenceAst)).join('\n'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

const policyAuthority = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, 'src/consentPolicyAuthority.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: policyAuthority })
const requirePolicyAuthority = name => { assert.equal(name, './consentPolicyAuthority'); return policyAuthority }

const uid = 'synthetic-consent-worker-owner'
const domains = ['memory', 'location', 'models', 'exports', 'workforce', 'identity']
const derivativeCollections = ['personModelBundles', 'personRenderBindings', 'sceneTruthPackets', 'renderManifests', 'simulationSessions']
const clone = value => value === undefined ? undefined : structuredClone(value)
const stable = (operation, purpose) => createHash('sha256').update(purpose + ':' + uid + ':' + operation).digest('hex').slice(0, 40)
const nested = (value, key) => key.split('.').reduce((v, part) => v?.[part], value)
function setField(value, key, field) {
  const keys = key.split('.')
  let current = value
  for (const part of keys.slice(0, -1)) current = current[part] ||= {}
  current[keys.at(-1)] = clone(field)
}
function merge(base, patch) {
  const result = clone(base || {})
  for (const [key, value] of Object.entries(patch)) {
    result[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? merge(result[key], value) : clone(value)
  }
  return result
}

function fixture() {
  const documents = new Map(), versions = new Map(), collectionVersions = new Map()
  const committed = [], queries = [], beforeCommit = [], transactionOptions = []
  let queryHook, afterCommit, clock = 1770000000000, attempts = 0
  const ownerPath = 'users/' + uid
  const policyPath = ownerPath + '/privacyPolicy/current'
  const fencePath = ownerPath + '/privacyRuntime/exportAuthority'
  const parent = p => p.slice(0, p.lastIndexOf('/'))
  const write = (p, value) => {
    if (value === undefined) documents.delete(p); else documents.set(p, clone(value))
    versions.set(p, (versions.get(p) || 0) + 1)
    collectionVersions.set(parent(p), (collectionVersions.get(parent(p)) || 0) + 1)
  }
  const ref = p => ({
    path: p, id: p.split('/').at(-1), get: async () => snapshot(p),
    set: async (v, o) => { write(p, o?.merge ? merge(documents.get(p), v) : v); committed.push({ kind: 'direct-set', path: p }) },
    update: async v => {
      if (!documents.has(p)) throw Error('SYNTHETIC_NOT_FOUND')
      const value = clone(documents.get(p))
      for (const [k, field] of Object.entries(v)) setField(value, k, field)
      write(p, value); committed.push({ kind: 'direct-update', path: p })
    },
    collection: name => query(p + '/' + name),
  })
  const snapshot = (p, data = documents.get(p)) => {
    const value = clone(data), exists = data !== undefined
    return { exists, id: p.split('/').at(-1), ref: ref(p), data: () => clone(value), get: key => clone(nested(value, key)) }
  }
  const query = (p, limit = Infinity, fields, after) => ({
    path: p, query: true, limitCount: limit, fields, after,
    limit: n => query(p, n, fields, after),
    select: (...keys) => query(p, limit, keys, after),
    startAfter: item => query(p, limit, fields, item.id),
    get: async () => readQuery(query(p, limit, fields, after)),
  })
  const readQuery = async q => {
    queries.push({ path: q.path, limit: q.limitCount, fields: q.fields })
    if (queryHook) await queryHook(q)
    const rows = [...documents].filter(([p]) => parent(p) === q.path && (!q.after || p.split('/').at(-1) > q.after))
      .sort(([a], [b]) => a.localeCompare(b)).slice(0, q.limitCount)
    const docs = rows.map(([p, data]) => snapshot(p, q.fields
      ? Object.fromEntries(q.fields.filter(k => nested(data, k) !== undefined).map(k => [k, nested(data, k)]))
      : data))
    return { docs, size: docs.length, empty: !docs.length }
  }
  const commit = async (ops, observed, observedQueries, mode) => {
    const hook = beforeCommit.shift()
    if (hook) await hook({ ops, mode })
    if (observed && [...observed].some(([p, version]) => version !== (versions.get(p) || 0))) return false
    if (observedQueries && [...observedQueries].some(([p, version]) => version !== (collectionVersions.get(p) || 0))) return false
    // Atomic SDK boundary: validate every update/create before applying any write.
    for (const op of ops) {
      if (op.kind === 'update' && !documents.has(op.path)) throw Error('SYNTHETIC_NOT_FOUND')
      if (op.kind === 'create' && documents.has(op.path)) throw Error('SYNTHETIC_ALREADY_EXISTS')
    }
    const staged = new Map()
    for (const op of ops) {
      const old = staged.has(op.path) ? staged.get(op.path) : documents.get(op.path)
      if (op.kind === 'update') {
        const value = clone(old)
        for (const [k, field] of Object.entries(op.value)) setField(value, k, field)
        staged.set(op.path, value)
      } else staged.set(op.path, op.merge ? merge(old, op.value) : clone(op.value))
    }
    for (const [p, value] of staged) write(p, value)
    committed.push(...ops.map(op => ({ ...op, mode })))
    if (afterCommit) await afterCommit({ ops, mode })
    return true
  }
  const db = {
    doc: ref, collection: query,
    runTransaction: async (callback, options = {}) => {
      transactionOptions.push(clone(options))
      const max = options.maxAttempts || 5
      for (let attempt = 0; attempt < max; attempt++) {
        attempts++
        const observed = new Map(), observedQueries = new Map(), ops = []
        let hasWritten = false
        const stage = (kind, r, v, o) => { hasWritten = true; ops.push({ kind, path: r.path, value: clone(v), merge: Boolean(o?.merge) }) }
        const result = await callback({
          get: async r => {
            assert.equal(hasWritten, false, 'Firestore requires every read before writes')
            if (r.query) {
              const result = await readQuery(r)
              observedQueries.set(r.path, collectionVersions.get(r.path) || 0)
              for (const item of result.docs) observed.set(item.ref.path, versions.get(item.ref.path) || 0)
              return result
            }
            observed.set(r.path, versions.get(r.path) || 0)
            return snapshot(r.path)
          },
          set: (r, v, o) => stage('set', r, v, o),
          create: (r, v) => stage('create', r, v),
          update: (r, v) => stage('update', r, v),
        })
        if (await commit(ops, observed, observedQueries, 'transaction')) return result
      }
      throw Error('SYNTHETIC_CONTENTION_EXHAUSTED')
    },
    batch: () => {
      const ops = []
      const batch = {
        set: (r, v, o) => { ops.push({ kind: 'set', path: r.path, value: clone(v), merge: Boolean(o?.merge) }); return batch },
        update: (r, v) => { ops.push({ kind: 'update', path: r.path, value: clone(v) }); return batch },
        commit: async () => commit(ops, null, null, 'batch'),
      }
      return batch
    },
  }
  const HttpsError = class extends Error { constructor(code, message) { super(message); this.code = code } }
  const functions = { https: { onCall: fn => fn, HttpsError },
    firestore: { document: () => ({ onCreate: fn => fn }) } }
  const fieldValue = { serverTimestamp: () => ({ seconds: Math.floor(clock / 1000), nanoseconds: 1 }) }
  const presenceExports = {}
  vm.runInNewContext(presenceCode, { exports: presenceExports, functions })
  const output = {}
  vm.runInNewContext(code, { exports: output, require: requirePolicyAuthority, functions, db, createHash, fieldValue, Buffer,
    Date: class extends Date { static now() { return clock } },
    revokePersonPresenceConsentDerivatives: (...args) => presenceExports.revokePersonPresenceConsentDerivatives(...args) })
  const base = clone(output.testDefaultPolicy(uid))
  write(ownerPath, { displayName: 'Synthetic owner', consents: { 'data.export': { enabled: true, purpose: 'data.export', revision: 17 }, productAnalytics: false }, privacyRevision: 0 })
  write(fencePath, { generation: 0, pendingDeletions: {} })
  const domainPolicy = mode => ({ ...clone(base.domains.memory), mode })
  const seed = (domain = 'memory', mode = 'granted', revision = 7, operation = 'synthetic-current-consent-operation', custom) => {
    const jobId = stable(operation, 'consent'), receiptId = stable(operation, 'consent-receipt')
    const policy = custom ? clone(custom) : clone(base)
    policy.revision = revision
    policy.domains[domain] = domainPolicy(mode)
    const targets = clone(output.testTargets(domain, policy.domains[domain]))
    policy.enforcement = { state: 'pending', jobId, affectedTargets: targets, providerState: 'pending' }
    const jobPath = 'privacyEnforcementJobs/' + jobId
    const receiptPath = ownerPath + '/privacyReceipts/' + receiptId
    write(policyPath, policy)
    write(jobPath, { jobId, uid, operationId: operation, receiptId, domain, revision, deletionGeneration: documents.get(fencePath).generation,
      next: policy.domains[domain], affectedTargets: targets, state: 'requested', providerState: 'pending' })
    write(receiptPath, { receiptId, ownerId: uid, kind: 'consent', domain, revision, jobId, result: 'requested' })
    return { jobId, jobPath, receiptId, receiptPath, policy, captured: snapshot(jobPath) }
  }
  const provider = (id, scope) => {
    const p = ownerPath + '/providerConnections/' + id
    write(p, { processingAllowed: true, ...(scope === undefined ? {} : { consentDomains: scope }), unrelatedProviderMetadata: 'preserved' })
    return p
  }
  const derivative = (collection, id, ownerId = uid) => {
    const p = ownerPath + '/' + collection + '/' + id
    write(p, { ownerId, state: 'current', privateSource: 'not-a-provider-payload' })
    return p
  }
  const userRows = () => clone([...documents].filter(([p]) => p === ownerPath || p.startsWith(ownerPath + '/')))
  const resetWrites = () => { committed.length = 0; queries.length = 0 }
  return { output, documents, committed, queries, write, snapshot, seed, provider, derivative, ownerPath, policyPath, fencePath,
    userRows, resetWrites, domainPolicy, beforeCommit, transactionOptions,
    get attempts() { return attempts },
    set queryHook(fn) { queryHook = fn }, set afterCommit(fn) { afterCommit = fn }, advance: ms => { clock += ms } }
}
const run = (f, job) => f.output.processPrivacyEnforcementJob(job.captured)
const projectionRows = f => [...f.documents].filter(([p]) => p.includes('/privacyRuntime/') && !p.endsWith('/exportAuthority'))
const queues = f => [...f.documents].filter(([p]) => p.startsWith('providerRevocationQueue/'))
const changedUserRows = f => f.committed.filter(x => x.path === f.ownerPath || x.path.startsWith(f.ownerPath + '/'))
function assertNoProjectionOrProviderCommit(f) {
  assert.equal(f.committed.some(x => x.path === f.ownerPath || x.path.includes('/privacyRuntime/') || x.path.includes('/providerConnections/')
    || x.path.startsWith('providerRevocationQueue/') || derivativeCollections.some(c => x.path.includes('/' + c + '/'))), false)
}

test('current onCreate reconciles all six projections while preserving C7 export and unrelated owner fields', async () => {
  const f = fixture(), j = f.seed()
  const exportConsent = clone(f.documents.get(f.ownerPath).consents['data.export'])
  await run(f, j)
  const owner = f.documents.get(f.ownerPath)
  for (const d of domains) assert.equal(owner.consents[d], d === 'memory', d)
  assert.deepEqual(owner.consents['data.export'], exportConsent)
  assert.equal(owner.consents.productAnalytics, false)
  assert.equal(owner.displayName, 'Synthetic owner')
  assert.equal(owner.privacyRevision, 7)
  const expected = new Set(domains.flatMap(d => Array.from(f.output.testTargets(d, f.documents.get(f.policyPath).domains[d]))))
  assert.deepEqual(new Set(projectionRows(f).map(([, data]) => data.target)), expected)
  const receipt = f.documents.get(j.receiptPath)
  assert.equal(receipt.result, 'fully-enforced')
  assert.equal(receipt.providerState, 'not-applicable')
  assert.deepEqual(new Set(receipt.repositoryTargets.map(x => x.target)), expected)
  assert.equal(f.committed.every(x => x.mode === 'transaction'), true)
})

test('delayed stale grant becomes conflicted without rewriting newer policy, owner, receipt or providers', async () => {
  const f = fixture(), old = f.seed('memory', 'granted', 7, 'synthetic-old-consent-operation')
  const latest = f.seed('memory', 'denied', 8, 'synthetic-new-consent-operation')
  const p = f.provider('memory-provider', ['memory'])
  const before = f.userRows()
  f.resetWrites()
  await run(f, old)
  assert.equal(f.documents.get(old.jobPath).state, 'conflicted')
  assert.deepEqual(f.userRows(), before)
  assert.equal(f.documents.get(latest.jobPath).state, 'requested')
  assert.equal(f.documents.get(p).processingAllowed, true)
  assert.equal(queues(f).length, 0)
})

test('latest different-domain job also applies an older memory revocation from the full canonical policy', async () => {
  const f = fixture(), old = f.seed('memory', 'denied', 7, 'synthetic-old-consent-operation')
  const latest = f.seed('location', 'granted', 8, 'synthetic-new-consent-operation', old.policy)
  const p = f.provider('memory-provider', ['memory'])
  await run(f, old)
  await run(f, latest)
  const owner = f.documents.get(f.ownerPath)
  assert.equal(owner.consents.memory, false)
  assert.equal(owner.consents.location, true)
  assert.equal(f.documents.get(p).processingAllowed, false)
  assert.equal(f.documents.get(latest.receiptPath).providerState, 'pending')
})

test('captured next and revision never override the live canonical job/policy', async () => {
  const f = fixture(), j = f.seed()
  const job = clone(f.documents.get(j.jobPath)), policy = clone(f.documents.get(f.policyPath))
  job.next = f.domainPolicy('denied'); policy.domains.memory = clone(job.next)
  job.affectedTargets = clone(f.output.testTargets('memory', job.next)); policy.enforcement.affectedTargets = clone(job.affectedTargets)
  f.write(j.jobPath, job); f.write(f.policyPath, policy)
  await run(f, j)
  assert.equal(f.documents.get(f.ownerPath).consents.memory, false)
})

for (const state of ['fully-enforced', 'partially-enforced', 'failed', 'conflicted', 'cancelled']) {
  test('replayed captured request cannot rerun live terminal job: ' + state, async () => {
    const f = fixture(), j = f.seed()
    f.write(j.jobPath, { ...f.documents.get(j.jobPath), state })
    const before = clone([...f.documents])
    f.resetWrites()
    await run(f, j)
    assert.deepEqual([...f.documents], before)
    assert.equal(f.committed.length, 0)
  })
}

for (const removed of ['job', 'policy', 'receipt', 'owner']) {
  test('deleted ' + removed + ' cannot be recreated by captured work or failure cleanup', async () => {
    const f = fixture(), j = f.seed()
    const p = { job: j.jobPath, policy: f.policyPath, receipt: j.receiptPath, owner: f.ownerPath }[removed]
    f.write(p, undefined)
    const before = f.userRows()
    f.resetWrites()
    await run(f, j)
    assert.equal(f.documents.has(p), false)
    assert.deepEqual(f.userRows(), before)
    assertNoProjectionOrProviderCommit(f)
  })
}

for (const [name, mutate] of [
  ['active deletion', f => f.write(f.fencePath, { generation: 1, pendingDeletions: { deleting: true } })],
  ['changed deletion epoch', f => f.write(f.fencePath, { generation: 1, pendingDeletions: {} })],
  ['deleted owner marker', f => f.write(f.ownerPath, { ...f.documents.get(f.ownerPath), deleted: true })],
  ...['deleting', 'deleted', 'disabled'].map(status => ['owner account ' + status,
    f => f.write(f.ownerPath, { ...f.documents.get(f.ownerPath), accountStatus: status })]),
  ['newer owner projection', f => f.write(f.ownerPath, { ...f.documents.get(f.ownerPath), privacyRevision: 99 })],
  ['wrong canonical owner', f => f.write(f.policyPath, { ...f.documents.get(f.policyPath), ownerId: 'other-owner' })],
  ['malformed canonical policy', f => { const p = clone(f.documents.get(f.policyPath)); delete p.domains.memory; f.write(f.policyPath, p) }],
]) test(name + ' conflicts before repository/provider projection writes', async () => {
  const f = fixture(), j = f.seed()
  mutate(f)
  const before = f.userRows()
  f.resetWrites()
  await run(f, j)
  assert.equal(f.documents.get(j.jobPath).state, 'conflicted')
  assert.deepEqual(f.userRows(), before)
  assertNoProjectionOrProviderCommit(f)
})

test('legacy unbound jobs can run only before any deletion generation', async () => {
  const f = fixture(), j = f.seed()
  const job = clone(f.documents.get(j.jobPath)); delete job.deletionGeneration; f.write(j.jobPath, job)
  await run(f, j); assert.equal(f.documents.get(j.jobPath).state, 'fully-enforced')
  const g = fixture(), k = g.seed()
  const unbound = clone(g.documents.get(k.jobPath)); delete unbound.deletionGeneration; g.write(k.jobPath, unbound)
  g.write(g.fencePath, { generation: 1, pendingDeletions: {} })
  await run(g, k); assert.equal(g.documents.get(k.jobPath).state, 'conflicted')
  assertNoProjectionOrProviderCommit(g)
})

for (const [name, mutate] of [
  ['operation identity', j => { j.operationId = 'forged-other-operation' }],
  ['receipt identity', j => { j.receiptId = 'foreign-receipt' }],
  ['unsafe revision', j => { j.revision = Number.MAX_SAFE_INTEGER + 1 }],
  ['forged next', j => { j.next.mode = 'limited' }],
  ['forged target', j => { j.affectedTargets = ['foreign-target'] }],
]) test('live malformed ' + name + ' cannot publish authority', async () => {
  const f = fixture(), j = f.seed()
  const value = clone(f.documents.get(j.jobPath)); mutate(value); f.write(j.jobPath, value)
  const before = f.userRows()
  f.resetWrites()
  await run(f, j)
  assert.deepEqual(f.userRows(), before)
  assertNoProjectionOrProviderCommit(f)
})

test('provider permission uses every relevant current domain and queues genuine pending revocation', async () => {
  const f = fixture(), j = f.seed()
  const mixed = f.provider('mixed', ['memory', 'models']), allowed = f.provider('memory-only', ['memory'])
  await run(f, j)
  assert.equal(f.documents.get(mixed).processingAllowed, false)
  assert.equal(f.documents.get(allowed).processingAllowed, true)
  assert.equal(f.documents.get(mixed).unrelatedProviderMetadata, 'preserved')
  assert.deepEqual(queues(f).map(([, q]) => [q.providerId, q.domain, q.state]), [['mixed', 'models', 'requested']])
  const receipt = f.documents.get(j.receiptPath)
  assert.equal(receipt.result, 'partially-enforced')
  assert.equal(receipt.providerState, 'pending')
  assert.equal(receipt.revocationQueues.length, 1)
})

for (const scope of [undefined, [], ['unknown'], ['memory', 'memory'], 'memory']) {
  test('missing or unknown provider scopes fail closed: ' + JSON.stringify(scope), async () => {
    const f = fixture(), j = f.seed()
    const p = f.provider('unscoped', scope)
    await run(f, j)
    assert.equal(f.documents.get(p).processingAllowed, false)
    assert.equal(f.documents.get(j.receiptPath).providerState, 'pending')
    assert.equal(queues(f).length, 1)
  })
}

test('100 providers are completely projected; the 101st is a failed bounded operation with no partial projection', async () => {
  const f = fixture(), j = f.seed()
  for (let i = 0; i < 100; i++) f.provider('p' + String(i).padStart(3, '0'), ['memory'])
  await run(f, j)
  assert.equal(f.committed.filter(x => x.path.includes('/providerConnections/')).length, 100)
  const g = fixture(), k = g.seed()
  for (let i = 0; i < 101; i++) g.provider('p' + String(i).padStart(3, '0'), ['memory'])
  g.resetWrites()
  await assert.rejects(run(g, k), e => e.message === 'CONSENT_PROVIDER_BUDGET_EXCEEDED')
  assert.equal(g.documents.get(k.jobPath).state, 'failed')
  assert.equal(g.documents.get(k.receiptPath).failureCode, 'CONSENT_PROVIDER_BUDGET_EXCEEDED')
  assertNoProjectionOrProviderCommit(g)
  assert.equal(g.queries.some(q => q.limit === 101), true)
})

test('oversized selected provider authority fails the byte budget before any projection', async () => {
  const f = fixture(), j = f.seed()
  f.provider('oversized', ['x'.repeat(256 * 1024)])
  f.resetWrites()
  await assert.rejects(run(f, j), e => e.message === 'CONSENT_READ_BYTE_BUDGET_EXCEEDED')
  assertNoProjectionOrProviderCommit(f)
})

test('combined queue/write budget rejects before any partial repository or provider success', async () => {
  const f = fixture(), j = f.seed('memory', 'denied')
  for (let i = 0; i < 40; i++) f.provider('multi-' + i, domains)
  f.resetWrites()
  await assert.rejects(run(f, j), e => e.message === 'CONSENT_WRITE_BUDGET_EXCEEDED')
  assert.equal(f.documents.get(j.receiptPath).result, 'failed')
  assertNoProjectionOrProviderCommit(f)
})

for (const domain of ['models', 'identity']) for (const mode of ['denied', 'paused']) {
  test('owner rights revocation: ' + domain + ' ' + mode + ' disposes authority for all five derivative kinds', async () => {
    const f = fixture(), j = f.seed(domain, mode)
    const assets = derivativeCollections.map((collection, index) => f.derivative(collection, 'owner-rights-' + index))
    await run(f, j)
    for (const asset of assets) {
      const value = f.documents.get(asset)
      assert.equal(value.state, 'revoked', asset)
      assert.equal(value.ownerId, uid, asset)
      assert.equal(f.committed.filter(write => write.path === asset).length, 1, asset)
      assert.equal(f.committed.find(write => write.path === asset).mode, 'transaction', asset)
    }
    assert.equal(f.documents.get(j.receiptPath).invalidatedDerivatives, 5)
    assert.equal(f.documents.get(j.jobPath).invalidatedDerivatives, 5)
  })
}

test('derivative revocation is in the same atomic canonical transaction and receipt', async () => {
  const f = fixture(), j = f.seed('models', 'denied')
  const assets = derivativeCollections.map((c, i) => f.derivative(c, 'private-' + i))
  await run(f, j)
  for (const p of assets) assert.equal(f.documents.get(p).state, 'revoked')
  assert.equal(f.documents.get(j.receiptPath).invalidatedDerivatives, 5)
  assert.equal(f.committed.filter(x => assets.includes(x.path)).every(x => x.mode === 'transaction'), true)
})

test('the 101st derivative and a foreign-owner derivative fail without partial revocation or grants', async () => {
  for (const wrongOwner of [false, true]) {
    const f = fixture(), j = f.seed('models', 'denied')
    if (wrongOwner) f.derivative('personModelBundles', 'foreign', 'other-owner')
    else for (let i = 0; i < 101; i++) f.derivative('personModelBundles', 'private-' + i)
    f.resetWrites()
    await assert.rejects(run(f, j), e => e.message === (wrongOwner ? 'CONSENT_DERIVATIVE_OWNER_MISMATCH' : 'CONSENT_DERIVATIVE_BUDGET_EXCEEDED'))
    assertNoProjectionOrProviderCommit(f)
  }
})

test('policy conflict at commit retries and conflicts the old job without publishing the stale grant', async () => {
  const f = fixture(), old = f.seed()
  const p = f.provider('memory', ['memory'])
  let latest
  f.beforeCommit.push(() => { latest = f.seed('memory', 'denied', 8, 'synthetic-retry-consent-operation') })
  await run(f, old)
  assert.equal(f.attempts, 2)
  assert.equal(f.documents.get(old.jobPath).state, 'conflicted')
  assert.equal(f.documents.get(f.policyPath).revision, 8)
  assert.equal(f.documents.get(f.policyPath).enforcement.state, 'pending')
  assert.equal(f.documents.get(latest.receiptPath).result, 'requested')
  assert.equal(f.documents.get(p).processingAllowed, true)
  assertNoProjectionOrProviderCommit(f)
})

test('deletion at commit retries without recreating policy, owner, receipt or projection', async () => {
  const f = fixture(), j = f.seed()
  f.beforeCommit.push(() => {
    f.write(f.ownerPath, undefined); f.write(f.policyPath, undefined); f.write(j.receiptPath, undefined)
    f.write(f.fencePath, { generation: 1, pendingDeletions: { deleting: true } })
  })
  await run(f, j)
  assert.equal(f.attempts, 2)
  assert.equal(f.documents.has(f.ownerPath), false)
  assert.equal(f.documents.has(f.policyPath), false)
  assert.equal(f.documents.has(j.receiptPath), false)
  assertNoProjectionOrProviderCommit(f)
})

test('benign document contention retries cleanly and commits each projection/queue exactly once', async () => {
  const f = fixture(), j = f.seed('memory', 'denied')
  f.provider('memory', ['memory'])
  f.beforeCommit.push(() => f.write(f.ownerPath, { ...f.documents.get(f.ownerPath), independentProfileUpdate: true }))
  await run(f, j)
  assert.equal(f.attempts, 2)
  assert.equal(f.committed.filter(x => x.path === f.ownerPath).length, 1)
  assert.equal(queues(f).length, 1)
  assert.equal(f.documents.get(f.ownerPath).independentProfileUpdate, true)
})

test('a provider query conflict includes the new provider on retry instead of silent partial coverage', async () => {
  const f = fixture(), j = f.seed('memory', 'denied')
  const first = f.provider('a', ['memory'])
  let second
  f.beforeCommit.push(() => { second = f.provider('b', ['memory']) })
  await run(f, j)
  assert.equal(f.attempts, 2)
  assert.equal(f.documents.get(first).processingAllowed, false)
  assert.equal(f.documents.get(second).processingAllowed, false)
  assert.equal(queues(f).length, 2)
})

test('actual transaction retries stop at five attempts before update-only failure recording', async () => {
  const f = fixture(), j = f.seed()
  for (let i = 0; i < 5; i++) f.beforeCommit.push(() => {
    f.write(f.ownerPath, { ...f.documents.get(f.ownerPath), contentionMarker: i })
  })
  await assert.rejects(run(f, j), e => e.message === 'SYNTHETIC_CONTENTION_EXHAUSTED')
  assert.equal(f.attempts, 6)
  assert.deepEqual(f.transactionOptions.map(options => options.maxAttempts), [5, 5])
  assert.equal(f.documents.get(j.jobPath).state, 'failed')
  assert.equal(f.documents.get(j.receiptPath).failureCode, 'CONSENT_ENFORCEMENT_FAILED')
  assert.equal(f.committed.every(write => write.kind === 'update'), true)
  assertNoProjectionOrProviderCommit(f)
})

test('late commit failure never replaces successor policy/receipt and stores no private error message', async () => {
  const f = fixture(), old = f.seed()
  let latest
  f.beforeCommit.push(() => {
    latest = f.seed('memory', 'denied', 8, 'synthetic-failure-successor-operation')
    throw Error('SYNTHETIC_PRIVATE_CREDENTIAL_MUST_NOT_BE_STORED')
  })
  await assert.rejects(run(f, old))
  assert.equal(f.documents.get(old.jobPath).state, 'conflicted')
  assert.equal(f.documents.get(f.policyPath).enforcement.state, 'pending')
  assert.equal(f.documents.get(latest.receiptPath).result, 'requested')
  assert.equal(JSON.stringify([...f.documents]).includes('SYNTHETIC_PRIVATE_CREDENTIAL'), false)
  assertNoProjectionOrProviderCommit(f)
})

test('current read failure records failure atomically with no invented grants or recreated documents', async () => {
  const f = fixture(), j = f.seed()
  let fail = true
  f.queryHook = () => { if (fail) { fail = false; throw Error('SYNTHETIC_PRIVATE_READ_FAILURE') } }
  f.resetWrites()
  await assert.rejects(run(f, j))
  assert.equal(f.documents.get(j.jobPath).state, 'failed')
  assert.equal(f.documents.get(f.policyPath).enforcement.state, 'failed')
  assert.equal(f.documents.get(j.receiptPath).failureCode, 'CONSENT_ENFORCEMENT_FAILED')
  assert.equal(JSON.stringify([...f.documents]).includes('SYNTHETIC_PRIVATE_READ_FAILURE'), false)
  assertNoProjectionOrProviderCommit(f)
})

test('failure recording itself retries against a new policy without contaminating its enforcement', async () => {
  const f = fixture(), old = f.seed()
  let fail = true, latest
  f.queryHook = () => { if (fail) { fail = false; throw Error('SYNTHETIC_PRIVATE_READ_FAILURE') } }
  f.beforeCommit.push(() => { latest = f.seed('memory', 'denied', 8, 'synthetic-failure-recording-operation') })
  await assert.rejects(run(f, old))
  assert.equal(f.documents.get(f.policyPath).enforcement.state, 'pending')
  assert.equal(f.documents.get(latest.receiptPath).result, 'requested')
  assert.equal(f.documents.get(old.jobPath).state, 'conflicted')
  assertNoProjectionOrProviderCommit(f)
})

test('an expired bounded handler records failure before projection or provider writes', async () => {
  const f = fixture(), j = f.seed()
  f.queryHook = () => f.advance(30000)
  f.resetWrites()
  await assert.rejects(run(f, j), e => e.message === 'CONSENT_ENFORCEMENT_DEADLINE_EXCEEDED')
  assertNoProjectionOrProviderCommit(f)
})

test('no postcommit destructive callback can revoke new derivatives after a successor grant', async () => {
  const f = fixture(), j = f.seed('models', 'denied')
  let fresh
  f.afterCommit = ({ ops }) => {
    if (!ops.some(x => x.path === f.ownerPath)) return
    f.afterCommit = undefined
    const next = clone(j.policy)
    next.domains.identity = f.domainPolicy('granted')
    f.seed('models', 'granted', 8, 'synthetic-postcommit-successor-operation', next)
    fresh = f.derivative('personModelBundles', 'new-after-grant')
  }
  await run(f, j)
  assert.equal(f.documents.get(fresh).state, 'current')
  assert.equal(f.documents.get(f.policyPath).enforcement.state, 'pending')
})

test('actual enqueue binds the current deletion generation and rejects active deletion without writes', async () => {
  const f = fixture()
  f.write(f.fencePath, { generation: 4, pendingDeletions: {} })
  const next = f.domainPolicy('granted')
  const response = await f.output.applyConsentPolicy({ operationId: 'synthetic-enqueue-current-operation', domain: 'memory', next, expectedRevision: 0 }, { auth: { uid } })
  assert.equal(f.documents.get('privacyEnforcementJobs/' + response.jobId).deletionGeneration, 4)
  const g = fixture()
  g.write(g.fencePath, { generation: 5, pendingDeletions: { deleting: true } })
  g.resetWrites()
  await assert.rejects(g.output.applyConsentPolicy({ operationId: 'synthetic-enqueue-blocked-operation', domain: 'memory', next, expectedRevision: 0 }, { auth: { uid } }),
    e => e.message === 'CONSENT_DELETION_PENDING')
  assert.equal(g.committed.length, 0)
})

test('idempotent enqueue replay returns existing job without recreating a deleted policy/receipt', async () => {
  const f = fixture(), j = f.seed()
  f.write(f.policyPath, undefined); f.write(j.receiptPath, undefined)
  f.resetWrites()
  const result = await f.output.applyConsentPolicy({ operationId: 'synthetic-current-consent-operation', domain: 'memory', next: f.domainPolicy('granted'), expectedRevision: 7 }, { auth: { uid } })
  assert.equal(result.jobId, j.jobId)
  assert.equal(f.documents.has(f.policyPath), false)
  assert.equal(f.documents.has(j.receiptPath), false)
  assert.equal(f.committed.length, 0)
})
