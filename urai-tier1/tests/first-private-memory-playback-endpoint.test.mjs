import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const path = new URL('../src/spatial/memory/ownedMemoryMediaPlayback.ts', import.meta.url)
const src = readFileSync(path, 'utf8')
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
function endpoint(nodeEnv, flag, configured, project) {
  const m = { exports: {} }
  const proc = { env: { NODE_ENV: nodeEnv, NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR: flag, NEXT_PUBLIC_FIREBASE_PROJECT_ID: configured } }
  vm.runInNewContext('(function(exports,require,module) {' + js + '\n})', { process:proc, URL, AbortController, Blob, setTimeout, clearTimeout })(m.exports, () => ({}), m)
  return m.exports.ownedMemoryPlaybackEndpoint({
    memoryId:'syntheticMemory', receiptId:'a'.repeat(64), authorityHash:'b'.repeat(64),
    expiresAt:Date.now()+30000, storageGeneration:'42',
  }, project)
}
test('isolated development owner uses local protected Functions emulator', () => {
  assert.match(endpoint('development','true','demo-urai-auth-journey','demo-urai-auth-journey'),
    /^http:\/\/127\.0\.0\.1:5001\/demo-urai-auth-journey\/us-central1\/streamMemoryMediaPlayback\?/)
})
test('normal production always uses cloud endpoint', () => {
  assert.match(endpoint('production','true','demo-urai-auth-journey','demo-urai-auth-journey'),
    /^https:\/\/us-central1-demo-urai-auth-journey\.cloudfunctions\.net\//)
})
test('non-demo or mismatched projects never redirect to localhost', () => {
  for (const project of ['urai-4dc1d','demo-another-project']) {
    assert.match(endpoint('development','true','demo-urai-auth-journey',project),/^https:\/\//)
  }
  assert.match(endpoint('development','true','urai-4dc1d','urai-4dc1d'),/^https:\/\//)
  assert.match(endpoint('development','false','demo-urai-auth-journey','demo-urai-auth-journey'),/^https:\/\//)
})
