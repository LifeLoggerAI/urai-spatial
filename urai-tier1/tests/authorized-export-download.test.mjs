import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url), ts = require('typescript')
const source = fs.readFileSync('src/lib/privacy/authorizedExportDownload.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
vm.runInNewContext(code, { exports, URL, fetch, Blob, Uint8Array }, { filename: 'authorizedExportDownload.ts' })
const run = args => exports.fetchAuthorizedOperationalExport({ projectId: 'urai-4dc1d', jobId: 'synthetic-job', current: () => true, ...args })
const origin = 'https://synthetic-spatial.invalid'
const url = '/api/privacy/export/download?jobId=synthetic-job&file=export'

test('actual client downloads current authenticated bytes without redirection, credentials or caching', async () => {
  let seen
  const blob = await run({ url, origin, file: 'export', getIdToken: async () => 'synthetic-token', fetcher: async (target, options) => {
    seen = { target, options }; return new Response('{"synthetic":true}', { headers: { 'Content-Type': 'application/json' } })
  } })
  assert.equal(await blob.text(), '{"synthetic":true}')
  assert.equal(seen.target, origin + url); assert.equal(seen.options.headers.Authorization, 'Bearer synthetic-token')
  for (const [key, value] of Object.entries({ credentials: 'omit', redirect: 'error', cache: 'no-store', referrerPolicy: 'no-referrer' })) assert.equal(seen.options[key], value)
})
for (const candidate of ['https://untrusted.invalid/api/privacy/export/download', '//untrusted.invalid/api/privacy/export/download', '/other/path', `${origin}/api/privacy/export/download#secret`, 'https://user:pass@synthetic-spatial.invalid/api/privacy/export/download', 'http://synthetic-spatial.invalid/api/privacy/export/download']) {
  test(`client denies untrusted download ${candidate} before token acquisition`, async () => {
    let tokens = 0, dispatches = 0
    await assert.rejects(run({ url: candidate, origin, file: 'export', getIdToken: async () => { tokens++; return 'synthetic' }, fetcher: async () => { dispatches++ } }), /current application/)
    assert.equal(tokens, 0); assert.equal(dispatches, 0)
  })
}
for (const status of [401, 403, 409, 500]) {
  test(`client cannot save HTTP${status} denial as private export`, async () => {
    await assert.rejects(run({ url, origin, file: 'export', getIdToken: async () => 'synthetic', fetcher: async () => new Response('{}', { status }) }), /unavailable/)
  })
}
test('client rejects hosting fallback and keeps runtime binary transport', async () => {
  await assert.rejects(run({ url, origin, file: 'export', getIdToken: async () => 'synthetic', fetcher: async () => new Response('<html/>', { headers: { 'Content-Type': 'text/html' } }) }), /unexpected format/)
  const blob = await run({ url: url.replace('file=export', 'file=runtime') + '&assetId=synthetic-asset', assetId: 'synthetic-asset', origin, file: 'runtime', getIdToken: async () => 'synthetic', fetcher: async () => new Response('synthetic-splat', { headers: { 'Content-Type': 'application/octet-stream' } }) })
  assert.equal(await blob.text(), 'synthetic-splat')
})

for (const configuration of ['../firebase.json', '../firebase.static.json']) {
  test(`actual ${configuration} routes authenticated export bytes to the protected Functions handler`, () => {
    const hosting = JSON.parse(fs.readFileSync(configuration, 'utf8')).hosting
    const rewrites = hosting.rewrites.filter(entry => entry.source === '/api/privacy/export/download')
    assert.deepEqual(rewrites, [{ source: '/api/privacy/export/download', function: { functionId: 'downloadOperationalExportPackage', region: 'us-central1' } }])
  })
}

for (const pathname of ['/downloadOperationalExportPackage', '/downloadExportPackage']) {
  test(`current project pinned bytes support web and native origins using ${pathname}`, async () => {
    for (const origin of ['https://urai.app', 'capacitor://localhost', 'https://localhost']) {
      const url = `https://us-central1-urai-4dc1d.cloudfunctions.net${pathname}?jobId=synthetic-job&file=export&expiresAt=1800000010000&authorityHash=${'a'.repeat(64)}`
      let seen
      const blob = await run({ url, origin, file: 'export', getIdToken: async () => 'synthetic-current', fetcher: async (target, options) => {
        seen = { target, options }; return new Response('{}', { headers: { 'Content-Type': 'application/json' } })
      } })
      assert.equal(await blob.text(), '{}'); assert.equal(seen.target, url); assert.equal(seen.options.headers.Authorization, 'Bearer synthetic-current')
    }
  })
}
for (const candidate of [
  'https://us-central1-other-project.cloudfunctions.net/downloadExportPackage?jobId=synthetic-job&file=export',
  'https://us-central1-urai-4dc1d.cloudfunctions.net:444/downloadExportPackage?jobId=synthetic-job&file=export',
  'https://us-central1-urai-4dc1d.cloudfunctions.net/other?jobId=synthetic-job&file=export',
  '/api/privacy/export/download?jobId=other&file=export', '/api/privacy/export/download?jobId=synthetic-job&file=runtime',
]) {
  test(`descriptor binding denies ${candidate} before authentication`, async () => {
    let tokens = 0
    await assert.rejects(run({ url: candidate, origin, file: 'export', getIdToken: async () => { tokens++; return 'synthetic' } }))
    assert.equal(tokens, 0)
  })
}
for (const phase of ['initial', 'token', 'response', 'body']) {
  test(`actual byte reader cancels changed session at ${phase}`, async () => {
    let active = phase !== 'initial', tokens = 0, fetches = 0, cancelled = false
    const body = new ReadableStream({ pull(controller) { if (phase === 'body') active = false; controller.enqueue(new TextEncoder().encode('{}')); controller.close() }, cancel() { cancelled = true } })
    await assert.rejects(run({ url, origin, file: 'export', current: () => active, getIdToken: async () => { tokens++; if (phase === 'token') active = false; return 'synthetic' }, fetcher: async () => { fetches++; if (phase === 'response') active = false; return new Response(body, { headers: { 'Content-Type': 'application/json' } }) } }))
    if (phase === 'initial') assert.equal(tokens, 0)
    if (['initial', 'token'].includes(phase)) assert.equal(fetches, 0)
  })
}

test('actual consumer requires authenticated descriptor and cannot save after owner or epoch drift', async () => {
  const clientSource = fs.readFileSync('src/lib/privacy/operationalPrivacyClient.ts', 'utf8')
  const clientCode = ts.transpileModule(clientSource, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  for (const drift of ['descriptor', 'token', 'body', 'epoch', 'unsigned', 'owner']) {
    let current = true, fetched = 0, saved = 0, user
    const auth = { currentUser: undefined }
    const descriptor = { ownerId: 'synthetic-owner', jobId: 'synthetic-job', file: 'export', requiresAuthorization: drift !== 'unsigned', url: 'https://us-central1-urai-4dc1d.cloudfunctions.net/downloadOperationalExportPackage?jobId=synthetic-job&file=export' }
    user = { uid: 'synthetic-owner', getIdToken: async force => { assert.equal(force, true); if (drift === 'token') auth.currentUser = null; return 'synthetic' } }
    auth.currentUser = user
    const module = { exports: {} }
    class LocalURL extends URL { static createObjectURL() { saved++; return 'blob:synthetic' }; static revokeObjectURL() {} }
    const document = { body: { append() {} }, createElement: () => ({ click() {}, remove() {} }) }
    vm.runInNewContext(clientCode, { module, exports: module.exports, URL: LocalURL, document, window: { location: { origin: 'capacitor://localhost' } }, setTimeout: () => {}, require: name => {
      if (name === 'firebase/functions') return { httpsCallable: (_functions, callable) => async () => { assert.equal(callable, 'getOperationalExportDownloadUrl'); if (drift === 'descriptor') auth.currentUser = null; if (drift === 'owner') descriptor.ownerId = 'other'; return { data: descriptor } } }
      if (name === 'firebase/auth') return { getAuth: () => auth }
      if (name === 'firebase/firestore') return {}
      if (name === '@/lib/firebase/client') return { app: { options: { projectId: 'urai-4dc1d' } }, functions: {} }
      if (name === './authorizedExportDownload') return { fetchAuthorizedOperationalExport: async args => { fetched++; await args.getIdToken(); if (drift === 'body') auth.currentUser = null; if (drift === 'epoch') current = false; return new Blob(['{}']) } }
      throw new Error(`Unexpected actual client dependency ${name}`)
    } })
    await assert.rejects((async () => { const issued = await module.exports.getOperationalExportDownloadUrl({ jobId: 'synthetic-job' }); await module.exports.saveOperationalExportDownload(issued, () => current) })())
    assert.equal(saved, 0)
    if (['unsigned', 'owner'].includes(drift)) assert.equal(fetched, 0)
  }
})
