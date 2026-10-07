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
