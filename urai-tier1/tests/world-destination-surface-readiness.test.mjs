import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/spatial/world/worldEvents.ts', import.meta.url), 'utf8')
const start = source.indexOf('export function destinationSurfaceReady(')
const end = source.indexOf('\nfunction shouldBeginHomeAscent(', start)
assert.ok(start >= 0 && end > start, 'maintained destination readiness implementation not found')
const js = ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText

function readinessFor(available = []) {
  const module = { exports: {} }
  const document = { querySelector(selector) { return available.includes(selector) ? { getAttribute: name => name === 'data-memory-status' ? 'loading' : null } : null } }
  new Function('module', 'exports', 'document', js)(module, module.exports, document)
  return module.exports.destinationSurfaceReady
}

test('Focus route requires its actual chamber to mount', () => {
  const marker = '[data-testid="urai-final-focus-chamber"]'
  assert.equal(readinessFor()('focus'), false)
  assert.equal(readinessFor([marker])('focus'), true)
})

test('Life Map requires canonical, signed-out or authored fallback surface', () => {
  const markers = [
    '[data-testid="urai-r3f-canonical-lifemap"]',
    '[data-testid="urai-life-map-signed-out-threshold"]',
    '[data-testid="urai-life-map-authored-fallback"]',
  ]
  assert.equal(readinessFor()('life-map'), false)
  for (const marker of markers) assert.equal(readinessFor([marker])('life-map'), true, marker)
})

test('Replay and Passport readiness gates remain enforced', () => {
  for (const [destination, marker] of [
    ['replay', '[data-testid="cinematic-replay-client"]'],
    ['passport', 'main[data-route-owner="passport-ownership-vault"]'],
  ]) {
    assert.equal(readinessFor()(destination), false)
    assert.equal(readinessFor([marker])(destination), true)
  }
})

test('Other destinations keep their existing fallback behavior', () => {
  assert.equal(readinessFor()('home'), true)
})
