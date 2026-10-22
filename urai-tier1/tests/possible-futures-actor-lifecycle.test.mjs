import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const ts = createRequire(import.meta.url)('typescript')
const source = fs.readFileSync(new URL('../src/app/possible-futures/PossibleFuturesClient.tsx', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true })
assert.deepEqual(compiled.diagnostics ?? [], [], 'The private world TSX must parse')
test('private screen remounts for actor changes and other scenario URLs', () => {
  assert.match(source, /useSyncExternalStore\(subscribeAIActor, getAIActorSnapshot, getServerAIActorSnapshot\)/)
  assert.match(source, /ActorBoundPossibleFuturesClient key=/)
  assert.match(source, /actor\.generation/)
  assert.match(source, /params\.get\('scenario'\)/)
})
test('signed-out screen never contains stale Scenario branches', () => {
  assert.match(source, /data-setup-state="signed-out"/)
  assert.match(source, /The previous owner's Scenario is not displayed/)
  assert.match(source, /if \(!isOwnerCurrent\(\)\) return/)
})
test('post-request loading checks actor ownership and handles cleanup', () => {
  assert.match(source, /if \(!active \|\| !isOwnerCurrent\(\)\) return/)
  assert.match(source, /return \(\) => \{ active = false \}/)
  assert.match(source, /\[existingScenarioId, actor\]/)
})
test('manual and generated branches cannot cross owner or accept malformed receipts', () => {
  assert.match(source, /SCENARIO_GENERATION_NOT_VERIFIED/)
  assert.match(source, /SCENARIO_GENERATION_STATUS_UNRECOGNIZED/)
  assert.match(source, /SCENARIO_MANUAL_BRANCH_RECEIPT_INVALID/)
  assert.match(source, /loaded\.scenario\?\.ownerId !== actor\.uid/)
  assert.match(source, /const loaded = await getPossibleFutureClient\(created\.scenarioId\)/)
})
