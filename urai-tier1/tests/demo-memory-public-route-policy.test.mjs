import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const middleware = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
const demoSource = readFileSync(new URL('../src/spatial/demo/demoMemoryStars.ts', import.meta.url), 'utf8')
const assetNames = [
  'recovery-bloom', 'threshold-storm', 'mirror-focus',
  'ritual-echo', 'dream-signal', 'calm-return',
]

function admittedPublicDemoAsset(pathname) {
  // Extract the actual policy declaration, not a duplicate test-side regex.
  const match = middleware.match(/^const PUBLIC_DEMO_MEMORY_ARTIFACT = (\/\^.+\$\/)$/m)
  assert.ok(match, 'static demo asset allowlist declaration must exist')
  const policy = vm.runInNewContext(match[1])
  return policy.test(pathname)
}

test('all six exact declared public demo memories are served under disabled production demo routes', () => {
  const bypass = middleware.indexOf('if (PUBLIC_DEMO_MEMORY_ARTIFACT.test(pathname)) return true')
  const demoGate = middleware.indexOf("if (pathname === '/demo' || pathname.startsWith('/demo/'))")
  assert.ok(bypass >= 0 && demoGate > bypass, 'asset exception must precede guarded demo routes')
  for (const name of assetNames) {
    const uri = `/demo/memories/${name}.svg`
    assert.equal(admittedPublicDemoAsset(uri), true, uri)
    assert.ok(demoSource.includes(uri), 'memory source must reference exact asset ' + uri)
    const asset = new URL(`../public/demo/memories/${name}.svg`, import.meta.url)
    assert.equal(existsSync(asset), true, 'the referenced public file must exist')
    assert.match(readFileSync(asset, 'utf8'), /<svg\b/)
  }
})

test('no general demo, private, or traversal paths are admitted as public assets', () => {
  for (const uri of [
    '/demo', '/demo/', '/demo/private', '/demo/memories',
    '/demo/memories/private.svg', '/demo/memories/recovery-bloom.svg/private',
    '/demo/memories/recovery-bloom.svg.js', '/demo/memories/recovery-bloom.svg/',
    '/demo/memories/../admin', '/demo/memories/RECovery-bloom.svg',
    '/admin', '/internal', '/brand-system', '/demo/memories/quiet-reset.mp4',
  ]) assert.equal(admittedPublicDemoAsset(uri), false, uri)
})

test('production middleware retains gated demo, admin and internal routes', () => {
  assert.match(middleware, /enabled\(process\.env\.NEXT_PUBLIC_ALLOW_PUBLIC_DEMO_ROUTES, process\.env\.URAI_ALLOW_PUBLIC_DEMO_ROUTES\)/)
  assert.match(middleware, /enabled\(process\.env\.NEXT_PUBLIC_ALLOW_ADMIN_ROUTES, process\.env\.URAI_ALLOW_ADMIN_ROUTES\)/)
  assert.match(middleware, /enabled\(process\.env\.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES, process\.env\.URAI_ALLOW_INTERNAL_ROUTES\)/)
})

test('production middleware blocks the /demo segment, not unrelated public paths', () => {
  const code = ts.transpileModule(middleware, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  function invoke(pathname) {
    const module = { exports: {} }
    vm.runInNewContext(code, {
      exports: module.exports,
      module,
      URL,
      process: { env: { NODE_ENV: 'production' } },
      require(name) {
        assert.equal(name, 'next/server')
        return {
          NextResponse: {
            next: () => ({ kind: 'next' }),
            rewrite: (target, options) => ({ kind: 'rewrite', target: target.pathname, status: options?.status }),
          },
        }
      },
    })
    return module.exports.middleware({
      nextUrl: { pathname },
      url: 'https://urai.invalid' + pathname,
    })
  }
  for (const path of ['/demo', '/demo/', '/demo/private', '/demo/memories/secret.svg']) {
    const outcome = invoke(path)
    assert.equal(outcome.kind, 'rewrite', path)
    assert.equal(outcome.status, 404, path)
  }
  for (const path of ['/demonstration', '/demographics', '/life-map']) {
    assert.equal(invoke(path).kind, 'next', path)
  }
  for (const name of assetNames)
    assert.equal(invoke('/demo/memories/' + name + '.svg').kind, 'next', name)
  assert.equal(invoke('/home').kind, 'rewrite', 'canonical Home rewrite remains')
})
