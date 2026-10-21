import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const route = readFileSync(new URL('../src/app/internal/first-private-memory/page.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../src/app/internal/first-private-memory/FirstPrivateMemoryDevClient.tsx', import.meta.url), 'utf8')
const ast = ts.createSourceFile('FirstPrivateMemoryDevClient.tsx', client, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
test('first private memory import route is only available to the isolated development emulator', () => {
  assert.match(route, /NODE_ENV\s*!==\s*'development'/)
  assert.match(route, /NEXT_PUBLIC_URAI_AUTH_JOURNEY_EMULATOR/)
  assert.match(route, /demo-urai-auth-journey/)
  assert.match(route, /notFound\(\)/)
  assert.match(route, /index:\s*false/)
})
test('actual client parser remains TSX and uses the server-authorized hidden importer', () => {
  assert.equal(ast.parseDiagnostics.length, 0)
  assert.match(client, /importFirstPreparedMemory\(/)
  assert.match(client, /,\s*true,\s*\{\s*signal:/)
  assert.match(client, /FirstPrivateMemoryUploadIncomplete/)
  assert.match(client, /signedIn/)
  assert.match(client, /onAuthStateChanged/)
  assert.match(client, /receipt\s*\?/)
})
test('actor and selected-file lifecycles abort previous uploads and remove stale receipts', () => {
  assert.match(client, /AbortController/)
  assert.match(client, /\.abort\(\)/)
  assert.match(client, /setReceipt\(null\)/)
  assert.match(client, /inFlight\.current|active\.current/)
  assert.match(client, /epoch\.current/)
  assert.match(client, /setApproved\(|setConfirmed\(/)
})
test('never persist private handoff or manufacture visibility and playback claims in developer UI', () => {
  assert.doesNotMatch(client, /\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|console\.(?:log|debug|info)/)
  assert.match(client, /16\s*\*\s*1024/)
  assert.match(client, /4\s*\*\s*1024\s*\*\s*1024/)
  assert.doesNotMatch(client, /\/focus\?memoryId=/)
  assert.match(client, /FirstPrivateMemoryActivationPanel/)
  assert.doesNotMatch(client, /\/replay\?memoryId=/)
  assert.match(client, /hidden/)
})
