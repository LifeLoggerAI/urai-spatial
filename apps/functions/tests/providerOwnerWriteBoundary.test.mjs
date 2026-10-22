import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const src = fs.readFileSync(new URL('../src/providerFunctions.ts', import.meta.url), 'utf8')
const decisionSource = fs.readFileSync(new URL('../src/providerOwnerAuthority.ts', import.meta.url), 'utf8')
function segment(start, end) {
  const from = src.indexOf(start)
  const to = src.indexOf(end, from)
  assert.ok(from >= 0 && to > from, 'Required production source functions must exist')
  return src.slice(from, to)
}
const source = segment('function assertProviderConsent(', 'function readBody(')
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true })
assert.deepEqual(compiled.diagnostics ?? [], [], 'Actual provider authorization and write code must transpile')
const helperCompiled = ts.transpileModule(decisionSource, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}, reportDiagnostics: true })
assert.deepEqual(helperCompiled.diagnostics ?? [], [])
const { providerOwnerAuthorityDecision } =
  await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(helperCompiled.outputText))
class ProviderError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code }
}
class Timestamp {
  constructor(value) { this.value = value }
  toMillis() { return this.value }
  static fromMillis(value) { return new Timestamp(value) }
}
const admin = { firestore: { Timestamp, FieldValue: {
  serverTimestamp: () => 'SERVER_TIME',
  increment: (number) => ({ increment: number }),
} } }
const policy = { ownerId: 'owner', revision: 12, domains: {
  models: { mode: 'granted', modelContext: true },
}, enforcement: { state: 'fully-enforced' } }
const isRecord = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isCanonicalStoredPolicy = (value, uid) => value?.ownerId === uid && value?.revision === 12

const makeDoc = (exists, data = {}) => ({
    exists, data: () => exists ? data : undefined,
    get: (key) => exists ? data[key] : undefined,
  })
function fixture(overrides = {}) {
  const writes = []
  const doc = makeDoc
  const records = {
    'users/owner': doc(true, { deleted: false, accountStatus: 'active', privacyRevision: 12 }),
    'users/owner/privacyPolicy/current': doc(true, policy),
    'users/owner/providerConnections/elevenlabs': doc(true, { processingAllowed: true }),
    'users/owner/privacyRuntime/exportAuthority': doc(true, { pendingDeletions: {} }),
    'privacyDeletionTombstones/owner': doc(false),
    'users/owner/providerRateLimits/elevenlabs': doc(false),
  }
  Object.assign(records, overrides)
  const db = {
    doc: path => ({ path }),
    runTransaction: async work => work({
      get: async reference => records[reference.path] ?? doc(false),
      set: (reference, value, options) => writes.push({ path: reference.path, value, options }),
    }),
  }
  const produce = new Function('db','admin','ProviderError','RATE_WINDOW_MS','createHash',
    'providerOwnerAuthorityDecision','isCanonicalStoredPolicy','isRecord',
    compiled.outputText + '\nreturn { consumeRateLimit, recordTelemetry };')
  const runtime = produce(db, admin, ProviderError, 60_000, createHash,
    providerOwnerAuthorityDecision, isCanonicalStoredPolicy, isRecord)
  return { ...runtime, writes, doc }
}

test('active owner can record a single bounded voice rate increment', async () => {
  const { consumeRateLimit, writes } = fixture()
  await consumeRateLimit('owner', 'elevenlabs', 6)
  assert.equal(writes.length, 1)
  assert.equal(writes[0].path, 'users/owner/providerRateLimits/elevenlabs')
})
test('deleting or deleted owner cannot create voice rate limit records', async () => {
  for (const state of ['deleting', 'deleted', 'disabled']) {
    const { consumeRateLimit, writes, doc } = fixture({ 'users/owner': makeDoc(true, { accountStatus: state }) })
    await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e => e.code === 'PROVIDER_OWNER_INACTIVE')
    assert.equal(writes.length, 0)
  }
})
test('pending deletion, tombstone, and invalid fence each block voice limiter writes', async () => {
  const cases = [
    { 'users/owner/privacyRuntime/exportAuthority': { exists: true, get: (key) => key === 'pendingDeletions' ? { erase: true } : undefined } },
    { 'privacyDeletionTombstones/owner': { exists: true } },
    { 'users/owner/privacyRuntime/exportAuthority': { exists: true, get: () => 'malformed' } },
  ]
  for (const records of cases) {
    const { consumeRateLimit, writes } = fixture(records)
    await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e => e.code === 'PROVIDER_OWNER_INACTIVE')
    assert.equal(writes.length, 0)
  }
})
test('stale privacy revision blocks voice limiter before writing', async () => {
  const { consumeRateLimit, writes, doc } = fixture({
    'users/owner': makeDoc(true, { privacyRevision: 11, accountStatus: 'active' }),
  })
  await assert.rejects(consumeRateLimit('owner','elevenlabs',6), e => e.code === 'PROVIDER_OWNER_INACTIVE')
  assert.equal(writes.length, 0)
})
test('active owner telemetry writes only aggregates in the same transaction as owner check', async () => {
  const { recordTelemetry, writes } = fixture()
  await recordTelemetry({uid:'owner',provider:'elevenlabs',outcome:'success',inputUnits:10,latencyMs:42})
  assert.equal(writes.length, 1)
  assert.equal(writes[0].path,'users/owner/providerTelemetry/elevenlabs')
  assert.equal(writes[0].value.lastOutcome,'success')
  assert.equal('prompt' in writes[0].value, false)
})
test('late telemetry cannot recreate private records after account deletion', async () => {
  for (const owner of [{ deleted: true }, { accountStatus: 'deleting' }]) {
    const { recordTelemetry, writes, doc } = fixture({ 'users/owner': makeDoc(true,owner) })
    await recordTelemetry({uid:'owner',provider:'elevenlabs',outcome:'failure',inputUnits:0,latencyMs:6})
    assert.equal(writes.length,0)
  }
})
test('late telemetry cannot write during pending deletion or after tombstone', async () => {
  for (const change of [
    { 'users/owner/privacyRuntime/exportAuthority': { exists:true, get:()=>({deletionJob:true}) } },
    { 'privacyDeletionTombstones/owner': { exists:true } },
  ]) {
    const { recordTelemetry, writes } = fixture(change)
    await recordTelemetry({uid:'owner',provider:'elevenlabs',outcome:'failure',inputUnits:0,latencyMs:6})
    assert.equal(writes.length,0)
  }
})
test('telemetry and rate-limit direct writes are forbidden outside transactions', () => {
  assert.doesNotMatch(segment('async function recordTelemetry(', 'function readBody('), /await db\.doc\([\s\S]*?\)\.set\(/)
  assert.match(segment('async function consumeRateLimit(', 'async function recordTelemetry('), /assertProviderOwnerActive/)
  assert.match(segment('async function recordTelemetry(', 'function readBody('), /assertProviderOwnerActive/)
})
