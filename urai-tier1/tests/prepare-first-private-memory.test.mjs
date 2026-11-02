import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { mkdtempSync, writeFileSync, symlinkSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  prepareFirstPrivateMemory,
  main,
  privatePacketWrite,
  MAX_OWNED_MEMORY_MEDIA_BYTES,
} from '../scripts/prepare-first-private-memory.mjs'

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'urai-firstlife-'))
  const originalPath = join(dir, 'original.mp3')
  const sourcePath = join(dir, 'private-derivative.ogg')
  writeFileSync(originalPath, Buffer.from('ID3 source fixture'))
  writeFileSync(sourcePath, Buffer.concat([Buffer.from('OggS'), Buffer.from('OpusHead'), Buffer.alloc(100)]))
  const options = {
    ownerId: 'emulator_owner', memoryId: 'real_fixture_001',
    originalPath, sourcePath, sourceRef: 'private-source-reference:test',
    occurredAt: '2026-09-26T03:39:22.000Z',
    occurredAtBasis: 'archive-time-proxy-not-capture-date',
    durationMs: 542308, title: 'Source recording',
    summary: 'Original recording. Event date and speaker identifications are not confirmed.',
  }
  return { dir, originalPath, sourcePath, options }
}

test('first private memory is hidden until a protected owner media receipt is accepted', async () => {
  const { dir, options } = fixture()
  const packet = await prepareFirstPrivateMemory(options)
  assert.equal(packet.memory.ownerId, 'emulator_owner')
  assert.equal(packet.memory.privacy, 'hidden')
  assert.deepEqual(packet.memory.people, [])
  assert.deepEqual(packet.memory.sourceMedia, [])
  assert.equal(packet.upload.existingCallable, 'registerMemoryMedia')
  assert.equal(packet.upload.requiresExistingServerAuthoredMemory, true)
  assert.equal(packet.status, 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN')
  assert.equal(packet.recordedTruth.claimedReconstruction, false)
  assert.equal(packet.recordedTruth.claimedLifeMovieAcceptance, false)
  const segments = packet.memory.replayManifest.segments
  assert.deepEqual(segments.map(segment => segment.id), ['memory', 'emotion', 'pattern', 'return'])
  let end = 0
  for (const segment of segments) {
    assert.equal(segment.startsAtMs, end)
    end += segment.durationMs
  }
  assert.equal(end, 542308)
  assert.ok(!Object.hasOwn(packet.upload.request, 'base64'))
  const out = join(dir, 'hidden-packet')
  privatePacketWrite(packet, out)
  assert.throws(() => privatePacketWrite(packet, out), /MUST_BE_NEW/)
})

test('preflight rejects wrong owner, guessed dates, excessive bytes, unsupported sources', async () => {
  const f = fixture()
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, ownerId: '' }), /OWNER_UID/)
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, occurredAt: '2026-09-26' }), /UTC_TIMESTAMP/)
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, occurredAtBasis: 'guessed' }), /TIME_PROVENANCE/)
  writeFileSync(f.sourcePath, Buffer.alloc(MAX_OWNED_MEMORY_MEDIA_BYTES + 1))
  await assert.rejects(prepareFirstPrivateMemory(f.options), /4MIB_LIMIT/)
  writeFileSync(f.sourcePath, Buffer.alloc(100))
  await assert.rejects(prepareFirstPrivateMemory(f.options), /FORMAT_UNSUPPORTED/)
})

test('preflight keeps originals immutable and rejects symlinks', async () => {
  const f = fixture()
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, originalPath: f.sourcePath }), /MUST_NOT_OVERWRITE_ORIGINAL/)
  const link = join(f.dir, 'source-link.ogg')
  symlinkSync(f.sourcePath, link)
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, sourcePath: link }), /MUST_BE_REGULAR_FILE/)
})

test('upload operation identity is stable for identical source and distinct for changed derivative or owner', async () => {
  const f = fixture()
  const first = await prepareFirstPrivateMemory(f.options)
  const repeat = await prepareFirstPrivateMemory(f.options)
  assert.equal(first.upload.request.operationId, repeat.upload.request.operationId)
  const alternateOwner = await prepareFirstPrivateMemory({ ...f.options, ownerId: 'other_emulator_owner' })
  assert.notEqual(first.upload.request.operationId, alternateOwner.upload.request.operationId)
  writeFileSync(f.sourcePath, Buffer.concat([Buffer.from('OggS'), Buffer.from('OpusHead'), Buffer.alloc(100, 0x2a)]))
  const revised = await prepareFirstPrivateMemory(f.options)
  assert.notEqual(first.recordedTruth.derivativeSha256, revised.recordedTruth.derivativeSha256)
  assert.notEqual(first.upload.request.operationId, revised.upload.request.operationId)
})


test('private packet serialization failures cannot leave partial owner receipts', () => {
  const root = mkdtempSync(join(tmpdir(), 'urai-atomic-private-'))
  try {
    const target = join(root, 'hidden-private-packet')
    assert.throws(() => privatePacketWrite({
      memory: { ownerId: 'synthetic-only', privacy: 'hidden' },
      upload: { toJSON() { throw new Error('synthetic-serialization-failure') } },
    }, target), /synthetic-serialization-failure/)
    assert.equal(existsSync(target), false)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('private packet rejects missing memory or upload before creating output directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'urai-missing-payload-'))
  try {
    for (const [index, packet] of [
      { upload: { synthetic: true } },
      { memory: { synthetic: true } },
      { memory: undefined, upload: { synthetic: true } },
    ].entries()) {
      const target = join(root, 'invalid-' + index)
      assert.throws(() => privatePacketWrite(packet, target), /PRIVATE_PACKET_PAYLOAD_INVALID/)
      assert.equal(existsSync(target), false)
    }
  } finally { rmSync(root, { recursive: true, force: true }) }
})
test('first private packet preserves immutable source hashes and protected disk permissions', async () => {
  const { dir, originalPath, sourcePath, options } = fixture()
  const { readFileSync, statSync, rmSync } = await import('node:fs')
  const { createHash } = await import('node:crypto')
  try {
    const originalBefore = readFileSync(originalPath)
    const derivativeBefore = readFileSync(sourcePath)
    const hash = bytes => createHash('sha256').update(bytes).digest('hex')
    const packet = await prepareFirstPrivateMemory(options)
    assert.equal(packet.recordedTruth.originalSha256, hash(originalBefore))
    assert.equal(packet.recordedTruth.derivativeSha256, hash(derivativeBefore))
    assert.equal(packet.memory.sourceProvenance.originalSha256, hash(originalBefore))
    assert.equal(packet.memory.sourceProvenance.derivativeSha256, hash(derivativeBefore))
    assert.equal(packet.upload.sha256, hash(derivativeBefore))
    assert.equal(packet.upload.filePathNotEmbedded, true)
    assert.equal(packet.upload.base64NotEmbedded, true)
    assert.deepEqual(readFileSync(originalPath), originalBefore)
    assert.deepEqual(readFileSync(sourcePath), derivativeBefore)
    const output = join(dir, 'private-export')
    privatePacketWrite(packet, output)
    const memoryFile = join(output, 'memory.private.json')
    const handoffFile = join(output, 'handoff.private.json')
    if (process.platform !== 'win32') {
      assert.equal(statSync(output).mode & 0o777, 0o700)
      assert.equal(statSync(memoryFile).mode & 0o777, 0o600)
      assert.equal(statSync(handoffFile).mode & 0o777, 0o600)
    }
    const persisted = JSON.parse(readFileSync(handoffFile, 'utf8'))
    assert.equal(persisted.status, 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN')
    assert.equal(persisted.upload.sha256, hash(derivativeBefore))
    assert.equal(persisted.memory.privacy, 'hidden')
    assert.ok(!JSON.stringify(persisted).includes(sourcePath))
    assert.ok(!JSON.stringify(persisted).includes(originalPath))
  } finally { rmSync(dir, {recursive:true,force:true}) }
})

test('preflight avoids reading the whole private derivative when checking a 128-byte signature', async () => {
  const f = fixture()
  const large = Buffer.concat([Buffer.from('OggS'), Buffer.from('OpusHead'), Buffer.alloc(2 * 1024 * 1024)])
  writeFileSync(f.sourcePath, large)
  const original = fs.readFileSync
  let bulkReadAttempted = false
  fs.readFileSync = function (path, ...args) {
    if (String(path) === f.sourcePath) {
      bulkReadAttempted = true
      throw new Error('PRIVATE_BULK_READ_NOT_ALLOWED')
    }
    return original.call(this, path, ...args)
  }
  syncBuiltinESMExports()
  try {
    const packet = await prepareFirstPrivateMemory(f.options)
    assert.equal(packet.recordedTruth.byteLength, large.length)
    assert.equal(packet.recordedTruth.contentType, 'audio/ogg')
    assert.equal(packet.memory.privacy, 'hidden')
    assert.equal(bulkReadAttempted, false)
  } finally {
    fs.readFileSync = original
    syncBuiltinESMExports()
  }
})

for (const flag of ['owner', 'memory', 'source', 'original', 'source-ref', 'occurred-at', 'time-basis', 'duration-ms', 'title', 'summary', 'out']) {
  test(`private memory CLI rejects repeated --${flag} before source access`, async () => {
    await assert.rejects(main([`--${flag}=first`, `--${flag}=second`]), /DUPLICATE_FIRST_LIFE_ARGUMENT/)
  })
}
test('private memory CLI rejects invalid positional argument', async () => {
  await assert.rejects(main(['owner=none']), /UNKNOWN_FIRST_LIFE_ARGUMENT/)
})


test('first-life handoff requires server-created authorized memory without granting consent offline', async () => {
  const f = fixture()
  const packet = await prepareFirstPrivateMemory(f.options)
  assert.equal(packet.memory.privacy, 'hidden')
  assert.equal(Object.hasOwn(packet.memory, 'consentState'), false)
  assert.equal(packet.upload.requiresExistingServerAuthoredMemory, true)
  assert.equal(packet.upload.requiredSelectedMemoryConsentState, 'authorized')
  assert.equal(packet.upload.offlinePreparationGrantsConsent, false)
  assert.equal(packet.upload.ownerIdentityVerifiedOffline, false)
  assert.equal(packet.upload.requiredOwnerAuthFreshnessSeconds, 300)
  assert.equal(packet.upload.initialVisibility, 'hidden')
})

test('offline preparation rejects an attempt to mint individual memory consent', async () => {
  const f = fixture()
  await assert.rejects(prepareFirstPrivateMemory({ ...f.options, consentState: 'authorized' }),
    /OFFLINE_MEMORY_CONSENT_STATE_FORBIDDEN/)
})
