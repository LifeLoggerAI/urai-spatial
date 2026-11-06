import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const original = readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(original, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})
const exports = {}
vm.runInNewContext(compiled.outputText, {
  exports, module: { exports }, URL, URLSearchParams, Date, Set, Number,
}, { filename: 'selectedMemoryContract.ts' })
const { buildExplicitDemoMemory, parseSelectedMemory } = exports
const ownerId = 'synthetic-owner'
const id = 'synthetic-first-memory'
const baseline = () => ({ ...buildExplicitDemoMemory(id), ownerId, demo: false, privacy: 'private',
  consentState: 'authorized',
})

test('direct Focus or Replay selection cannot expose hidden source metadata or media receipts', () => {
  const privateSource = baseline()
  const hidden = { ...privateSource, privacy: 'hidden', title: 'SYNTHETIC PRIVATE TITLE',
    summary: 'SYNTHETIC PRIVATE SUMMARY', narrator: { focus: 'SYNTHETIC RESTRICTED TEXT', replay: 'SYNTHETIC RESTRICTED TEXT' },
    sourceMedia: [{ kind: 'audio', mediaReceiptId: 'a'.repeat(64) }],
    sourceProvenance: { authenticity: 'source-derivative-not-generated-autobiography', derivativeSha256: 'b'.repeat(64) },
  }
  const result = parseSelectedMemory(hidden, ownerId, id)
  assert.equal(result.status, 'unauthorized')
  assert.equal(result.memory, null)
  assert.doesNotMatch(JSON.stringify(result), /SYNTHETIC PRIVATE TITLE|SYNTHETIC PRIVATE SUMMARY|SYNTHETIC RESTRICTED TEXT|[a]{64}/)
})
test('first private recording without explicit promotion stays unavailable even to its owner', () => {
  const result = parseSelectedMemory({ ...baseline(), privacy: 'hidden', firstPrivateMemoryConsent: {
    status: 'explicit-owner-confirmation', ownerId, memoryId: id,
  } }, ownerId, id)
  assert.equal(result.status, 'unauthorized')
  assert.equal(result.memory, null)
})
test('already authorized private memory still follows ordinary selection semantics', () => {
  const result = parseSelectedMemory(baseline(), ownerId, id)
  assert.equal(result.status, 'ready')
  assert.equal(result.memory?.privacy, 'private')
  assert.equal(result.memory?.ownerId, ownerId)
})
test('explicit demonstration material retains its distinct demo contract', () => {
  const fixture = buildExplicitDemoMemory(id)
  assert.equal(fixture.demo, true)
  assert.equal(fixture.ownerId, 'explicit-demo')
})

test('prepared first-life source is admitted only after exact owner-confirmed private activation', () => {
  const digest = 'b'.repeat(64), originalDigest = 'c'.repeat(64), receiptId = 'a'.repeat(64)
  const receiptHash = 'd'.repeat(64)
  const accepted = {
    ...baseline(),
    privacy: 'private',
    sourceProvenance: {
      authenticity: 'source-derivative-not-generated-autobiography',
      originalSha256: originalDigest, derivativeSha256: digest,
      derivativeByteLength: 112, derivedContentType: 'audio/ogg',
    },
    sourceMedia: [{ kind: 'audio', mediaReceiptId: receiptId }],
    firstPrivateMemoryConsent: {
      status: 'explicit-owner-confirmation', ownerId, memoryId: id,
      derivativeSha256: digest, canonicalConsentReceiptHash: receiptHash,
      consentRevision: 7,
    },
    firstPrivateMemoryActivation: {
      status: 'explicit-owner-private-replay', ownerId, memoryId: id,
      derivativeSha256: digest, mediaReceiptId: receiptId,
      consentRevision: 7, consentReceiptHash: receiptHash,
    },
  }
  assert.equal(parseSelectedMemory(accepted, ownerId, id, undefined, 7).status, 'ready')
  const denied = [
    { ...accepted, privacy: 'hidden' },
    { ...accepted, privacy: 'shareable' },
    { ...accepted, privacy: 'corrupted' },
    { ...accepted, firstPrivateMemoryActivation: undefined },
    { ...accepted, firstPrivateMemoryActivation: {
      ...accepted.firstPrivateMemoryActivation, ownerId: 'foreign-owner' } },
    { ...accepted, firstPrivateMemoryActivation: {
      ...accepted.firstPrivateMemoryActivation, consentRevision: 6 } },
    { ...accepted, firstPrivateMemoryActivation: {
      ...accepted.firstPrivateMemoryActivation, mediaReceiptId: 'e'.repeat(64) } },
    { ...accepted, firstPrivateMemoryConsent: {
      ...accepted.firstPrivateMemoryConsent, canonicalConsentReceiptHash: 'e'.repeat(64) } },
    { ...accepted, sourceProvenance: {
      ...accepted.sourceProvenance, derivativeSha256: 'e'.repeat(64) } },
    { ...accepted, sourceMedia: [] },
    { ...accepted, sourceMedia: [{ kind: 'image', mediaReceiptId: receiptId }] },
    { ...accepted, sourceMedia: [
      { kind: 'audio', mediaReceiptId: receiptId },
      { kind: 'audio', mediaReceiptId: 'f'.repeat(64) },
    ] },
  ]
  for (const candidate of denied) {
    const result = parseSelectedMemory(candidate, ownerId, id)
    assert.equal(result.status, 'unauthorized')
    assert.equal(result.memory, null)
  }
})

test('foreign owner, deleted, and revoked records remain unavailable', () => {
  const cases = [
    [{ ...baseline(), ownerId: 'foreign-user' }, 'unauthorized'],
    [{ ...baseline(), deleted: true }, 'deleted'],
    [{ ...baseline(), consentState: 'revoked' }, 'unauthorized'],
  ]
  for (const [value, status] of cases) {
    const result = parseSelectedMemory(value, ownerId, id)
    assert.equal(result.status, status)
    assert.equal(result.memory, null)
  }
})
