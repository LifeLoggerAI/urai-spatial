import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { createRequire } from 'node:module'
import test from 'node:test'

const root = process.cwd()
const require = createRequire(path.join(root, 'urai-tier1/package.json'))
const ts = require('typescript')
const source = fs.readFileSync(path.join(root, 'urai-tier1/src/middleware.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function request(pathname, flags = {}) {
  const module = { exports: {} }
  vm.runInNewContext(compiled, { exports: module.exports, module, URL,
    process: { env: { NODE_ENV: 'production', ...flags } },
    require: (specifier) => { assert.equal(specifier, 'next/server'); return { NextResponse: {
      next: () => ({ allowed: true }), rewrite: (url, options) => ({ allowed: false, pathname: url.pathname, status: options?.status }),
    } } },
  })
  const url = `http://127.0.0.1:3001${pathname}`
  return module.exports.middleware({ url, nextUrl: new URL(url) })
}
test('production default still denies demo pages and the bundled demo SVG', () => {
  for (const url of ['/demo', '/demo/replay-film', '/demo/memories/recovery-bloom.svg']) {
    assert.equal(request(url).status, 404)
  }
})
test('explicit verification flag permits demo page and SVG through the real middleware', () => {
  for (const url of ['/demo', '/demo/memories/recovery-bloom.svg']) assert.equal(request(url, { URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'true' }).allowed, true)
})
test('demo verification flag grants no admin or internal route authority', () => {
  for (const url of ['/admin', '/internal', '/brand-system']) assert.equal(request(url, { URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'true' }).status, 404)
})
test('false and unset verification flags do not grant demo authority', () => {
  assert.equal(request('/demo/memories/recovery-bloom.svg', { URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'false' }).status, 404)
  assert.equal(request('/demo/memories/recovery-bloom.svg').status, 404)
})
