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
    sourceProvenance: { derivativeSha256: digest, derivativeByteLength: fixtureBytes.length, derivedContentType: 'audio/ogg' } },
  upload: { sha256: digest, fileByteLength: fixtureBytes.length, initialVisibility: 'hidden',
    offlinePreparationGrantsConsent: false, request: { memoryId, operationId: 'firstlife_fictional', kind: 'audio', contentType: 'audio/ogg' } },
} }
const file = (data = fixtureBytes) => ({ size: data.length, type: 'audio/ogg', arrayBuffer: async () => data.slice().buffer })
function fixture() {
  const lifecycle = { signal: new AbortController().signal, isCurrent: () => true }
  let createCalls = 0, uploadCalls = 0, failUpload = false, tamperReceipt = false, swapOnCreate = false
  let authTime = Math.floor(Date.now() / 1000)
  const owner = { uid, getIdTokenResult: async () => ({ claims: { auth_time: authTime } }) }
  const auth = { currentUser: owner }
  const module = { exports: {} }
  const dependencies = {
    'firebase/functions': { httpsCallable: () => async () => {
      createCalls++
      if (swapOnCreate) auth.currentUser = { uid }
      return { data: { memoryId, ownerId: uid, visibility: 'hidden', state: 'created-without-media' } }
    } },
    '@/lib/firebase/client': { getUraiAuth: () => auth, firebasePublicEnvReady: true, functions: {} },
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
  return { importer, lifecycle, packet: packet(), file: file(),
    setAuthTime: value => { authTime = value }, setSwap: () => { swapOnCreate = true },
    setFailUpload: () => { failUpload = true }, setTamperReceipt: () => { tamperReceipt = true },
    abort: () => { lifecycle.isCurrent = () => false },
    stats: () => ({ createCalls, uploadCalls }), module }
}
test('verified fictional bytes create one hidden memory and upload only after real callable result', async () => {
  const f = fixture()
  const result = await f.importer(f.packet, f.file, true, f.lifecycle)
  assert.equal(result.state, 'ready-but-hidden'); assert.equal(result.visibility, 'hidden')
  assert.deepEqual(f.stats(), { createCalls: 1, uploadCalls: 1 })
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
  await assert.rejects(f.importer(f.packet, f.file, true, f.lifecycle), /FIRST_MEMORY_RECENT_REAUTH_REQUIRED/)
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
  assert.deepEqual(f.stats(), { createCalls: 1, uploadCalls: 1 })
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
