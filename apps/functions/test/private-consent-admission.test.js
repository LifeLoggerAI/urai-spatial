'use strict'
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const crypto = require('node:crypto')
const { createRequire } = require('node:module')
const { test } = require('node:test')
const fixtureFile = path.join(__dirname, 'lifeModelPrivateInputs.test.js')
const ts = createRequire(fixtureFile)('typescript')
const moduleRoot = process.env.PRIVATE_CONSENT_COMPILED_DIR || path.resolve(__dirname, '../lib/apps/functions/src')
const candidateRoot = path.resolve(__dirname, '../lib/apps/functions/src')
const fixtureSource = fs.readFileSync(fixtureFile, 'utf8')
const prefixEnd = fixtureSource.indexOf("test('protected resolver derives owner")
assert.ok(prefixEnd > 0)
const ast = ts.createSourceFile(fixtureFile, fixtureSource.slice(0, prefixEnd), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
const declarations = ast.statements.filter(n => ts.isFunctionDeclaration(n)
  || (ts.isVariableStatement(n) && !n.declarationList.declarations.some(d => ['require', 'ts'].includes(d.name.getText(ast)))))
let fixtureCode = declarations.map(n => n.getText(ast)).join('\n')
const existingLoader = "const code = ts.transpileModule(fs.readFileSync(\`src/\${filename}.ts\`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText"
assert.equal(fixtureCode.split(existingLoader).length, 2, 'one actual module loader expected')
fixtureCode = fixtureCode.replace(existingLoader,
  'const code = fs.readFileSync(' + JSON.stringify(moduleRoot + '/') + " + filename + '.js', 'utf8')")
fixtureCode = fixtureCode.replace("assert.equal(field,'__name__');return collection",
  "assert.ok(['__name__','createdAt'].includes(field));return collection")
const fixtureModule = { exports: {} }
vm.runInNewContext(ts.transpileModule(fixtureCode + '\nmodule.exports={fixture,uid,body,sourcePath,transcriptPath,provenancePath,handlePath,narration,sha};',
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, {
  module: fixtureModule, exports: fixtureModule.exports, fs, vm, createHash: crypto.createHash, assert,
  require: createRequire(fixtureFile), ts, Buffer, process, console,
}, { filename: 'existing-controlled-private-input-fixture.js' })
const { fixture, uid, sourcePath, transcriptPath, handlePath, narration, sha } = fixtureModule.exports
const policyPath = 'users/' + uid + '/privacyPolicy/current'
const policyAuthority = require(path.join(candidateRoot, 'consentPolicyAuthority.js'))
const clone = value => JSON.parse(JSON.stringify(value))

function graphFixture(f, options = {}) {
  const sourceId = 'psr_SYNTHETIC_SOURCE_123456789'
  const sourceRef = 'uraiPrivateSourceReceipts/' + sha(sourceId)
  const source = { schemaVersion: 'urai-private-source-receipt-v2', ownerUid: uid,
    sourceReceiptRef: sourceId, status: 'ACTIVE', synthetic: false, purposes: ['memory-index'],
    sourceRevision: 1, sourceSha256: 'b'.repeat(64), sourceByteLength: 31,
    sourceFixityRef: 'private:synthetic/source-fixture', sourceEvidenceClass: 'SOURCE_CAPTURED',
    sourceHandle: 'psh_SYNTHETIC_SOURCE_123456789',
    consent: { purpose: 'memory.storage', policyVersion: '2', decisionReceiptId: 'synthetic-receipt' } }
  options.mutateSource?.(source)
  f.records.set(sourceRef, source)
  const stats = { reads: 0, transactions: 0, graphWrites: [], initialized: 0, derivativeReads: 0 }
  function snapshot(location) {
    const row = f.records.get(location)
    return { exists: row !== undefined, data: () => row, id: location.split('/').at(-1),
      ref: { path: location }, get: key => key.split('.').reduce((o, k) => o?.[k], row) }
  }
  const db = {
    doc: location => ({ path: location, get: async () => { stats.reads++; return snapshot(location) } }),
    collection: location => {
      const query = { where(field, operator, value) {
        assert.equal(field, 'dependencyIds'); assert.equal(operator, 'array-contains')
        assert.equal(value, 'synthetic-entity'); return query
      }, limit(value) { assert.equal(value, 200); return query }, startAfter() { return query },
      async get() { assert.ok(location.startsWith('users/' + uid + '/')); stats.derivativeReads++; return { empty: true, size: 0, docs: [] } } }
      return query
    },
    async runTransaction(run) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const staged = []
        const tx = { get: async ref => { stats.reads++; return snapshot(ref.path) },
          set(ref, value) { staged.push({ path: ref.path, value }) } }
        const result = await run(tx)
        stats.transactions++
        if (attempt === 0 && options.retry) { options.retry(f.records); continue }
        for (const write of staged) {
          f.records.set(write.path, { ...(f.records.get(write.path) ?? {}), ...write.value })
          stats.graphWrites.push(write)
        }
        return result
      }
      assert.fail('synthetic transaction did not settle')
    },
  }
  const functions = { region: () => functions, https: {
    onCall: handler => handler, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code } },
  }, firestore: { document: () => ({ onCreate: handler => handler }) } }
  const admin = { apps: [{}], initializeApp() { stats.initialized++; assert.fail('No SDK initialization') },
    firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: () => 'synthetic-clock' } }) }
  const modules = new Map()
  function load(name) {
    if (modules.has(name)) return modules.get(name)
    const exports = {}
    vm.runInNewContext(fs.readFileSync(path.join(moduleRoot, name + '.js'), 'utf8'), {
      exports, Buffer, console, process: { env: {} },
      require(dependency) {
        if (dependency === 'firebase-functions/v1') return functions
        if (dependency === 'firebase-admin') return admin
        if (dependency === 'node:crypto') return crypto
        if (dependency.startsWith('./')) return load(dependency.slice(2))
        throw Error('Unexpected actual LifeModel dependency: ' + dependency)
      },
    }, { filename: 'actual-strict-' + name + '.js' })
    modules.set(name, exports); return exports
  }
  return { stats, source, async write(context = { auth: { uid, token: {} } }) {
    return load('lifeModelFunctions').upsertLifeEntity({
      id: 'synthetic-entity', kind: 'event', canonicalLabel: 'Synthetic source fixture',
      createdFromSourceIds: [sourceId],
    }, context)
  } }
}
const malformed = [
  ['missing-policy', (f, p) => f.records.delete(policyPath)],
  ['null-policy', (f, p) => f.records.set(policyPath, null)],
  ['array-policy', (f, p) => f.records.set(policyPath, [])],
  ['partial-grants', (f, p) => f.records.set(policyPath, { version: 2, revision: 4, ownerId: uid,
    domains: { memory: { mode: 'granted', modelContext: true }, models: { mode: 'limited', modelContext: true }, identity: { mode: 'limited' } },
    enforcement: { state: 'fully-enforced' } })],
  ['foreign-owner', (f, p) => { p.ownerId = 'foreign-owner' }],
  ['missing-owner', (f, p) => { delete p.ownerId }],
  ['old-version', (f, p) => { p.version = 1 }],
  ['missing-revision', (f, p) => { delete p.revision }],
  ['string-revision', (f, p) => { p.revision = '4' }],
  ['fractional-revision', (f, p) => { p.revision = 4.5 }],
  ['unsafe-revision', (f, p) => { p.revision = Number.MAX_SAFE_INTEGER + 1 }],
  ['missing-other-domain', (f, p) => { delete p.domains.location }],
  ['extra-domain', (f, p) => { p.domains.extra = clone(p.domains.memory) }],
  ['missing-permission', (f, p) => { delete p.domains.memory.replayVisible }],
  ['string-unrelated-permission', (f, p) => { p.domains.memory.replayVisible = 'false' }],
  ['string-retention', (f, p) => { p.domains.memory.retentionDays = '365' }],
  ['invalid-retention', (f, p) => { p.domains.memory.retentionDays = 999 }],
  ['unknown-mode', (f, p) => { p.domains.workforce.mode = 'approved' }],
  ['missing-enforcement-job', (f, p) => { delete p.enforcement.jobId }],
  ['missing-enforcement-targets', (f, p) => { delete p.enforcement.affectedTargets }],
  ['missing-provider-state', (f, p) => { delete p.enforcement.providerState }],
  ['unknown-provider-state', (f, p) => { p.enforcement.providerState = 'approved' }],
  ['duplicate-targets', (f, p) => { p.enforcement.affectedTargets = ['same', 'same'] }],
  ['numeric-target', (f, p) => { p.enforcement.affectedTargets = [7] }],
  ['extra-authority', (f, p) => { p.approved = true }],
]
for (const [name, mutate] of malformed) test('malformed policy withholds actual private response and graph commit: ' + name, async () => {
  const f = fixture(), p = f.records.get(policyPath); mutate(f, p)
  const graph = graphFixture(f), before = JSON.stringify([...f.records])
  const passport = await f.load('privacyOperations').getPassportSnapshot({}, { auth: { uid, token: {} } })
  assert.equal(passport.consent.domains.models.mode, 'denied')
  assert.equal(passport.consent.enforcement.state, 'pending')
  const response = await f.resolve()
  assert.notEqual(response.statusCode, 200)
  assert.equal(response.body.authorized, false)
  assert.equal(Object.hasOwn(response.body, 'transcriptText'), false)
  await assert.rejects(graph.write())
  assert.equal(graph.stats.graphWrites.length, 0)
  assert.equal(graph.stats.initialized, 0)
  assert.equal(JSON.stringify([...f.records]), before)
  assert.equal(f.stats.files.size, 0)
  assert.equal(f.stats.deleted.length, 0)
  assert.ok(f.stats.logs.every(line => !line.includes(narration)))
})
for (const modelMode of ['granted', 'limited']) for (const identityMode of ['granted', 'limited']) {
  test('canonical grant semantics preserved: models=' + modelMode + '/identity=' + identityMode, async () => {
    const f = fixture(), p = f.records.get(policyPath)
    p.domains.models.mode = modelMode; p.domains.identity.mode = identityMode
    assert.equal(policyAuthority.isCanonicalStoredPolicy(p, uid), true)
    const response = await f.resolve()
    assert.equal(response.statusCode, 200)
    assert.equal(response.body.transcriptText, narration)
    assert.equal(response.body.synthetic, false)
    const graph = graphFixture(f)
    assert.deepEqual(clone(await graph.write()), { id: 'synthetic-entity', kind: 'event' })
    assert.equal(graph.stats.graphWrites.length, 1)
    assert.equal(graph.stats.graphWrites[0].value.ownerId, uid)
    assert.equal(graph.stats.derivativeReads, 7)
    assert.equal(graph.stats.initialized, 0)
  })
}
for (const reason of ['models-denied', 'identity-denied', 'model-context-denied', 'enforcement-pending']) {
  test('existing collection and model denial preserved: ' + reason, async () => {
    const f = fixture(), p = f.records.get(policyPath)
    if (reason === 'models-denied') p.domains.models.mode = 'denied'
    if (reason === 'identity-denied') p.domains.identity.mode = 'denied'
    if (reason === 'model-context-denied') p.domains.models.modelContext = false
    if (reason === 'enforcement-pending') p.enforcement.state = 'pending'
    const response = await f.resolve()
    assert.equal(response.body.authorized, false)
    const graph = graphFixture(f)
    await assert.rejects(graph.write())
    assert.equal(graph.stats.graphWrites.length, 0)
  })
}
for (const reason of ['memory-denied', 'memory-model-context-denied', 'source-revoked', 'external-processing-denied',
  'purpose-revoked', 'provider-revoked', 'provider-processing-denied', 'foreign-transcript-owner', 'owner-deleted', 'epoch-changed']) {
  test('existing private transcript authority preserved: ' + reason, async () => {
    const f = fixture(), p = f.records.get(policyPath)
    if (reason === 'memory-denied') p.domains.memory.mode = 'denied'
    if (reason === 'memory-model-context-denied') p.domains.memory.modelContext = false
    if (reason === 'source-revoked') f.records.get(sourcePath).consentState = 'revoked'
    if (reason === 'external-processing-denied') f.records.get(sourcePath).externalProcessingConsent = false
    if (reason === 'purpose-revoked') f.records.get(sourcePath).purposes = ['transcribe']
    if (reason === 'provider-revoked') f.records.get('users/' + uid + '/providerConnections/openai').revocationState = 'pending'
    if (reason === 'provider-processing-denied') f.records.get('users/' + uid + '/providerConnections/openai').processingAllowed = false
    if (reason === 'foreign-transcript-owner') f.records.get(transcriptPath).ownerId = 'foreign-owner'
    if (reason === 'owner-deleted' || reason === 'epoch-changed') f.records.set('privateLifeModelOwnerBarriers/' + sha(uid), {
      epoch: reason === 'epoch-changed' ? 1 : 0, blocked: reason === 'owner-deleted',
    })
    const response = await f.resolve()
    assert.equal(response.body.authorized, false)
    assert.equal(Object.hasOwn(response.body, 'transcriptText'), false)
  })
}
for (const reason of ['foreign-source-owner', 'revoked-source', 'owner-fence', 'memory-c1-block', 'unauthenticated']) {
  test('existing actual graph ownership/source controls preserved: ' + reason, async () => {
    const f = fixture()
    const graph = graphFixture(f, { mutateSource(source) {
      if (reason === 'foreign-source-owner') source.ownerUid = 'foreign-owner'
      if (reason === 'revoked-source') source.status = 'REVOKED'
    } })
    if (reason === 'owner-fence') f.records.set('uraiPrivateLifeModelOwnerFences/' + sha(uid), { deleted: true })
    if (reason === 'memory-c1-block') f.records.set('jobConsentBlocks/' + sha(uid + '\n' + 'memory.storage'), { active: true })
    await assert.rejects(graph.write(reason === 'unauthenticated' ? {} : { auth: { uid, token: {} } }))
    assert.equal(graph.stats.graphWrites.length, 0)
    if (reason === 'unauthenticated') assert.equal(graph.stats.reads, 0)
  })
}
test('canonical zero revision keeps original different consumer semantics', async () => {
  const f = fixture(), p = f.records.get(policyPath)
  p.revision = 0
  assert.equal(policyAuthority.isCanonicalStoredPolicy(p, uid), true)
  assert.equal((await f.resolve()).body.authorized, false, 'private resolver already requires positive revision')
  const graph = graphFixture(f)
  await graph.write()
  assert.equal(graph.stats.graphWrites.length, 1, 'original graph admission accepts canonical zero revision')
})
for (const reason of ['malformed-policy', 'foreign-policy-owner', 'source-revoked', 'provider-revoked', 'epoch-changed']) {
  test('second actual resolver snapshot withholds data after change: ' + reason, async () => {
    const f = fixture({ afterTransaction(count, records) {
      if (count !== 1) return
      if (reason === 'malformed-policy') delete records.get(policyPath).domains.location
      if (reason === 'foreign-policy-owner') records.get(policyPath).ownerId = 'foreign-owner'
      if (reason === 'source-revoked') records.get(sourcePath).consentState = 'revoked'
      if (reason === 'provider-revoked') records.get('users/' + uid + '/providerConnections/openai').revocationState = 'pending'
      if (reason === 'epoch-changed') records.set('privateLifeModelOwnerBarriers/' + sha(uid), { epoch: 1, blocked: false })
    } })
    const response = await f.resolve()
    assert.equal(response.body.authorized, false)
    assert.equal(Object.hasOwn(response.body, 'transcriptText'), false)
    assert.equal(f.stats.files.size, 0)
  })
}
for (const reason of ['malformed-policy', 'foreign-policy-owner', 'models-revoked', 'source-revoked']) {
  test('actual graph transaction retry rechecks current authority: ' + reason, async () => {
    const f = fixture(), graph = graphFixture(f, { retry(records) {
      if (reason === 'malformed-policy') delete records.get(policyPath).domains.location
      if (reason === 'foreign-policy-owner') records.get(policyPath).ownerId = 'foreign-owner'
      if (reason === 'models-revoked') records.get(policyPath).domains.models.mode = 'denied'
      if (reason === 'source-revoked') {
        const key = [...records.keys()].find(p => p.startsWith('uraiPrivateSourceReceipts/'))
        records.get(key).status = 'REVOKED'
      }
    } })
    await assert.rejects(graph.write())
    assert.equal(graph.stats.graphWrites.length, 0)
  })
}
test('private resolver authentication and source binding remain required', async () => {
  const f = fixture()
  const response = await f.resolve({}, { headers: { authorization: 'Bearer wrong-synthetic-token' } })
  assert.equal(response.statusCode, 401)
  assert.equal(f.stats.reads, 0)
  const invalid = await f.resolve({ sourceHandle: 'foreign-or-malformed' })
  assert.equal(invalid.statusCode, 400)
})
