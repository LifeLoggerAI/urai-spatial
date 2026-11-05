import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const demoSource = readFileSync(new URL('../src/spatial/demo/demoMemoryStars.ts', import.meta.url), 'utf8')
const rendererSource = readFileSync(new URL('../src/spatial/assets/ManifestRenderer.tsx', import.meta.url), 'utf8')

const requiredDemoAssets = [
  '/demo/memories/recovery-bloom.svg',
  '/demo/memories/threshold-storm.svg',
  '/demo/memories/mirror-focus.svg',
  '/demo/memories/ritual-echo.svg',
  '/demo/memories/dream-signal.svg',
  '/demo/memories/calm-return.svg',
]

test('demo memory manifests include local public image artifacts', () => {
  assert.match(demoSource, /demoArtifactByTone/)
  assert.match(demoSource, /artifactId: `\$\{resolvedId\}-primary-demo-image`/)
  assert.match(demoSource, /mimeType: 'image\/svg\+xml'/)
  assert.match(demoSource, /width: 1440/)
  assert.match(demoSource, /height: 1440/)

  for (const asset of requiredDemoAssets) {
    assert.ok(demoSource.includes(asset), `Missing demo asset path: ${asset}`)
  }
})

test('manifest renderer allows same-origin demo public assets without allowing storage URIs', () => {
  assert.match(rendererSource, /url\.startsWith\('gs:\/\/'\)/)
  assert.match(rendererSource, /url\.startsWith\('\/demo\/'\)/)
  assert.match(rendererSource, /parsed\.protocol === 'https:' \|\| parsed\.protocol === 'http:'/)
})


test('production middleware serves only six audited public replay fixture SVGs and blocks other demo routes', () => {
  const source = readFileSync(new URL('../src/middleware.ts', import.meta.url), 'utf8')
  const js = ts.transpileModule(source, { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 } }).outputText
  const simulated = (pathname, env={NODE_ENV:'production'}) => {
    const module = { exports:{} }
    vm.runInNewContext(js, {
      module, exports:module.exports, URL, process:{env},
      require(name) {
        assert.equal(name, 'next/server')
        return { NextResponse: {
          next:() => ({kind:'next'}),
          rewrite:(destination, options) => ({kind:'rewrite', destination:destination.pathname, status:options?.status}),
        } }
      },
    })
    return module.exports.middleware({ nextUrl:{pathname}, url:'https://urai.invalid' + pathname })
  }
  for (const pathname of requiredDemoAssets) {
    const assetPath = new URL('../public' + pathname, import.meta.url)
    const svg = readFileSync(assetPath, 'utf8')
    assert.match(svg, /^<svg[\s>]/)
    assert.doesNotMatch(svg, /<script|<foreignObject|onload=|onclick=|<iframe|xlink:href|<!DOCTYPE|<image\b/i)
    assert.equal(simulated(pathname).kind, 'next', pathname)
  }
  for (const pathname of ['/demo', '/demo/', '/demo/replay-film', '/demo/memories/private.svg', '/demo/memories/recovery-bloom.svg/other', '/demo/../admin']) {
    const result = simulated(pathname)
    assert.equal(result.kind, 'rewrite', pathname)
    assert.equal(result.status, 404)
  }
  assert.equal(simulated('/home').kind, 'rewrite', 'Home rewrite remains separate')
  assert.equal(simulated('/life-map').kind, 'next')
  assert.equal(simulated('/demonstration').kind, 'next', 'unrelated demonstration route must not be captured by /demo')
  for (const pathname of ['/demographics', '/administration', '/internalization', '/brand-systematic']) {
    assert.equal(simulated(pathname).kind, 'next', `unrelated sibling route was captured: ${pathname}`)
  }
  for (const pathname of ['/admin', '/admin/private', '/internal', '/internal/private', '/brand-system', '/brand-system/private']) {
    const result = simulated(pathname)
    assert.equal(result.kind, 'rewrite', `protected route must remain gated: ${pathname}`)
    assert.equal(result.status, 404)
  }
  assert.equal(simulated('/ordinary').kind, 'next', 'unrelated routes stay unaffected')
})
