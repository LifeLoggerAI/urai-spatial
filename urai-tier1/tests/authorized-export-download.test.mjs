import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import { createHash, webcrypto } from 'node:crypto'
import test from 'node:test'
const require = createRequire(import.meta.url), ts = require('typescript')
const source = fs.readFileSync('src/lib/privacy/authorizedExportDownload.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const projectId = 'urai-4dc1d', ownerId = 'synthetic-owner', request = { jobId: 'synthetic-job', file: 'export' }
const bytes = new TextEncoder().encode('{"synthetic":true}'), checksum = createHash('sha256').update(bytes).digest('hex')
const origin = 'https://us-central1-' + projectId + '.cloudfunctions.net'
function fixture(overrides = {}) {
  let clock = Date.now(), fetches = 0, tokens = 0
  const saved = [], revoked = [], anchors = []
  class Clock extends Date { static now() { return clock } }
  class DownloadURL extends URL {
    static createObjectURL() { const url = 'blob:synthetic-' + saved.length; saved.push(url); return url }
    static revokeObjectURL(url) { revoked.push(url) }
  }
  const exports = {}, env = { exports, URL: DownloadURL, fetch: (...args) => settings.fetcher(...args), Blob, DOMException, AbortController, Uint8Array, crypto: webcrypto, Date: Clock, setTimeout, clearTimeout, document: { createElement() { const a = { click() { anchors.push(a) }, remove() {} }; return a }, body: { appendChild() {} } } }
  vm.runInNewContext(code, env, { filename: 'authorizedExportDownload.ts' })
  const expiry = clock + 30_000
  const descriptor = { schemaVersion: 'urai-spatial-export-download-v1', requiresAuthorization: true, ownerId, jobId: request.jobId, file: 'export', assetId: null, downloadExpiresAt: expiry, packageExpiresAt: clock + 60_000, url: origin + '/downloadOperationalExportPackage?jobId=' + request.jobId + '&file=export&expiresAt=' + expiry + '&authorityHash=' + 'a'.repeat(64), checksum, contentType: 'application/json', byteLength: bytes.length, storageGeneration: '1234' }
  const settings = { descriptor, request, projectId, signal: new AbortController().signal, isCurrent: () => true, getIdToken: async () => { tokens++; return 'synthetic-token' }, fetcher: async () => { fetches++; return new Response(bytes, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': String(bytes.length) } }) },
    // Legacy fields permit the same denial cases to exercise predecessor source.
    // Successor ignores them and derives authority from the bound descriptor.
    url: '/api/privacy/export/download?jobId=synthetic-job&file=export', current: () => true, jobId: request.jobId, origin: 'https://synthetic-spatial.invalid', file: 'export', ...overrides }
  return { exports, settings, descriptor, env, anchors, saved, revoked, run: () => exports.fetchAuthorizedOperationalExport(settings), counts: () => ({ fetches, tokens }), advance: ms => { clock += ms }, now: () => clock }
}
test('actual transport and Firebase wrapper pin project bytes independently of native or preview origin', async () => {
  const bridgeSource = fs.readFileSync('src/lib/privacy/operationalPrivacyClient.ts', 'utf8')
  const bridgeCode = ts.transpileModule(bridgeSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  for (const pageHref of ['https://localhost/passport', 'capacitor://localhost/passport', 'https://urai-4dc1d--export-review.web.app/passport']) {
    const f = fixture(); let observed
    f.settings.fetcher = async (url, options) => { observed = { url, options }; return new Response(bytes, { headers: { 'Content-Type': 'application/json' } }) }
    const user = { uid: ownerId, async getIdToken(force) { assert.equal(force, true); return f.settings.getIdToken() } }
    const bridge = {}, imports = {
      'firebase/firestore': {}, 'firebase/auth': { getAuth: () => ({ currentUser: user }) },
      'firebase/functions': { httpsCallable: (_functions, name) => async payload => {
        assert.equal(name, 'getOperationalExportDownloadUrl'); assert.equal(payload.jobId, request.jobId); return { data: f.descriptor }
      } },
      '@/lib/firebase/client': { app: { options: { projectId } }, firebasePublicEnvReady: true, functions: {} },
      './authorizedExportDownload': f.exports,
    }
    vm.runInNewContext(bridgeCode, { exports: bridge, URL, DOMException, crypto: webcrypto,
      window: { location: { href: pageHref, origin: new URL(pageHref).origin } },
      require: name => { assert.ok(Object.hasOwn(imports, name)); return imports[name] },
    }, { filename: 'operationalPrivacyClient.ts' })
    const result = await bridge.downloadOperationalExportBytes(request, { signal: f.settings.signal, isCurrent: () => true })
    assert.equal(await result.blob.text(), new TextDecoder().decode(bytes)); assert.equal(result.filename, 'urai-export-synthetic-job.json')
    assert.equal(observed.url, f.descriptor.url); assert.equal(new URL(observed.url).origin, origin)
    assert.equal(observed.options.headers.Authorization, 'Bearer synthetic-token'); assert.equal(observed.options.signal, f.settings.signal)
    for (const [key, value] of Object.entries({ credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' })) assert.equal(observed.options[key], value)
  }
})

const badDescriptors = {
  'legacy signed URL': d => ({ ...d, requiresAuthorization: false }), 'missing schema': d => ({ ...d, schemaVersion: undefined }), 'wrong job': d => ({ ...d, jobId: 'other-job' }), 'wrong selected file': d => ({ ...d, file: 'runtime' }), 'wrong asset': d => ({ ...d, assetId: 'other-asset' }), 'missing owner': d => ({ ...d, ownerId: '' }), 'expired grant': d => ({ ...d, downloadExpiresAt: 1 }), 'short package lifetime': d => ({ ...d, packageExpiresAt: 1 }), 'non-finite deadline': d => ({ ...d, downloadExpiresAt: Infinity }), 'zero length': d => ({ ...d, byteLength: 0 }), 'unsafe length': d => ({ ...d, byteLength: Number.MAX_SAFE_INTEGER + 1 }), 'over browser memory bound': d => ({ ...d, byteLength: 64 * 1024 * 1024 + 1 }), 'non-hash checksum': d => ({ ...d, checksum: 'unsupported' }), 'wrong content type': d => ({ ...d, contentType: 'text/html' }), 'zero generation': d => ({ ...d, storageGeneration: '0' }),
  'unpinned storage URL': d => ({ ...d, url: 'https://storage.googleapis.com/private/export' }), 'another project': d => ({ ...d, url: d.url.replace(projectId, 'another-project') }), 'lookalike host': d => ({ ...d, url: d.url.replace('.cloudfunctions.net', '.cloudfunctions.net.untrusted.invalid') }), 'HTTP endpoint': d => ({ ...d, url: d.url.replace('https:', 'http:') }), 'nondefault port': d => ({ ...d, url: d.url.replace('.net/', '.net:8443/') }), 'userinfo': d => ({ ...d, url: d.url.replace('https://', 'https://private:secret@') }), 'fragment': d => ({ ...d, url: d.url + '#secret' }), 'collided Privacy namespace': d => ({ ...d, url: d.url.replace('downloadOperationalExportPackage', 'downloadExportPackage') }), 'extra query': d => ({ ...d, url: d.url + '&ownerId=other' }), 'duplicate query': d => ({ ...d, url: d.url + '&jobId=other' }), 'extended deadline': d => ({ ...d, url: d.url.replace('expiresAt=' + d.downloadExpiresAt, 'expiresAt=' + (d.downloadExpiresAt + 1)) }),
}
for (const [label, change] of Object.entries(badDescriptors)) test('descriptor rejects ' + label + ' before token acquisition', async () => { const f = fixture(); f.settings.descriptor = change(f.descriptor); await assert.rejects(f.run()); assert.deepEqual(f.counts(), { tokens: 0, fetches: 0 }) })
test('descriptor rejects lifetime beyond fifteen minutes', async () => { const f = fixture(); f.settings.descriptor = { ...f.descriptor, downloadExpiresAt: f.now() + 900_001, packageExpiresAt: f.now() + 1_000_000 }; await assert.rejects(f.run()); assert.equal(f.counts().tokens, 0) })
for (const status of [401, 403, 409, 500]) test('HTTP' + status + ' cannot be saved as export', async () => { const f = fixture({ fetcher: async () => new Response('{}', { status }) }); await assert.rejects(f.run(), /EXPORT_UNAVAILABLE/) })
for (const mime of ['text/html', 'application/jsonwhatever', 'application/octet-stream']) test('response rejects ' + mime + ' for JSON export', async () => { const f = fixture({ fetcher: async () => new Response(bytes, { headers: { 'Content-Type': mime } }) }); await assert.rejects(f.run(), /EXPORT_CONTENT_INVALID/) })
test('runtime pins exact asset and verifies binary bytes', async () => {
  const f = fixture(), assetId = 'synthetic-asset'
  f.settings.request = { jobId: request.jobId, file: 'runtime', assetId }
  f.settings.descriptor = { ...f.descriptor, file: 'runtime', assetId, contentType: 'application/octet-stream', url: f.descriptor.url.replace('file=export', 'file=runtime') + '&assetId=' + assetId }
  f.settings.fetcher = async () => new Response(bytes, { headers: { 'Content-Type': 'application/octet-stream' } })
  assert.equal((await f.run()).blob.size, bytes.length); f.settings.request = { ...f.settings.request, assetId: 'different' }; await assert.rejects(f.run(), /INVALID_EXPORT_DESCRIPTOR/)
})
test('body digest rejects complete contradicted replacement', async () => { const f = fixture(); f.settings.descriptor = { ...f.descriptor, checksum: 'b'.repeat(64) }; await assert.rejects(f.run(), /EXPORT_INTEGRITY_FAILED/) })
for (const delta of [-1, 1]) test('body length rejects ' + (delta < 0 ? 'truncated' : 'oversized') + ' bytes without length header', async () => { const body = new Uint8Array(bytes.length + delta), f = fixture({ fetcher: async () => new Response(body, { headers: { 'Content-Type': 'application/json' } }) }); await assert.rejects(f.run(), /EXPORT_CONTENT_INVALID|EXPORT_INTEGRITY_FAILED/) })
test('declared length mismatch is denied before consumption', async () => { const f = fixture({ fetcher: async () => new Response(bytes, { headers: { 'Content-Type': 'application/json', 'Content-Length': '1' } }) }); await assert.rejects(f.run(), /EXPORT_CONTENT_INVALID/) })
test('token resolution cannot dispatch after owner context changes', async () => { const f = fixture(); let active = true; f.settings.isCurrent = () => active; f.settings.getIdToken = async () => { active = false; return 'synthetic-token' }; await assert.rejects(f.run(), error => error.name === 'AbortError'); assert.equal(f.counts().fetches, 0) })
test('token resolution cannot dispatch after descriptor expiration', async () => { const f = fixture(); f.settings.getIdToken = async () => { f.advance(31_000); return 'synthetic-token' }; await assert.rejects(f.run()); assert.equal(f.counts().fetches, 0) })
test('explicit cancellation interrupts stalled partial read and releases it', async () => {
  const controller = new AbortController(), f = fixture({ signal: controller.signal }); let cancelled = 0
  f.settings.fetcher = async () => new Response(new ReadableStream({ start(c) { c.enqueue(bytes.slice(0, 3)); setTimeout(() => controller.abort(), 0) }, cancel() { cancelled++ } }), { headers: { 'Content-Type': 'application/json' } })
  await assert.rejects(f.run(), error => error.name === 'AbortError'); assert.equal(cancelled, 1)
})
test('withdrawal during read cannot return Blob', async () => {
  const f = fixture(); let active = true; f.settings.isCurrent = () => active
  f.settings.fetcher = async () => new Response(new ReadableStream({ pull(c) { active = false; c.enqueue(bytes); c.close() } }), { headers: { 'Content-Type': 'application/json' } })
  await assert.rejects(f.run(), error => error.name === 'AbortError')
})
test('delivery expiry during read prevents saved bytes', async () => {
  const f = fixture()
  f.settings.fetcher = async () => new Response(new ReadableStream({ pull(c) { c.enqueue(bytes); f.advance(31_000); c.close() } }), { headers: { 'Content-Type': 'application/json' } })
  await assert.rejects(f.run(), /EXPORT_EXPIRED|INVALID_EXPORT_DESCRIPTOR/)
})
test('later transfer cancels previous transfer even if its source resolves late', async () => {
  const f = fixture(), session = new f.exports.OperationalExportDownloadSession(); let resolveFirst, firstSignal
  const first = session.download(request, () => true, (_request, lifecycle) => { firstSignal = lifecycle.signal; return new Promise(resolve => { resolveFirst = resolve }) })
  const firstResult = assert.rejects(first, error => error.name === 'AbortError')
  await session.download(request, () => true, async () => ({ blob: new Blob([bytes]), filename: 'new.json', expiresAt: f.now() + 30_000 }))
  assert.equal(firstSignal.aborted, true); resolveFirst({ blob: new Blob([bytes]), filename: 'old.json', expiresAt: f.now() + 30_000 }); await firstResult
  assert.deepEqual(f.anchors.map(a => a.download), ['new.json']); session.stop(); assert.deepEqual(f.revoked, f.saved)
})
test('stop revokes local URLs without claiming recall of saved files', async () => {
  const f = fixture(), session = new f.exports.OperationalExportDownloadSession()
  await session.download(request, () => true, async () => ({ blob: new Blob([bytes]), filename: 'synthetic.json', expiresAt: f.now() + 30_000 }))
  assert.equal(f.anchors.length, 1); assert.equal(f.revoked.length, 0); session.stop(); session.stop(); assert.deepEqual(f.revoked, f.saved)
})
test('expired local delivery never creates download URL', async () => {
  const f = fixture(), session = new f.exports.OperationalExportDownloadSession()
  await assert.rejects(session.download(request, () => true, async () => ({ blob: new Blob([bytes]), filename: 'synthetic.json', expiresAt: f.now() - 1 })), /EXPORT_EXPIRED/); assert.equal(f.saved.length, 0)
})
test('local Blob URL lifetime is bounded and cleanup is idempotent', async () => {
  const f = fixture(), scheduled = new Map(); let id = 0
  f.env.setTimeout = (fn, delay) => { scheduled.set(++id, { fn, delay }); return id }
  f.env.clearTimeout = token => { scheduled.delete(token) }
  const session = new f.exports.OperationalExportDownloadSession()
  await session.download(request, () => true, async () => ({ blob: new Blob([bytes]), filename: 'synthetic.json', expiresAt: f.now() + 100_000 }))
  assert.equal(scheduled.size, 1)
  const cleanup = [...scheduled.values()][0]
  assert.equal(cleanup.delay, 60_000)
  cleanup.fn(); session.stop()
  assert.deepEqual(f.revoked, f.saved); assert.equal(scheduled.size, 0)
})
