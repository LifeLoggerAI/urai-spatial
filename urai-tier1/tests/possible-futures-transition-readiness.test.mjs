import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const events = read('src/spatial/world/worldEvents.ts')
const controller = read('src/spatial/world/WorldTransitionController.tsx')
const future = read('src/app/possible-futures/PossibleFuturesClient.tsx')

const from = events.indexOf('export function destinationSurfaceReady(')
const until = events.indexOf('\nfunction shouldBeginHomeAscent(', from)
assert.ok(from >= 0 && until > from, 'Canonical destination readiness function must exist')
const code = events.slice(from, until).replace(/^export /, '')
const transpiled = ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(transpiled.diagnostics ?? [], [], 'The production readiness function must transpile')

const selectorForFuture = 'main[data-testid="urai-possible-futures"]'
const readyWith = mounted => {
  const document = { querySelector: selector => mounted.includes(selector) ? { nodeType: 1 } : null }
  return new Function('document', transpiled.outputText + '\nreturn destinationSurfaceReady;')(document)
}

test('the URL alone never satisfies readiness when Possible Futures has not mounted', () => {
  assert.equal(readyWith([])('possible-futures'), false)
  assert.equal(readyWith(['main[data-testid="some-other-world"]'])('possible-futures'), false)
})

test('the actual hypothetical Scenario surface proves Possible Futures readiness', () => {
  assert.match(future, /<main data-testid="urai-possible-futures" data-truth-mode="scenario"/)
  assert.equal(readyWith([selectorForFuture])('possible-futures'), true)
})

test('existing Replay and Passport readiness requirements stay unchanged', () => {
  assert.equal(readyWith([])('replay'), false)
  assert.equal(readyWith(['[data-testid="cinematic-replay-client"]'])('replay'), true)
  assert.equal(readyWith([])('passport'), false)
  assert.equal(readyWith(['main[data-route-owner="passport-ownership-vault"]'])('passport'), true)
})

test('both travel recovery paths reuse destination surface readiness', () => {
  assert.match(events, /currentLocation === startingLocation \|\| !destinationSurfaceReady\(request.destination\)/)
  assert.match(controller, /if \(destinationSurfaceReady\(request.destination\)\) clearTimer\(\)/)
  assert.match(controller, /!destinationSurfaceReady\(request.destination\)/)
  assert.match(controller, /window.location.assign\(href\)/)
})
