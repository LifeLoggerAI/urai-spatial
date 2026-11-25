import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
const source = fs.readFileSync(new URL('../src/lib/firebase/ownerProfile.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function fixture() {
  const owner = { uid: 'synthetic-owner' }, auth = { currentUser: owner }, calls = []
  let complete, reject
  const server = new Promise((resolve, fail) => { complete = resolve; reject = fail })
  const exports = {}
  vm.runInNewContext(code, { exports, require(name) {
    if (name === './client') return { getUrAiAuth: () => auth, getFirebaseDb: () => 'test-db' }
    if (name === 'firebase/firestore') return { doc: (...args) => args, setDoc: (...args) => { calls.push(args); return server } }
    throw new Error(name)
  } })
  return { owner, auth, calls, complete, reject, ensure: exports.ensureOwnerProfile }
}
test('enrollment merges only identity and waits for server acceptance', async () => {
  const f = fixture(); let ready = false
  const operation = f.ensure(f.owner).then(() => { ready = true })
  await Promise.resolve(); assert.equal(ready, false)
  assert.deepEqual(JSON.parse(JSON.stringify(f.calls)), [[['test-db', 'users', 'synthetic-owner'], { uid: 'synthetic-owner' }, { merge: true }]])
  f.complete(); await operation; assert.equal(ready, true)
})
test('simultaneous enrollment shares one write', async () => {
  const f = fixture(), first = f.ensure(f.owner), second = f.ensure(f.owner)
  assert.equal(first, second); assert.equal(f.calls.length, 1)
  f.complete(); await first
})
test('another owner cannot initiate enrollment', async () => {
  const f = fixture()
  await assert.rejects(f.ensure({ uid: 'other' }), /ACCOUNT_CHANGED/)
  assert.equal(f.calls.length, 0)
})
test('sign-out during enrollment cannot report ready', async () => {
  const f = fixture(), operation = f.ensure(f.owner)
  f.auth.currentUser = null; f.complete()
  await assert.rejects(operation, /ACCOUNT_CHANGED/)
})
test('server rejection propagates and clears the in-flight operation', async () => {
  const f = fixture(), operation = f.ensure(f.owner)
  f.reject(new Error('permission-denied'))
  await assert.rejects(operation, /permission-denied/)
  await assert.rejects(f.ensure(f.owner), /permission-denied/)
  assert.equal(f.calls.length, 2)
})
