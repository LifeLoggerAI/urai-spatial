import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'

const focusPage = readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const focusClient = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const replayPage = readFileSync(new URL('../src/app/replay/page.tsx', import.meta.url), 'utf8')
const replayClient = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const lifeMoviePage = readFileSync(new URL('../src/app/life-movie/page.tsx', import.meta.url), 'utf8')
const lifeMovieClient = readFileSync(new URL('../src/app/life-movie/LifeMovieClient.tsx', import.meta.url), 'utf8')
const visibleLayer = readFileSync(new URL('../src/app/UraiAutonomousV1Layer.tsx', import.meta.url), 'utf8')
const selection = readFileSync(new URL('../src/spatial/memory/useSelectedMemory.ts', import.meta.url), 'utf8')
const smoke = readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')

const routes = [
  { source: focusPage, client: './FocusChamberClient', heading: 'Focus Memory Star', action: 'Open Life Map' },
  { source: replayPage, client: './CinematicReplayClient', heading: 'Choose a memory to enter Replay.', action: 'Choose a memory' },
]

// Keep real React server rendering; only the browser-only client is controlled.
function renderRoute({ source, client }, suspended) {
  const require = createRequire(import.meta.url)
  const pending = new Promise(() => {})
  function RouteClient() {
    if (suspended) throw pending
    return createElement('main', { 'data-selected-client': client })
  }
  const compiled = ts.transpileModule(source, {
    fileName: 'page.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  runInNewContext(compiled.outputText, {
    exports,
    require(id) {
      if (id === client) return { __esModule: true, default: RouteClient }
      if (id.endsWith('.css')) return {}
      assert.ok(id === 'react' || id === 'react/jsx-runtime', `Unexpected route import ${id}`)
      return require(id)
    },
  })
  return renderToStaticMarkup(createElement(exports.default))
}

test('Focus and Replay expose neutral headings and working map links while the query client suspends', () => {
  for (const route of routes) {
    const html = renderRoute(route, true)
    assert.equal((html.match(/<main\b/g) ?? []).length, 1)
    assert.equal(html.match(/<h1\b[^>]*>([^<]+)<\/h1>/)?.[1], route.heading)
    const link = html.match(/<a\b[^>]*href="(.*?)"[^>]*>([^<]+)<\/a>/)
    assert.ok(link, 'The neutral entry needs an ordinary link before JavaScript loads')
    assert.ok(['/life-map', '/life-map/'].includes(link[1]))
    assert.equal(link[2].trim(), route.action)
    assert.doesNotMatch(html, /data-(?:memory-id|manifest-id|node|star-id|selected-client)|urai-final-focus-chamber|cinematic-replay-client|quiet-reset|demo=1/i)
  }
})

test('each resolved boundary mounts its own client once and removes the neutral threshold', () => {
  for (const route of routes) {
    const html = renderRoute(route, false)
    assert.equal((html.match(/<main\b/g) ?? []).length, 1)
    assert.ok(html.includes(`data-selected-client="${route.client}"`))
    assert.ok(!html.includes(route.heading))
  }
})

test('Life Movie hydrates memory and movie identity without useSearchParams', () => {
  assert.doesNotMatch(lifeMoviePage, /Suspense|Life Movie loading/)
  assert.match(lifeMoviePage, /return <LifeMovieClient \/>/)
  assert.doesNotMatch(lifeMovieClient, /useSearchParams/)
  assert.match(lifeMovieClient, /new URLSearchParams\(window\.location\.search\)/)
  assert.match(lifeMovieClient, /memoryId: sanitizeMemoryId\(params\.get\('memoryId'\)\)/)
  assert.match(lifeMovieClient, /movieId: sanitizeMemoryId\(params\.get\('movieId'\)\)/)
  assert.match(lifeMovieClient, /setIdentityReady\(true\)/)
  assert.match(lifeMovieClient, /window\.addEventListener\('popstate', hydrateIdentity\)/)
  assert.match(lifeMovieClient, /window\.removeEventListener\('popstate', hydrateIdentity\)/)
})

test('only route-owned clients stamp the resolved memory, manifest and node on their visible surfaces', () => {
  assert.doesNotMatch(visibleLayer, /FocusWorld|ReplayWorld|["']\/(?:focus|replay)["']/)
  assert.match(focusClient, /data-testid="urai-final-focus-chamber"/)
  assert.match(replayClient, /data-testid="cinematic-replay-client"/)
  for (const source of [focusClient, replayClient]) {
    assert.match(source, /const result = useSelectedMemory\(\)/)
    assert.match(source, /data-memory-id=\{memory\??\.id\}/)
    assert.match(source, /data-manifest-id=\{memory\??\.replayManifest\.id\}/)
    assert.match(source, /data-node=\{memory\??\.star\.id\}/)
  }
})

test('same-path query changes fence the previous selection and its Focus camera', () => {
  assert.match(selection, /useSearchParams\(\)\.toString\(\)/)
  assert.match(selection, /return selection\.key === selectionKey \? selection\.result : LOADING/)
  assert.match(focusClient, /const locationSearch = useSearchParams\(\)\.toString\(\)/)
  assert.match(focusClient, /checkpoint === 'focus-return:' \+ memory\.star\.id/)
  assert.match(focusClient, /consumeFocusViewHandoff\(ticket!, memory\.ownerId, memory\.id, memory\.replayManifest\.id, memory\.star\.id\)/)
})

test('Focus sends only the selected memory, manifest and node to Replay and back to Life Map', () => {
  assert.match(focusClient, /if \(!memory\) return null/)
  assert.match(focusClient, /new URLSearchParams\(\{ memoryId: memory\.id, manifestId: memory\.replayManifest\.id, node: memory\.star\.id/)
  assert.match(focusClient, /if \(memory\.demo\) next\.set\('demo', '1'\)/)
  assert.match(focusClient, /query\.set\('memoryId', memory\.demo \? memory\.star\.id : memory\.id\)/)
  assert.match(focusClient, /query\.set\('node', memory\.star\.id\)/)
  assert.match(focusClient, /query\.set\('manifestId', memory\.replayManifest\.id\)/)
})

test('strict smoke waits for an exact visible hydrated identity', () => {
  assert.match(smoke, /await page\.waitForFunction\(/)
  assert.match(smoke, /element\.getAttribute\('data-memory-id'\) === expected\.memoryId/)
  assert.match(smoke, /element\.getAttribute\('data-manifest-id'\) === expected\.manifestId/)
  assert.match(smoke, /element\.getAttribute\('data-node'\) === expected\.node/)
  assert.match(smoke, /page\.locator\(visibleSelector\)\.first\(\)/)
})
