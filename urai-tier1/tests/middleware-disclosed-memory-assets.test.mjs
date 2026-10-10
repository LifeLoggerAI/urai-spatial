import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const illustrations = ['calm-return', 'dream-signal', 'mirror-focus', 'recovery-bloom', 'ritual-echo', 'threshold-storm']
const source = fs.readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
} }).outputText

// Execute the actual middleware with a bounded NextResponse adapter. This
// tests route policy; final built-server asset loading still needs browser proof.
function fixture(env = {}) {
  const module = { exports: {} }
  vm.runInNewContext(code, {
    module, exports: module.exports, URL, process: { env: { NODE_ENV: 'production', ...env } },
    require(name) {
      assert.equal(name, 'next/server')
      return { NextResponse: {
        next: () => ({ action: 'next' }),
        rewrite: (url, options = {}) => ({ action: 'rewrite', pathname: url.pathname, search: url.search, ...options }),
      } }
    },
  }, { filename: 'actual-middleware.ts' })
  return pathname => module.exports.middleware({
    url: `https://synthetic.invalid${pathname}`, nextUrl: new URL(`https://synthetic.invalid${pathname}`),
  })
}

for (const name of illustrations) {
  test(`production permits the tracked disclosed ${name} illustration only with explicit demo authority`, () => {
    const asset = `/demo/memories/${name}.svg`
    assert.ok(fs.existsSync(new URL(`../public${asset}`, import.meta.url)))
    assert.equal(fixture()(asset).status, 404)
    assert.equal(fixture({ URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'false' })(asset).status, 404)
    const route = fixture({ URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'true' })
    assert.equal(route(asset).action, 'next')
    assert.equal(route(`${asset}?cache=fixture`).action, 'next')
  })
}

for (const pathname of ['/demo', '/demo/replay-film', '/demo/memories',
  '/demo/memories/unknown.svg', '/demo/memories/recovery-bloom.svg/private',
  '/demo/memories/recovery-bloom.svg.bak', '/demo/memories/Recovery-bloom.svg',
  '/demo/memories/recovery-bloom.png', '/admin', '/admin/fixture',
  '/internal/fixture', '/brand-system/fixture']) {
  test(`production still denies gated or unlisted path ${pathname}`, () => {
    const result = fixture()(pathname)
    assert.equal(result.action, 'rewrite')
    assert.equal(result.pathname, '/_not-found')
    assert.equal(result.status, 404)
  })
}

test('demo, administrative, and internal gates remain independently explicit', () => {
  const demo = fixture({ URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'true' })
  assert.equal(demo('/demo/replay-film').action, 'next')
  assert.equal(demo('/admin').status, 404)
  assert.equal(demo('/internal').status, 404)
  const admin = fixture({ URAI_ALLOW_ADMIN_ROUTES: 'true' })
  assert.equal(admin('/admin').action, 'next')
  assert.equal(admin('/demo').status, 404)
  const internal = fixture({ URAI_ALLOW_INTERNAL_ROUTES: 'true' })
  assert.equal(internal('/internal').action, 'next')
  assert.equal(internal('/brand-system').action, 'next')
  assert.equal(internal('/demo').status, 404)
  assert.equal(fixture({ URAI_ALLOW_PUBLIC_DEMO_ROUTES: 'false' })('/demo').status, 404)
})

test('Home rewrite preserves explicit journey query and normal product routes remain available', () => {
  const route = fixture()
  const result = route('/home?demo=1&memoryId=quiet-reset&node=quiet-reset&manifestId=replay-recovery-thread')
  assert.equal(result.action, 'rewrite')
  assert.equal(result.pathname, '/')
  const query = new URLSearchParams(result.search)
  assert.equal(query.get('demo'), '1')
  assert.equal(query.get('memoryId'), 'quiet-reset')
  assert.equal(query.get('node'), 'quiet-reset')
  assert.equal(query.get('manifestId'), 'replay-recovery-thread')
  assert.equal(route('/focus?demo=1&memoryId=quiet-reset').action, 'next')
  assert.equal(route('/replay').action, 'next')
})
