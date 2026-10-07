import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url), ts = require('typescript')
const source = fs.readFileSync('src/lib/privacy/authorizedExportDownload.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
const exports = {}
vm.runInNewContext(code, { exports, URL, fetch, Blob }, { filename: 'authorizedExportDownload.ts' })
const run = exports.fetchAuthorizedOperationalExport
const origin = 'https://synthetic-spatial.invalid'
const url = '/api/privacy/export/download?jobId=synthetic-job'

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
  const blob = await run({ url, origin, file: 'runtime', getIdToken: async () => 'synthetic', fetcher: async () => new Response('synthetic-splat', { headers: { 'Content-Type': 'application/octet-stream' } }) })
  assert.equal(await blob.text(), 'synthetic-splat')
})

for (const configuration of ['../firebase.json', '../firebase.static.json']) {
  test(`actual ${configuration} routes authenticated export bytes to the protected Functions handler`, () => {
    const hosting = JSON.parse(fs.readFileSync(configuration, 'utf8')).hosting
    const rewrites = hosting.rewrites.filter(entry => entry.source === '/api/privacy/export/download')
    assert.deepEqual(rewrites, [{ source: '/api/privacy/export/download', function: { functionId: 'downloadExportPackage', region: 'us-central1' } }])
  })
}

function actualSaveFixture({ pageHref, configuredOrigin, descriptorUrl = url, afterToken, afterBody } = {}) {
  const stats = { tokens: 0, fetches: [], saved: 0, blobUrls: 0, revoked: 0 }
  const state = { current: true }
  const user = { uid: 'synthetic-export-owner', async getIdToken(refresh) {
    assert.equal(refresh, true); stats.tokens++; afterToken?.(state); return 'synthetic-token'
  } }
  const auth = { currentUser: user }
  class BrowserURL extends URL {
    static createObjectURL() { stats.blobUrls++; return 'blob:synthetic-export' }
    static revokeObjectURL() { stats.revoked++ }
  }
  const globals = { URL: BrowserURL, Blob,
    window: { location: { href: pageHref, origin: new URL(pageHref).origin } },
    document: { body: { append() {} }, createElement() { return { click() { stats.saved++ }, remove() {} } } },
    setTimeout(callback) { callback(); return 1 },
    fetch: async (target, options) => {
      stats.fetches.push({ target, options }); afterBody?.(state)
      return new Response('{"synthetic":true}', { headers: { 'Content-Type': 'application/json' } })
    },
  }
  function load(filename, dependencies = {}, environment = {}) {
    const exports = {}
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText
    vm.runInNewContext(code, { ...globals, exports, process: { env: environment }, require(name) {
      assert.ok(Object.hasOwn(dependencies, name), `Unexpected actual client dependency ${name}`)
      return dependencies[name]
    } }, { filename })
    return exports
  }
  const api = load('src/lib/clientApiUrl.ts', {}, { NEXT_PUBLIC_URAI_API_ORIGIN: configuredOrigin })
  const transport = load('src/lib/privacy/authorizedExportDownload.ts')
  const client = load('src/lib/privacy/operationalPrivacyClient.ts', {
    'firebase/firestore': {}, 'firebase/functions': {}, 'firebase/auth': { getAuth: () => auth },
    '@/lib/firebase/client': { app: {}, functions: {} }, '@/lib/clientApiUrl': api,
    './authorizedExportDownload': transport,
  })
  return { stats, auth, state, save: () => client.saveOperationalExportDownload({
    ownerId: user.uid, file: 'export', requiresAuthorization: true, url: descriptorUrl,
  }, () => state.current) }
}

for (const pageHref of ['https://localhost/passport', 'capacitor://localhost/passport']) {
  test(`actual native save from ${pageHref} sends refreshed Bearer only to configured canonical API`, async () => {
    const f = actualSaveFixture({ pageHref, configuredOrigin: 'https://urai.app' })
    await f.save()
    assert.equal(f.stats.fetches[0].target, 'https://urai.app' + url)
    assert.equal(f.stats.fetches[0].options.headers.Authorization, 'Bearer synthetic-token')
    assert.equal(f.stats.fetches[0].options.credentials, 'omit'); assert.equal(f.stats.fetches[0].options.redirect, 'error')
    assert.equal(f.stats.tokens, 1); assert.equal(f.stats.saved, 1); assert.equal(f.stats.revoked, 1)
  })
}
test('actual browser save without API override preserves its current owned preview origin', async () => {
  const f = actualSaveFixture({ pageHref: 'https://urai-4dc1d--review-ab12.web.app/passport' })
  await f.save(); assert.equal(f.stats.fetches[0].target, 'https://urai-4dc1d--review-ab12.web.app' + url)
  assert.equal(f.stats.saved, 1)
})
test('native save rejects a descriptor outside the configured API before token refresh', async () => {
  const f = actualSaveFixture({ pageHref: 'capacitor://localhost/passport', configuredOrigin: 'https://urai.app',
    descriptorUrl: 'https://foreign.invalid/api/privacy/export/download' })
  await assert.rejects(f.save(), /current application/); assert.equal(f.stats.tokens, 0); assert.equal(f.stats.fetches.length, 0)
})
test('native save rejects malformed configured API authority before token refresh', async () => {
  const f = actualSaveFixture({ pageHref: 'capacitor://localhost/passport', configuredOrigin: 'https://user:pass@urai.app' })
  await assert.rejects(f.save(), /bare HTTPS origin/); assert.equal(f.stats.tokens, 0); assert.equal(f.stats.fetches.length, 0)
})
test('actual configured native save retains auth epoch fencing across token refresh', async () => {
  const f = actualSaveFixture({ pageHref: 'capacitor://localhost/passport', configuredOrigin: 'https://urai.app', afterToken: state => { state.current = false } })
  await assert.rejects(f.save(), /Current owner authentication/); assert.equal(f.stats.tokens, 1); assert.equal(f.stats.fetches.length, 0)
  assert.equal(f.stats.blobUrls, 0)
})
test('actual configured native save retains auth epoch fencing after private bytes arrive', async () => {
  const f = actualSaveFixture({ pageHref: 'https://localhost/passport', configuredOrigin: 'https://urai.app', afterBody: state => { state.current = false } })
  await assert.rejects(f.save(), /Current owner authentication/); assert.equal(f.stats.fetches.length, 1)
  assert.equal(f.stats.blobUrls, 0); assert.equal(f.stats.saved, 0)
})
