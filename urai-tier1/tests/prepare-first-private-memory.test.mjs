import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, symlinkSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  prepareFirstPrivateMemory,
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
