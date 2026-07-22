import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'))
const runner = fs.readFileSync(path.join(process.cwd(), '..', 'scripts', 'run-final-asset-receipt.mjs'), 'utf8')
const verifier = fs.readFileSync(path.join(process.cwd(), '..', 'scripts', 'verify-provider-asset-handoff.mjs'), 'utf8')

test('asset receipt uses the root-aware runner', () => {
  assert.equal(packageJson.scripts['receipt:assets'], 'node ../scripts/run-final-asset-receipt.mjs')
})

test('asset receipt runner derives and enters the repository root', () => {
  assert.match(runner, /fileURLToPath\(import\.meta\.url\)/)
  assert.match(runner, /resolve\(dirname\(fileURLToPath\(import\.meta\.url\)\), '\.\.'\)/)
  assert.match(runner, /process\.chdir\(repoRoot\)/)
})

test('provider verification remains fail closed before receipt generation', () => {
  const verifierIndex = runner.indexOf("await import('./verify-provider-asset-handoff.mjs')")
  const failureIndex = runner.indexOf('if (process.exitCode) process.exit(process.exitCode)')
  const receiptIndex = runner.indexOf("await import('./final-asset-receipt.mjs')")

  assert.ok(verifierIndex >= 0)
  assert.ok(failureIndex > verifierIndex)
  assert.ok(receiptIndex > failureIndex)
})

test('generated receipt keeps provider integration language provenance-qualified', () => {
  assert.match(runner, /Provider provenance handoff:/)
  assert.match(runner, /Asset Factory provenance handoff/)
  assert.match(runner, /unqualified provider-integration claim/)
})

test('provider verifier certifies the current procedural Home owner', () => {
  assert.match(verifier, /urai-tier1\/src\/app\/FinalHomeWorld\.tsx/)
  assert.match(verifier, /data-home-visual-owner=\"final-coherent-sanctuary\"/)
  assert.match(verifier, /data-home-visible-world=\"final-physical-sanctuary-memory-rooms\"/)
  assert.doesNotMatch(verifier, /forbidden:\s*\[[^\]]*FinalHomeWorld from/)
})
