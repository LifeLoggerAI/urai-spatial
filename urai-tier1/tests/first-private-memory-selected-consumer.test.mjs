import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { prepareFirstPrivateMemory } from '../scripts/prepare-first-private-memory.mjs'

const require = createRequire(import.meta.url)
const ts = require('typescript')

// Exercise the actual consumer parser that Focus and Replay use, not a copied
// schema or a synthetic replacement loader. No Firebase account is accessed.
function selectedMemoryParser() {
  const code = ts.transpileModule(
    readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const exports = {}
  vm.runInNewContext(code, { exports, URL, URLSearchParams }, { filename: 'selectedMemoryContract.ts' })
  assert.equal(typeof exports.parseSelectedMemory, 'function')
  return exports.parseSelectedMemory
}

async function syntheticPacket() {
  const root = mkdtempSync(join(tmpdir(), 'urai-memory-to-focus-'))
  const originalPath = join(root, 'original.mp3')
  const sourcePath = join(root, 'private.ogg')
  writeFileSync(originalPath, Buffer.from('ID3 synthetic original'))
  writeFileSync(sourcePath, Buffer.concat([Buffer.from('OggS'), Buffer.from('OpusHead'), Buffer.alloc(80)]))
  try {
    const packet = await prepareFirstPrivateMemory({
      ownerId: 'synthetic-owner', memoryId: 'synthetic-memory',
      originalPath, sourcePath, sourceRef: 'offline:synthetic-provenance',
      occurredAt: '2026-10-21T00:00:00.000Z',
      occurredAtBasis: 'archive-time-proxy-not-capture-date',
      durationMs: 6000, title: 'Synthetic source recording',
      summary: 'Nonprivate synthetic audio recorded for memory consumer-contract testing.',
    })
    return packet
  } finally { rmSync(root, { recursive: true, force: true }) }
}

test('offline first memory is schema-compatible but not admitted as authorized by Focus/Replay', async () => {
  const packet = await syntheticPacket()
  const parse = selectedMemoryParser()
  const prepared = parse(packet.memory, 'synthetic-owner', 'synthetic-memory', 'nonproduction-bucket')
  assert.equal(prepared.status, 'unauthorized', 'offline packet does not grant individual consent')
  assert.equal(prepared.memory, null)
  const created = { ...packet.memory, consentState: 'authorized', firstPrivateMemoryConsent: {
    status: 'explicit-owner-confirmation', ownerId: 'synthetic-owner', memoryId: 'synthetic-memory',
    derivativeSha256: packet.memory.sourceProvenance.derivativeSha256,
    canonicalConsentReceiptHash: 'b'.repeat(64), consentRevision: 4,
  } }
  assert.equal(parse(created, 'synthetic-owner', 'synthetic-memory').status, 'unauthorized',
    'created hidden memory must not enter Focus without second confirmation')
  const receiptId = 'a'.repeat(64)
  const activated = { ...created, privacy: 'private', sourceMedia: [{ kind: 'audio', mediaReceiptId: receiptId }],
    firstPrivateMemoryActivation: {
      status: 'explicit-owner-private-replay', ownerId: 'synthetic-owner', memoryId: 'synthetic-memory',
      mediaReceiptId: receiptId, derivativeSha256: packet.memory.sourceProvenance.derivativeSha256,
      consentRevision: 4, consentReceiptHash: 'b'.repeat(64),
    } }
  const result = parse(activated, 'synthetic-owner', 'synthetic-memory', 'nonproduction-bucket')
  assert.equal(result.status, 'ready')
  assert.equal(result.memory.ownerId, 'synthetic-owner')
  assert.equal(result.memory.privacy, 'private')
  assert.equal(result.memory.demo, false)
  assert.equal(result.memory.replayManifest.durationMs, 6000)
  assert.deepEqual(Array.from(result.memory.replayManifest.segments, x => x.id), ['memory','emotion','pattern','return'])
  assert.equal(result.memory.sourceMediaReceipts[0].mediaReceiptId, receiptId)
  assert.equal(result.memory.replayManifest.audioUrl, undefined)
  assert.equal(packet.status, 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN')
  for (const bad of [
    { ...activated, privacy: 'hidden' },
    { ...activated, firstPrivateMemoryActivation: { ...activated.firstPrivateMemoryActivation, ownerId: 'foreign' } },
    { ...activated, firstPrivateMemoryActivation: { ...activated.firstPrivateMemoryActivation, consentRevision: 3 } },
    { ...activated, sourceMedia: [] },
  ]) assert.equal(parse(bad, 'synthetic-owner', 'synthetic-memory').status, 'unauthorized')
})

test('another signed-in owner cannot parse the same synthetic first-memory packet as their own', async () => {
  const packet = await syntheticPacket()
  const result = selectedMemoryParser()(packet.memory, 'different-owner', 'synthetic-memory', 'nonproduction-bucket')
  assert.equal(result.status, 'unauthorized')
  assert.equal(result.memory, null)
})

test('deleted or revoked synthetic first memory is denied to its original owner', async () => {
  const packet = await syntheticPacket()
  const parse = selectedMemoryParser()
  for (const raw of [
    { ...packet.memory, deleted: true },
    { ...packet.memory, consentState: 'revoked' },
    { ...packet.memory, consentState: 'pending' },
  ]) {
    const result = parse(raw, 'synthetic-owner', 'synthetic-memory', 'nonproduction-bucket')
    assert.ok(result.status === 'deleted' || result.status === 'unauthorized')
    assert.equal(result.memory, null)
  }
})

test('a future synthetic receipt shape stays owner-bound and does not become a direct media URL', async () => {
  const packet = await syntheticPacket()
  const receiptId = 'a'.repeat(64)
  const raw = { ...packet.memory, consentState: 'authorized', sourceMedia: [{ kind: 'audio', mediaReceiptId: receiptId }] }
  const parse = selectedMemoryParser()
  const result = parse(raw, 'synthetic-owner', 'synthetic-memory', 'nonproduction-bucket')
  assert.equal(result.status, 'unauthorized', 'unactivated prepared source must not expose receipt')
  assert.equal(result.memory, null)

  assert.equal(parse(raw, 'different-owner', 'synthetic-memory', 'nonproduction-bucket').status, 'unauthorized')
})
