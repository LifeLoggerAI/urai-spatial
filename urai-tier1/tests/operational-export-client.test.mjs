import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash, webcrypto } from 'node:crypto'
import test from 'node:test'
const require = createRequire(import.meta.url), ts = require('typescript')
const transpile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const helperCode = transpile(fs.readFileSync('src/lib/privacy/authorizedExportDownload.ts', 'utf8'))
const bridgeCode = transpile(fs.readFileSync('src/lib/privacy/operationalPrivacyClient.ts', 'utf8'))
const request = { jobId: 'synthetic-job' }, bytes = new TextEncoder().encode('{"synthetic":true}')
function fixture() {
  const state = { calls: [], tokens: [], fetches: 0, saves: [], messages: [] }, auth = { currentUser: null }, app = { options: { projectId: 'urai-4dc1d' } }
  const user = { uid: 'synthetic-owner', getIdToken: async force => { state.tokens.push(force); return 'synthetic-token' } }; auth.currentUser = user
  const expiry = Date.now() + 30_000
  const descriptor = { schemaVersion: 'urai-spatial-export-download-v1', requiresAuthorization: true, ownerId: user.uid, jobId: request.jobId, file: 'export', assetId: null, downloadExpiresAt: expiry, packageExpiresAt: expiry + 30_000, checksum: createHash('sha256').update(bytes).digest('hex'), contentType: 'application/json', byteLength: bytes.length, storageGeneration: '1234', url: 'https://us-central1-urai-4dc1d.cloudfunctions.net/downloadOperationalExportPackage?jobId=synthetic-job&file=export&expiresAt=' + expiry + '&authorityHash=' + 'a'.repeat(64) }
  const helper = {}, api = { onCallable: async () => descriptor }
  class DownloadURL extends URL { static createObjectURL() { return 'blob:synthetic' } static revokeObjectURL() {} }
  const context = { exports: helper, URL: DownloadURL, DOMException, AbortController, Uint8Array, crypto: webcrypto, Blob, Date, setTimeout, clearTimeout,
    document: { createElement() { return { click() { state.saves.push('file') }, remove() {} } }, body: { appendChild() {} } },
    fetch: async () => { state.fetches++; return new Response(bytes, { headers: { 'Content-Type': 'application/json' } }) } }
  vm.runInNewContext(helperCode, context)
  const bridge = {}, imports = {
    'firebase/firestore': {}, 'firebase/auth': { getAuth: () => auth },
    'firebase/functions': { httpsCallable: (_functions, name) => async payload => { state.calls.push({ name, payload }); return { data: await api.onCallable(name, payload) } } },
    '@/lib/firebase/client': { app, firebasePublicEnvReady: true, functions: {}, getFirebaseDb: () => ({}) },
    './authorizedExportDownload': helper,
  }
  vm.runInNewContext(bridgeCode, { exports: bridge, require: name => { assert.ok(name in imports, name); return imports[name] }, DOMException, crypto: webcrypto })
  return { state, auth, user, descriptor, api, helper, bridge, context }
}
test('actual Firebase wrapper uses Spatial namespaces and forces a current ID token', async () => {
  const f = fixture(), controller = new AbortController()
  const result = await f.bridge.downloadOperationalExportBytes(request, { signal: controller.signal, isCurrent: () => true })
  assert.equal(await result.blob.text(), new TextDecoder().decode(bytes))
  assert.deepEqual(f.state.tokens, [true]); assert.equal(f.state.fetches, 1)
  await f.bridge.createOperationalExportRequest(['consent'], 'synthetic-export')
  await f.bridge.cancelOperationalExportRequest(request.jobId)
  await f.bridge.createOperationalDeletionRequest({ scope: 'memories', confirmation: 'DELETE', operationId: 'synthetic-deletion' })
  await f.bridge.cancelOperationalDeletionRequest('synthetic-deletion')
  assert.deepEqual(f.state.calls.map(x => x.name), ['getOperationalExportDownloadUrl', 'createSpatialExportRequest', 'cancelSpatialExportRequest', 'createSpatialDeletionRequest', 'cancelSpatialDeletionRequest'])
})
for (const timing of ['descriptor', 'token']) test('actual wrapper rejects account change during ' + timing, async () => {
  const f = fixture(); let resolve, reached
  const stage = new Promise(done => { reached = done })
  const defer = () => new Promise(done => { resolve = done; reached() })
  if (timing === 'descriptor') f.api.onCallable = defer
  else f.user.getIdToken = defer
  const pending = f.bridge.downloadOperationalExportBytes(request, { signal: new AbortController().signal, isCurrent: () => true })
  await stage
  assert.equal(typeof resolve, 'function'); f.auth.currentUser = { uid: 'new-owner' }; resolve(timing === 'descriptor' ? f.descriptor : 'late-token')
  await assert.rejects(pending, error => error.name === 'AbortError'); assert.equal(f.state.fetches, 0)
})
test('actual wrapper rejects descriptor for another owner before token refresh', async () => {
  const f = fixture(); f.api.onCallable = async () => ({ ...f.descriptor, ownerId: 'other-owner' })
  await assert.rejects(f.bridge.downloadOperationalExportBytes(request, { signal: new AbortController().signal, isCurrent: () => true }), /AUTH_REQUIRED/)
  assert.equal(f.state.tokens.length, 0); assert.equal(f.state.fetches, 0)
})
test('actual wrapper rejects forged endpoint before token refresh', async () => {
  const f = fixture(); f.api.onCallable = async () => ({ ...f.descriptor, url: 'https://untrusted.invalid/private' })
  await assert.rejects(f.bridge.downloadOperationalExportBytes(request, { signal: new AbortController().signal, isCurrent: () => true }), /INVALID_EXPORT_DESCRIPTOR/)
  assert.equal(f.state.tokens.length, 0); assert.equal(f.state.fetches, 0)
})
test('actual wrapper stops on cancellation while waiting for descriptor', async () => {
  const f = fixture(), controller = new AbortController(); let resolve
  f.api.onCallable = () => new Promise(done => { resolve = done })
  const pending = f.bridge.downloadOperationalExportBytes(request, { signal: controller.signal, isCurrent: () => true })
  controller.abort(); resolve(f.descriptor)
  await assert.rejects(pending, error => error.name === 'AbortError'); assert.equal(f.state.tokens.length, 0); assert.equal(f.state.fetches, 0)
})
for (const [name, path, stateKey] of [['Passport', 'passport/PassportVaultClient.tsx', 'state'], ['Consent', 'privacy-controls/ConsentSanctuaryClient.tsx', 'loadState']]) {
  const source = fs.readFileSync('src/app/' + path, 'utf8')
  const body = source.match(/  const downloadExport = async \(request: OperationalExportRequest\) => \{([\s\S]*?)\n  \}/)?.[1]
  assert.ok(body, name + ' owns a typed transfer handler')
  test(name + ' actual download handler suppresses previous account completion and failure', async () => {
    for (const fails of [false, true]) {
      const f = fixture(), session = new f.helper.OperationalExportDownloadSession(), exports = {}, authEpoch = { current: 1 }; let resolve, reject
      const env = { ...f.context, exports, authEpoch, user: f.user, navigator: { onLine: true }, [stateKey]: 'private', keyState: 'authorized', exportDownloads: { current: session },
        setExportDownloading: value => { f.state.downloading = value }, setMessage: message => { f.state.messages.push(message) },
        downloadOperationalExportBytes: () => new Promise((done, fail) => { resolve = done; reject = fail }) }
      vm.runInNewContext(transpile('export const run = async (request: unknown) => {' + body + '\n}'), env)
      const pending = exports.run(request); authEpoch.current++; f.state.messages.push('New account')
      if (fails) reject(new Error('late private failure')); else resolve({ blob: new Blob([bytes]), filename: 'old.json', expiresAt: Date.now() + 30_000 })
      await pending; assert.deepEqual(f.state.messages, ['New account']); assert.equal(f.state.saves.length, 0); session.stop()
    }
  })
  test(name + ' actual handler does not let stopped transfer update newer UI', async () => {
    const f = fixture(), session = new f.helper.OperationalExportDownloadSession(), exports = {}, authEpoch = { current: 1 }; let resolve
    const env = { ...f.context, exports, authEpoch, user: f.user, navigator: { onLine: true }, [stateKey]: 'private', keyState: 'authorized', exportDownloads: { current: session },
      setExportDownloading: value => { f.state.downloading = value }, setMessage: message => { f.state.messages.push(message) },
      downloadOperationalExportBytes: () => new Promise(done => { resolve = done }) }
    vm.runInNewContext(transpile('export const run = async (request: unknown) => {' + body + '\n}'), env)
    const pending = exports.run(request); session.stop(); f.state.messages.push('Stopped')
    resolve({ blob: new Blob([bytes]), filename: 'stale.json', expiresAt: Date.now() + 30_000 }); await pending
    assert.deepEqual(f.state.messages, ['Stopped']); assert.equal(f.state.saves.length, 0)
  })
}
