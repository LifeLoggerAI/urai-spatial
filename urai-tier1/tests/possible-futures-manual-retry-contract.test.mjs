import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/app/possible-futures/PossibleFuturesClient.tsx', import.meta.url), 'utf8')
const parsed = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(parsed.diagnostics ?? [], [], 'Possible Futures TSX must parse')
const start = source.indexOf('  const submitManual = async () => {')
const end = source.indexOf('  if (!isOwnerCurrent()) return (', start)
assert.ok(start >= 0 && end > start)
const submit = source.slice(start, end)
test('manual retry reuses the same operation ID while the user changes nothing', () => {
  assert.match(submit, /manualAttempt\.current\.fingerprint !== fingerprint/)
  assert.match(submit, /operationId: manualAttempt\.current\.operationId/)
  assert.match(submit, /setBranchIds\(result\.branchIds\)/)
})
test('unknown save outcome returns to editable Manual Scenario instead of Create New Scenario', () => {
  const catchStart = submit.lastIndexOf('} catch (error) {')
  assert.ok(catchStart >= 0)
  const failure = submit.slice(catchStart)
  assert.match(failure, /setSetup\('manual'\)/)
  assert.doesNotMatch(failure, /setSetup\('error'\)/)
  assert.match(failure, /Retry the same operation or edit your branches/)
  assert.doesNotMatch(failure, /manualAttempt\.current\s*=\s*null/)
})
test('accepted save clears retry identity and enters the actual exploring world', () => {
  assert.match(submit, /manualAttempt\.current = null/)
  assert.match(submit, /setSetup\('exploring'\)/)
  assert.match(submit, /SCENARIO_MANUAL_BRANCH_RECEIPT_INVALID/)
})
test('manual mode remains a user-editable retry surface', () => {
  assert.match(source, /setup==='manual'\?<div/)
  assert.match(source, /onClick=\{submitManual\}/)
  assert.match(source, /onChange=\{\(e\)=>setManualSummaries/)
})
