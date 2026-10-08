import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash, webcrypto } from 'node:crypto'
import test from 'node:test'
const require = createRequire(import.meta.url), ts = require('typescript')
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
const code = compile(fs.readFileSync('src/lib/privacy/ownedMemoryMediaClient.ts', 'utf8'))
const componentCode = compile(fs.readFileSync('src/spatial/memory/MemoryMediaAttachment.tsx', 'utf8'))
const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
const digest = createHash('sha256').update(bytes).digest('hex')
const memory = { id: 'synthetic-memory', ownerId: 'synthetic-owner', privacy: 'private' }
function fixture() {
  const state = { calls: [], tokens: [], fileReads: 0 }, auth = {}, control = {}, app = {}
  const user = { uid: memory.ownerId, getIdTokenResult: async force => {
    state.tokens.push(force); await control.token?.(); return { claims: { auth_time: control.authTime ?? Math.floor(Date.now() / 1000) } }
  } }; auth.currentUser = user
  const authority = { schemaVersion: 'urai-owned-memory-media-v1', ownerId: memory.ownerId, memoryId: memory.id, consentRevision: 4, expiresAt: Date.now() + 30000 }
  const receipt = { memoryId: memory.id, receiptId: 'a'.repeat(64), state: 'ready', sha256: digest, byteLength: bytes.length, contentType: 'image/png' }
  const imports = { 'firebase/auth': { getAuth: () => auth }, '@/lib/firebase/client': { app, firebasePublicEnvReady: true, functions: {} },
    'firebase/functions': { httpsCallable: (_functions, name) => async payload => {
      state.calls.push({ name, payload }); await control[name]?.(payload)
      return { data: name === 'getMemoryMediaUploadAuthority' ? { ...authority } : { ...receipt } }
    } } }
  const result = {}, context = { exports: result, require: name => { assert.ok(name in imports); return imports[name] },
    DOMException, Uint8Array, Date, btoa, navigator: { onLine: true }, crypto: { randomUUID: () => webcrypto.randomUUID(),
      subtle: { digest: async (...args) => { await control.digest?.(); return webcrypto.subtle.digest(...args) } } } }
  vm.runInNewContext(code, context)
  const file = { type: 'image/png', size: bytes.length, arrayBuffer: async () => { state.fileReads++; await control.file?.(); return bytes.buffer.slice(0) } }
  const controller = new AbortController(), lifecycle = { signal: controller.signal, isCurrent: () => true }
  return { state, auth, user, control, authority, receipt, context, file, controller, lifecycle, run: (m = memory, f = file) => result.attachOwnedMemoryFile(m, f, lifecycle, 'synthetic-stable-operation') }
}
test('actual client checks C1 and recent owner before file bytes, then confirms the server-computed checksum without exposing an object locator', async () => {
  const f = fixture(); const result = await f.run()
  assert.equal(result.receiptId, f.receipt.receiptId)
  assert.deepEqual(f.state.tokens, [true, true]); assert.equal(f.state.fileReads, 1)
  assert.deepEqual(f.state.calls.map(c => c.name), ['getMemoryMediaUploadAuthority', 'getMemoryMediaUploadAuthority', 'registerMemoryMedia'])
  assert.equal(f.state.calls[2].payload.operationId, 'synthetic-stable-operation')
  assert.deepEqual(Buffer.from(f.state.calls[2].payload.base64, 'base64'), Buffer.from(bytes))
  assert.doesNotMatch(JSON.stringify(result), /https?:|gs:|token|objectPath/)
})
for (const authTime of [0, '1234', Math.floor(Date.now() / 1000) + 60, Math.floor(Date.now() / 1000) - 400]) {
  test('recent-authentication denial before reading any private file: ' + authTime, async () => {
    const f = fixture(); f.control.authTime = authTime; await assert.rejects(f.run(), /RECENT_AUTHENTICATION_REQUIRED/)
    assert.equal(f.state.fileReads, 0); assert.equal(f.state.calls.length, 0)
  })
}
for (const [label, change] of [
  ['foreign owner', f => { f.authority.ownerId = 'foreign-owner' }], ['foreign memory', f => { f.authority.memoryId = 'foreign-memory' }],
  ['missing C1', f => { f.control.getMemoryMediaUploadAuthority = () => { throw new Error('C1 denied') } }],
  ['expired C1', f => { f.authority.expiresAt = Date.now() - 1 }],
]) test('actual preflight denies ' + label + ' before encoding private file bytes', async () => {
  const f = fixture(); change(f); await assert.rejects(f.run()); assert.equal(f.state.fileReads, 0)
  assert.equal(f.state.calls.some(c => c.name === 'registerMemoryMedia'), false)
})
for (const phase of ['token', 'getMemoryMediaUploadAuthority', 'file', 'digest', 'registerMemoryMedia']) {
  for (const reason of ['actor', 'abort']) test('current session fences ' + reason + ' during ' + phase, async () => {
    const f = fixture(); let resolve, reached
    const stage = new Promise(done => { reached = done })
    f.control[phase] = () => new Promise(done => { resolve = done; reached() })
    const pending = f.run(); await stage
    if (reason === 'actor') f.auth.currentUser = { uid: 'other-owner' }; else f.controller.abort()
    resolve(); await assert.rejects(pending, e => e.name === 'AbortError')
    assert.equal(f.state.calls.filter(c => c.name === 'registerMemoryMedia').length, phase === 'registerMemoryMedia' ? 1 : 0)
  })
}
test('changed current consent revision after local encoding cannot submit private bytes', async () => {
  const f = fixture(); f.control.file = () => { f.authority.consentRevision++ }
  await assert.rejects(f.run(), /MEMORY_MEDIA_AUTHORITY_CHANGED/); assert.equal(f.state.calls.some(c => c.name === 'registerMemoryMedia'), false)
})
for (const selected of [{ ...memory, demo: true }, { ...memory, privacy: 'shareable' }, { ...memory, ownerId: 'other-owner' }]) {
  test('demo, shared, or foreign selection is never a private upload authority ' + JSON.stringify(selected), async () => {
    const f = fixture(); await assert.rejects(f.run(selected), /PRIVATE_MEMORY_REQUIRED/); assert.equal(f.state.fileReads, 0); assert.equal(f.state.calls.length, 0)
  })
}
for (const file of [{ size: 4 * 1024 * 1024 + 1, type: 'image/png' }, { size: 11, type: 'image/svg+xml' }, { size: 0, type: 'image/png' }]) {
  test('file ceiling and MIME reject before any network request ' + JSON.stringify(file), async () => {
    const f = fixture(); await assert.rejects(f.run(memory, { ...f.file, ...file }), /FILE_TYPE_OR_SIZE_UNSUPPORTED/); assert.equal(f.state.calls.length, 0)
  })
}
test('untrusted receipt or locator cannot be represented as confirmed attachment', async () => {
  for (const change of [r => { r.sha256 = 'b'.repeat(64) }, r => { r.url = 'https://synthetic.invalid/private' }, r => { r.memoryId = 'foreign-memory' }]) {
    const f = fixture(); change(f.receipt); await assert.rejects(f.run(), /MEMORY_MEDIA_RECEIPT_INVALID/)
  }
})
function componentFixture() {
  const states = [], refs = [], effects = [], state = { calls: [], auth: null }; let stateIndex, refIndex, effectIndex
  const jsx = (type, props) => ({ type, props })
  const imports = { react: {
    useState(initial) { const i = stateIndex++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
    useRef(initial) { const i = refIndex++; return refs[i] ??= { current: initial } },
    useEffect(callback, deps) { const i = effectIndex++; if (effects[i] && JSON.stringify(effects[i].deps) === JSON.stringify(deps)) return; effects[i]?.cleanup?.(); effects[i] = { deps, cleanup: callback() } },
  }, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'firebase/auth': { getAuth: () => ({}), onAuthStateChanged: (_auth, callback) => { state.auth = callback; callback({ uid: memory.ownerId }); return () => {} } },
    '@/lib/firebase/client': { app: {}, firebasePublicEnvReady: true },
    '@/lib/privacy/ownedMemoryMediaClient': { MEMORY_MEDIA_TYPES: 'image/png', attachOwnedMemoryFile: async (...args) => { state.calls.push(args); return state.pending?.() } } }
  const result = {}; vm.runInNewContext(componentCode, { exports: result, require: name => { assert.ok(name in imports); return imports[name] }, AbortController, Error, crypto: webcrypto })
  const render = (selection = memory) => { stateIndex = 0; refIndex = 0; effectIndex = 0; return result.default({ memory: selection }) }
  const find = (tree, type) => tree?.type === type ? tree : (Array.isArray(tree?.props?.children) ? tree.props.children : [tree?.props?.children]).filter(Boolean).map(t => find(t, type)).find(Boolean)
  render(); let tree = render()
  find(tree, 'input').props.onChange({ currentTarget: { files: [new Blob([bytes])] } }); tree = render()
  return { states, refs, state, effects, render, attach: () => find(tree, 'button').props.onClick() }
}
for (const phase of ['actor', 'unmount', 'selection']) {
  for (const fail of [false, true]) test('actual mounted control suppresses stale completion/error after ' + phase + ' ' + fail, async () => {
    const f = componentFixture(); let resolve, reject
    f.state.pending = () => new Promise((done, no) => { resolve = done; reject = no })
    const pending = f.attach(); assert.equal(f.state.calls.length, 1)
    if (phase === 'actor') f.state.auth({ uid: 'other-owner' })
    if (phase === 'unmount') f.effects[0].cleanup()
    if (phase === 'selection') f.render({ ...memory, id: 'other-memory' })
    const before = [...f.states]; assert.equal(f.state.calls[0][2].signal.aborted, true)
    if (fail) reject(new Error('late previous-owner failure')); else resolve({ receiptId: 'a'.repeat(64) })
    await pending; assert.deepEqual(f.states, before)
  })
}
test('Focus mounts the real file control only for an owned selected private memory and retains accurate preview copy', () => {
  const source = fs.readFileSync('src/app/focus/FocusChamberClient.tsx', 'utf8')
  const ast = ts.createSourceFile('Focus.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const mounts = []; const visit = node => { if (ts.isConditionalExpression(node) && node.whenTrue.getText(ast).includes('<MemoryMediaAttachment ')) mounts.push(node); ts.forEachChild(node, visit) }; visit(ast)
  assert.equal(mounts.length, 1)
  assert.match(mounts[0].condition.getText(ast), /memory && !memory.demo && memory.privacy === 'private' && memory.authorization === 'owner'/)
  assert.match(fs.readFileSync('src/spatial/memory/MemoryMediaAttachment.tsx', 'utf8'), /Preview is not available here/)
})
