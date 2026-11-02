import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { webcrypto } from 'node:crypto'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = fs.readFileSync(new URL('../src/lib/privacy/importFirstPreparedMemory.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
} }).outputText
const sha = 'b'.repeat(64), memoryId = 'fictionalMemory', uid = 'fictionalOwner'
const fixtureBytes = new TextEncoder().encode('fictional audio fixture, no family media')
const digest = Buffer.from(await webcrypto.subtle.digest('SHA-256', fixtureBytes)).toString('hex')
function packet() { return {
  schemaVersion: 'urai-first-private-memory-preflight-v1', status: 'PREPARED_NOT_IMPORTED_NOT_PLAYBACK_PROVEN',
  firestorePath: `users/${uid}/memories/${memoryId}`,
  memory: { ownerId: uid, privacy: 'hidden', deleted: false, sourceMedia: [],
    sourceProvenance: { authenticity: 'source-derivative-not-generated-autobiography', originalSha256: 'c'.repeat(64), derivativeSha256: digest, derivativeByteLength: fixtureBytes.length, derivedContentType: 'audio/ogg' } },
  upload: { sha256: digest, fileByteLength: fixtureBytes.length, initialVisibility: 'hidden',
    offlinePreparationGrantsConsent: false, request: { memoryId, operationId: 'firstlife_fictional', kind: 'audio', contentType: 'audio/ogg' } },
} }
const file = (data = fixtureBytes) => ({ size: data.length, type: 'audio/ogg', arrayBuffer: async () => data.slice().buffer })
function fixture() {
  const lifecycle = { signal: new AbortController().signal, isCurrent: () => true }
  let createCalls = 0, uploadCalls = 0, recoverReads = 0, failUpload = false, tamperReceipt = false, swapOnCreate = false, changeOnRead = false
  let authTime = Math.floor(Date.now() / 1000)
  const owner = { uid, getIdTokenResult: async () => ({ claims: { auth_time: authTime } }) }
  const auth = { currentUser: owner }
  const stored = { ownerId: uid, deleted: false, privacy: 'hidden', consentState: 'authorized',
    sourceMedia: [], sourceProvenance: { ...packet().memory.sourceProvenance },
    firstPrivateMemoryConsent: { status: 'explicit-owner-confirmation', ownerId: uid, memoryId,
      derivativeSha256: digest, canonicalConsentReceiptHash: 'd'.repeat(64), consentRevision: 4 } }
  const module = { exports: {} }
  const dependencies = {
    'firebase/functions': { httpsCallable: () => async () => {
      createCalls++
      if (swapOnCreate) auth.currentUser = { uid }
      return { data: { memoryId, ownerId: uid, visibility: 'hidden', state: 'created-without-media' } }
    } },
    'firebase/firestore': {
      doc: (_db, ...parts) => { assert.deepEqual(parts, ['users', uid, 'memories', memoryId]); return { parts } },
      getDocFromServer: async () => { recoverReads++; if (changeOnRead) auth.currentUser = { uid }
        return { exists: () => true, data: () => stored } },
    },
    '@/lib/firebase/client': { getUraiAuth: () => auth, getFirebaseDb: () => ({}), firebasePublicEnvReady: true, functions: {} },
    '@/lib/privacy/ownedMemoryMediaClient': {
      MEMORY_MEDIA_MAX_BYTES: 4 * 1024 * 1024,
      attachOwnedMemoryFile: async (memory, selected, lifetime, operationId, expectedSha) => {
        uploadCalls++
        assert.equal(memory.id, memoryId); assert.equal(memory.privacy, 'hidden')
        assert.equal(operationId, 'firstlife_fictional'); assert.equal(expectedSha, digest)
        if (failUpload) throw Error('FICTIONAL_NETWORK_FAILURE')
        return { memoryId: tamperReceipt ? 'other' : memoryId, receiptId: sha }
      },
    },
  }
  const load = vm.runInNewContext('(function(exports, require, module) { ' + js + '\n})', {
    crypto: webcrypto, Uint8Array, Date, DOMException, Object, Array, Number, Error,
  })
  load(module.exports, key => { assert.ok(key in dependencies, key); return dependencies[key] }, module)
  const importer = module.exports.importFirstPreparedMemory
  const recover = module.exports.resumeFirstPreparedMemoryUpload
  return { importer, recover, stored, lifecycle, packet: packet(), file: file(),
    setAuthTime: value => { authTime = value }, setSwap: () => { swapOnCreate = true },
    setFailUpload: (value = true) => { failUpload = value }, setTamperReceipt: () => { tamperReceipt = true },
    swapOnRead: () => { changeOnRead = true },
    abort: () => { lifecycle.isCurrent = () => false },
    stats: () => ({ createCalls, uploadCalls, recoverReads }), module }
}
test('verified fictional bytes create one hidden memory and upload only after real callable result', async () => {
  const f = fixture()
  const result = await f.importer(f.packet, f.file, true, f.lifecycle)
  assert.equal(result.state, 'ready-but-hidden'); assert.equal(result.visibility, 'hidden')
  assert.equal(f.stats().createCalls, 1); assert.equal(f.stats().uploadCalls, 1)
})
test('no per-memory explicit confirmation means no server write', async () => {
  const f = fixture()
  await assert.rejects(f.importer(f.packet, f.file, false, f.lifecycle), /FIRST_MEMORY_EXPLICIT_OWNER_CONFIRMATION_REQUIRED/)
  assert.equal(f.stats().createCalls, 0)
})
test('wrong selected file hash cannot create an orphan hidden memory', async () => {
  const f = fixture()
  const changed = new TextEncoder().encode('different fictional media with same length')
  const wrongFile = { size: f.file.size, type: f.file.type, arrayBuffer: async () => changed.buffer }
  await assert.rejects(f.importer(f.packet, wrongFile, true, f.lifecycle), /FIRST_MEMORY_SELECTED_FILE_CHANGED|FIRST_MEMORY_SELECTED_FILE_FIXITY_MISMATCH/)
  assert.equal(f.stats().createCalls, 0)
})
test('owner forged in packet is rejected before network', async () => {
  const f = fixture(); f.packet.memory.ownerId = 'foreignOwner'
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), /FIRST_MEMORY_PREPARED_PACKET_INVALID/)
  assert.equal(f.stats().createCalls, 0)
})
test('pre-attached media is rejected before network', async () => {
  const f = fixture(); f.packet.memory.sourceMedia = [{ leaked: 'source' }]
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), /FIRST_MEMORY_PREPARED_PACKET_INVALID/)
  assert.equal(f.stats().createCalls, 0)
})
test('recent login cannot be replaced by token refresh alone', async () => {
  const f = fixture(); f.setAuthTime(Math.floor(Date.now()/1000) - 600)
  let reads = 0
  const selected = { ...f.file, arrayBuffer: async () => { reads++; return fixtureBytes.slice().buffer } }
  await assert.rejects(f.importer(f.packet, selected, true, f.lifecycle), /FIRST_MEMORY_RECENT_REAUTH_REQUIRED/)
  assert.equal(reads, 0, 'stale authentication may not read private local media')
  assert.equal(f.stats().createCalls, 0)
})
test('actor switch during callable prevents protected upload', async () => {
  const f = fixture(); f.setSwap()
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), error => error.name === 'AbortError')
  assert.equal(f.stats().uploadCalls, 0)
})
test('failed media upload preserves hidden-memory identity for recovery', async () => {
  const f = fixture(); f.setFailUpload()
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), error => {
    assert.equal(error.name, 'FirstPrivateMemoryUploadIncomplete')
    assert.equal(error.memoryId, memoryId)
    return true
  })
  assert.equal(f.stats().createCalls, 1); assert.equal(f.stats().uploadCalls, 1)
})
test('foreign or changed receipt fails after creation without claiming completed import', async () => {
  const f = fixture(); f.setTamperReceipt()
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), error => error.name === 'FirstPrivateMemoryUploadIncomplete')
  assert.equal(f.stats().uploadCalls, 1)
})
test('cancelled lifecycle does not create or upload', async () => {
  const f = fixture(); f.abort()
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), error => error.name === 'AbortError')
  assert.equal(f.stats().createCalls, 0)
})

test('recovery reads existing hidden record and never recreates memory', async () => {
  const f = fixture()
  const r = await f.recover(f.packet, f.file, true, f.lifecycle, memoryId)
  assert.equal(r.state, 'ready-but-hidden')
  assert.deepEqual(f.stats(), { createCalls: 0, uploadCalls: 1, recoverReads: 1 })
})
test('recovery confirmation and exact memory identity are mandatory', async () => {
  const f = fixture()
  await assert.rejects(f.recover(f.packet, f.file, false, f.lifecycle, memoryId), /FIRST_MEMORY_EXPLICIT_OWNER_CONFIRMATION_REQUIRED/)
  await assert.rejects(f.recover(f.packet, f.file, true, f.lifecycle, 'differentMemory'), /FIRST_MEMORY_RECOVERY_ID_MISMATCH/)
  assert.equal(f.stats().recoverReads, 0)
  assert.equal(f.stats().uploadCalls, 0)
})
test('foreign, revoked, deleted, activated, mismatched-source records cannot be recovered', async () => {
  for (const mutate of [
    s => { s.ownerId = 'foreign' }, s => { s.deleted = true }, s => { s.consentState = 'revoked' },
    s => { s.privacy = 'private' }, s => { s.firstPrivateMemoryActivation = { status: 'explicit-owner-private-replay' } },
    s => { s.sourceProvenance.derivativeSha256 = 'f'.repeat(64) },
    s => { s.sourceProvenance.originalSha256 = 'f'.repeat(64) },
    s => { s.firstPrivateMemoryConsent.ownerId = 'foreign' },
    s => { s.sourceMedia = [{ kind: 'video', mediaReceiptId: 'a'.repeat(64) }] },
  ]) {
    const f = fixture(); mutate(f.stored)
    await assert.rejects(f.recover(f.packet, f.file, true, f.lifecycle, memoryId), /FIRST_MEMORY_RECOVERY_NOT_AUTHORIZED/)
    assert.equal(f.stats().uploadCalls, 0); assert.equal(f.stats().createCalls, 0)
  }
})
test('stale reauthentication refuses private recovery before reading bytes', async () => {
  const f = fixture(); f.setAuthTime(Math.floor(Date.now()/1000)-600)
  let reads=0
  const selected={ ...f.file, arrayBuffer:()=>{ reads++; return fixtureBytes.slice().buffer } }
  await assert.rejects(f.recover(f.packet, selected, true, f.lifecycle, memoryId), /FIRST_MEMORY_RECENT_REAUTH_REQUIRED/)
  assert.equal(reads, 0); assert.equal(f.stats().recoverReads, 0)
})
test('owner session switch while loading stored memory aborts protected upload', async () => {
  const f=fixture(); f.swapOnRead()
  await assert.rejects(f.recover(f.packet, f.file, true, f.lifecycle, memoryId), e=>e.name==='AbortError')
  assert.equal(f.stats().uploadCalls, 0)
})
test('existing matching audio receipt is never recreated by recovery', async () => {
  const f=fixture(); f.stored.sourceMedia=[{kind:'audio',mediaReceiptId:'a'.repeat(64)}]
  const r=await f.recover(f.packet, f.file, true, f.lifecycle, memoryId)
  assert.equal(r.state,'ready-but-hidden'); assert.equal(f.stats().createCalls,0)
})
test('retry upload failure does not fall back to memory creation', async () => {
  const f=fixture(); f.setFailUpload()
  await assert.rejects(f.recover(f.packet, f.file, true, f.lifecycle, memoryId), e=>e.name==='FirstPrivateMemoryUploadIncomplete')
  assert.equal(f.stats().createCalls,0); assert.equal(f.stats().uploadCalls,1)
})
