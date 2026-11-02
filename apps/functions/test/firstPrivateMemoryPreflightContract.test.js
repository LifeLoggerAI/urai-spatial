'use strict'
const test = require('node:test')
const assert = require('node:assert/strict')
const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { join, resolve } = require('node:path')
const { pathToFileURL } = require('node:url')
const vm = require('node:vm')
const ts = require('typescript')
const { createHash } = require('node:crypto')

const repo = resolve(__dirname, '../../..')
const source = readFileSync(join(repo, 'apps/functions/src/firstPrivateMemoryPacket.ts'), 'utf8')
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const moduleExports = {}
vm.runInNewContext(transpiled, { exports: moduleExports, require, Buffer, Date }, { filename: 'firstPrivateMemoryPacket.ts' })
const { parsePreparedFirstPrivateMemory: parse } = moduleExports
const preflightUrl = pathToFileURL(join(repo, 'urai-tier1/scripts/prepare-first-private-memory.mjs')).href

async function withSyntheticPacket(check) {
  const dir = mkdtempSync(join(tmpdir(), 'urai-firstlife-contract-'))
  const originalPath = join(dir, 'original.mp3')
  const sourcePath = join(dir, 'derivative.ogg')
  const ownerId = 'syntheticOwner', memoryId = 'syntheticMemory'
  try {
    writeFileSync(originalPath, Buffer.from('ID3 Synthetic original, no personal information'))
    writeFileSync(sourcePath, Buffer.concat([Buffer.from('OggSOpusHead'), Buffer.alloc(120, 0x41)]))
    const { prepareFirstPrivateMemory } = await import(preflightUrl)
    const packet = await prepareFirstPrivateMemory({ ownerId, memoryId, sourcePath, originalPath,
      sourceRef: 'offline:synthetic-test-only', occurredAt: '2026-10-21T00:00:00.000Z',
      occurredAtBasis: 'archive-time-proxy-not-capture-date', durationMs: 6000,
      title: 'Synthetic source recording', summary: 'Synthetic source bytes; no real recording or person is included.' })
    return await check({ packet, ownerId, memoryId, originalPath, sourcePath })
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

test('actual offline preflight packet is accepted by the canonical server parser without granting consent or replay', async () => {
  await withSyntheticPacket(({ packet, ownerId, memoryId, originalPath, sourcePath }) => {
    const admitted = parse(packet, ownerId)
    assert.equal(admitted.memoryId, memoryId)
    assert.equal(admitted.memory.ownerId, ownerId)
    assert.equal(admitted.memory.privacy, 'hidden')
    assert.equal(admitted.memory.consentState, 'authorized')
    assert.equal(Object.hasOwn(packet.memory, 'consentState'), false)
    assert.equal(packet.upload.offlinePreparationGrantsConsent, false)
    assert.equal(packet.upload.ownerIdentityVerifiedOffline, false)
    assert.equal(admitted.memory.sourceProvenance.sourceAdmissionStatus, 'owner-asserted-pending-media-verification')
    assert.equal(admitted.memory.sourceProvenance.occurredAtBasis, 'archive-time-proxy-not-capture-date')
    assert.deepEqual(Array.from(admitted.memory.sourceMedia), [])
    assert.equal(packet.status, 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN')
    assert.equal(admitted.memory.replayManifest.segments.length, 4)
    assert.equal(packet.upload.sha256, createHash('sha256').update(readFileSync(sourcePath)).digest('hex'))
    assert.equal(packet.recordedTruth.originalSha256, createHash('sha256').update(readFileSync(originalPath)).digest('hex'))
    assert.equal(JSON.stringify(admitted).includes(sourcePath), false)
    assert.equal(JSON.stringify(admitted).includes(originalPath), false)
  })
})

test('server rejects offline source packet if identity changes after preflight', async () => {
  await withSyntheticPacket(({ packet }) => {
    assert.throws(() => parse(packet, 'differentAuthenticatedOwner'), /FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
    const modified = structuredClone(packet)
    modified.memory.ownerId = 'foreignOwner'
    assert.throws(() => parse(modified, 'syntheticOwner'), /FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
  })
})

test('server rejects derivative rebind and forged offline consent claims', async () => {
  await withSyntheticPacket(({ packet, ownerId }) => {
    const badDigest = structuredClone(packet)
    badDigest.recordedTruth.derivativeSha256 = 'a'.repeat(64)
    assert.throws(() => parse(badDigest, ownerId), /FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
    const consent = structuredClone(packet)
    consent.upload.offlinePreparationGrantsConsent = true
    assert.throws(() => parse(consent, ownerId), /FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
    const injected = structuredClone(packet)
    injected.memory.sourceMedia = [{ kind: 'audio', url: 'https://synthetic.invalid/media?token=forbidden' }]
    assert.throws(() => parse(injected, ownerId), /FIRST_PRIVATE_MEMORY_PACKET_INVALID/)
  })
})
