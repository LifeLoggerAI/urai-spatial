import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const source = readFileSync(new URL('../src/app/internal/first-private-memory/FirstPrivateMemoryActivationPanel.tsx', import.meta.url), 'utf8')
test('private activation panel parses as TSX', () => {
  const ast = ts.createSourceFile('activation.tsx', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX)
  assert.equal(ast.parseDiagnostics.length, 0)
})
test('private activation requires current and recent owner authentication', () => {
  assert.match(source, /getIdTokenResult\(true\)/)
  assert.match(source, /auth_time/)
  assert.match(source, /now - Number\(authTime\) > 300/)
  assert.match(source, /auth.currentUser === owner/)
})
test('activation requires a new owner decision', () => {
  assert.match(source, /confirmPrivateReplay: true/)
  assert.match(source, /!confirmed/)
  assert.match(source, /setConfirmed\(false\)/)
})
test('private Focus link requires exact server activation receipt', () => {
  assert.match(source, /result.visibility !== 'private'/)
  assert.match(source, /result.state !== 'owner-confirmed-ready-receipt'/)
  assert.match(source, /activated && ownerReady/)
})
