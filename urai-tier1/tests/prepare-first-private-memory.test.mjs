import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, symlinkSync } from 'node:fs'
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
