import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import vm from 'node:vm'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/lib/privacy/ownedMemoryMediaClient.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const rawBytes = Uint8Array.from(Buffer.from('OggSOpusHead\0Synthetic recording only'))
const digest = createHash('sha256').update(rawBytes).digest('hex')
const operation = 'firstlife_' + 'a'.repeat(40)
const uid = 'fictionalOwner', memoryId = 'fictionalMemory'
function fixture() {
  const state = { calls: [], fileReads: 0, authorityReads: 0, failAuthority: false, switchOnAuthority: false, changeRevision: false }
  const owner = { uid, getIdTokenResult: async () => ({ claims: { auth_time: state.authTime ?? Math.floor(Date.now() / 1000) } }) }
  const auth = { currentUser: owner }
  const authority = { schemaVersion: 'urai-owned-memory-media-v1', ownerId: uid, memoryId, consentRevision: 4, expiresAt: Date.now() + 90000 }
  const receipt = { memoryId, receiptId: 'b'.repeat(64), state: 'ready', sha256: digest, byteLength: rawBytes.byteLength, contentType: 'audio/ogg' }
  const modules = {
    'firebase/auth': { getAuth: () => auth },
    '@/lib/firebase/client': { app: {}, functions: {}, firebasePublicEnvReady: true },
    'firebase/functions': { httpsCallable: (_app, name) => async payload => {
      state.calls.push({ name, payload })
      if (name === 'getMemoryMediaUploadAuthority') {
        state.authorityReads++
        if (state.failAuthority) throw Error('CURRENT_C1_DENIED')
        if (state.switchOnAuthority) auth.currentUser = { uid: 'foreignOwner' }
        if (state.changeRevision && state.authorityReads === 2) authority.consentRevision++
        return { data: { ...authority } }
      }
      return { data: { ...receipt } }
    } },
  }
  const exports = {}
  vm.runInNewContext(compiled, {
    exports, require: id => { assert.ok(id in modules, `unexpected imported module: ${id}`); return modules[id] },
    Date, Uint8Array, Buffer, DOMException, btoa,
    crypto: { randomUUID: () => 'only-private-test', subtle: webcrypto.subtle },
    navigator: { onLine: true },
  })
  const hidden = { id: memoryId, ownerId: uid, privacy: 'hidden' }
  const file = { size: rawBytes.byteLength, type: 'audio/ogg', arrayBuffer: async () => { state.fileReads++; return rawBytes.slice().buffer } }
  const life = { signal: new AbortController().signal, isCurrent: () => true }
  const run = (memory = hidden, source = file, op = operation, expected = digest) => exports.attachOwnedMemoryFile(memory, source, life, op, expected)
  return { run, hidden, file, life, owner, auth, state, receipt, authority }
}

test('valid exact hidden first-life upload gets current authority twice and verifies ready receipt', async () => {
  const f=fixture(), r=await f.run()
  assert.equal(r.receiptId, f.receipt.receiptId)
  assert.equal(f.state.fileReads,1)
  assert.equal(f.state.authorityReads,2)
  assert.deepEqual(f.state.calls.map(c=>c.name), ['getMemoryMediaUploadAuthority','getMemoryMediaUploadAuthority','registerMemoryMedia'])
  assert.equal(f.state.calls[2].payload.operationId, operation)
  assert.equal(f.state.calls[2].payload.kind, 'audio')
  assert.deepEqual(Buffer.from(f.state.calls[2].payload.base64,'base64'), Buffer.from(rawBytes))
})
for (const [name,op,expected] of [
  ['missing deterministic operation', null, digest],
  ['ordinary operation', 'memory-media-ordinary', digest],
  ['wrong-shaped firstlife operation', 'firstlife_abc', digest],
  ['missing prepared digest', operation, null],
  ['malformed prepared digest', operation, 'wrong'],
]) {
  test(`hidden memory rejects ${name} before any network or local bytes`, async () => {
    const f=fixture()
    await assert.rejects(f.run(f.hidden,f.file,op,expected),/FIRST_PRIVATE_MEDIA_PREPARED_AUTHORITY_REQUIRED/)
    assert.equal(f.state.calls.length,0)
    assert.equal(f.state.fileReads,0)
  })
}
test('prepared digest mismatch blocks upload before receipt registration', async () => {
  const f=fixture()
  await assert.rejects(f.run(f.hidden,f.file,operation,'f'.repeat(64)), /PREPARED_MEDIA_FIXITY_CHANGED/)
  assert.equal(f.state.fileReads,1)
  assert.equal(f.state.calls.some(c=>c.name==='registerMemoryMedia'),false)
})
test('ordinary private media upload remains backwards compatible', async () => {
  const f=fixture(); const r=await f.run({...f.hidden,privacy:'private'},f.file,'ordinary_operation_1',undefined)
  assert.equal(r.memoryId,memoryId)
  assert.equal(f.state.calls.at(-1).payload.operationId,'ordinary_operation_1')
})
for (const target of [
  {privacy:'shareable'}, {privacy:'public'}, {ownerId:'foreignOwner'}, {demo:true}
]) {
  test(`invalid selection ${JSON.stringify(target)} cannot initiate upload`,async()=>{
    const f=fixture()
    await assert.rejects(f.run({...f.hidden,...target}),/PRIVATE_MEMORY_REQUIRED/)
    assert.equal(f.state.calls.length,0)
  })
}
test('no current authenticated owner denies before reading bytes',async()=>{
  const f=fixture();f.auth.currentUser=null
  await assert.rejects(f.run(),/PRIVATE_MEMORY_REQUIRED/)
  assert.equal(f.state.fileReads,0)
})
test('stale owner session cannot read media or request C1',async()=>{
  const f=fixture();f.state.authTime=Math.floor(Date.now()/1000)-600
  await assert.rejects(f.run(),/RECENT_AUTHENTICATION_REQUIRED/)
  assert.equal(f.state.fileReads,0); assert.equal(f.state.calls.length,0)
})
test('revoked C1 denies before selected-file read',async()=>{
  const f=fixture();f.state.failAuthority=true
  await assert.rejects(f.run(),/CURRENT_C1_DENIED/)
  assert.equal(f.state.fileReads,0)
})
test('actor changes during fresh C1 check abort protected upload',async()=>{
  const f=fixture();f.state.switchOnAuthority=true
  await assert.rejects(f.run(),e=>e.name==='AbortError')
  assert.equal(f.state.fileReads,0)
  assert.equal(f.state.calls.some(c=>c.name==='registerMemoryMedia'),false)
})
test('consent revision changes during preparation prevent source upload',async()=>{
  const f=fixture();f.state.changeRevision=true
  await assert.rejects(f.run(),/MEMORY_MEDIA_AUTHORITY_CHANGED/)
  assert.equal(f.state.calls.some(c=>c.name==='registerMemoryMedia'),false)
})
test('wrong checksum or foreign receipt cannot be confirmed',async()=>{
  for(const key of ['sha256','memoryId']){
    const f=fixture();f.receipt[key]=key==='sha256'?'e'.repeat(64):'foreignMemory'
    await assert.rejects(f.run(),/MEMORY_MEDIA_RECEIPT_INVALID/)
  }
})
test('unsolicited private source URLs fail receipt contract',async()=>{
  const f=fixture();f.receipt.url='https://test.invalid/media'
  await assert.rejects(f.run(),/MEMORY_MEDIA_RECEIPT_INVALID/)
})
test('source is parseable TypeScript and hidden exception stays purpose-specific',()=>{
  const ast=ts.createSourceFile('ownedMemoryMediaClient.ts',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TS)
  assert.equal(ast.parseDiagnostics.length,0)
  assert.match(source,/memory\.privacy === 'hidden'/)
  assert.match(source,/firstlife_\[a-f0-9\]\{40\}/)
  assert.match(source,/checksum !== expectedPreparedSha256/)
})
