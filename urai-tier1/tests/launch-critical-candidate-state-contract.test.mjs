import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const verifierPath = new URL('../../scripts/verify-launch-critical-assets.mjs', import.meta.url)
const auditorPath = new URL('../../scripts/audit-launch-critical-artifact.mjs', import.meta.url)
const candidateAuditorPath = new URL('../../scripts/audit-launch-critical-candidate-bundle.mjs', import.meta.url)
const workflowPath = new URL('../../.github/workflows/launch-critical-asset-forge.yml', import.meta.url)
const verifier = fs.readFileSync(verifierPath, 'utf8')
const auditor = fs.readFileSync(auditorPath, 'utf8')
const candidateAuditor = fs.readFileSync(candidateAuditorPath, 'utf8')
const workflow = fs.readFileSync(workflowPath, 'utf8')

test('launch-critical verifier separates manifest promotion from receipt claims', () => {
  assert.match(verifier, /receiptReleaseState/)
  assert.match(verifier, /manifestReleaseState/)
  assert.match(verifier, /receipt cannot be production-ready with candidate compression status/)
  assert.doesNotMatch(verifier, /model candidate receipt must carry candidate compression status/)
  assert.doesNotMatch(verifier, /asset\.releaseState === 'production-ready' && receipt\.compressionStatus\.includes\('candidate'\)/)
})

test('independent launch-critical auditor enforces manifest promotion authority', () => {
  assert.match(auditor, /const receiptReleaseState = String\(receipt\.releaseState \|\| ''\)/)
  assert.match(auditor, /const productionReady = asset\.releaseState === 'production-ready'/)
  assert.match(auditor, /manifestReleaseState: asset\.releaseState/)
  assert.match(auditor, /receiptReleaseState/)
  assert.match(auditor, /candidateOnly: results\.length === manifest\.assets\.length/)
  assert.doesNotMatch(auditor, /const productionReady = receiptReleaseState === 'production-ready'/)
  assert.doesNotMatch(auditor, /model candidate receipt must carry candidate compression status/)
})

test('candidate bundle audit is isolated, retainable, and rejects production receipt authority', () => {
  assert.match(candidateAuditor, /URAI_CANDIDATE_BUNDLE_ROOT/)
  assert.match(candidateAuditor, /retainAuditRoot/)
  assert.match(candidateAuditor, /releaseState: 'candidate-not-production-ready'/)
  assert.match(candidateAuditor, /receipt\.releaseState !== 'candidate-not-production-ready'/)
  assert.match(candidateAuditor, /candidate receipt .* must declare candidate-not-production-ready/)
  assert.match(candidateAuditor, /cwd: auditRoot/)
  assert.match(candidateAuditor, /if \(!retainAuditRoot\) fs\.rmSync/)
  assert.doesNotMatch(candidateAuditor, /fs\.writeFileSync\(path\.join\(sourceRoot, manifestRelativePath\)/)
})

test('forge workflow verifies current governed source and uploads the exact audited candidate bundle', () => {
  const governedVerifier = 'node scripts/verify-governed-asset-promotion.mjs'
  const governedContract = 'node --test --test-concurrency=1 tests/home-entry-governed-production-contract.test.mjs'
  const candidateForge = 'node scripts/forge-launch-critical-assets.mjs'
  const candidateVerifier = 'node scripts/verify-launch-critical-assets.mjs'
  const candidateAudit = 'node scripts/audit-launch-critical-candidate-bundle.mjs'
  const auditedBundlePath = '.urai-artifacts/launch-critical-candidate-bundle/'
  assert.match(workflow, /Verify fail-closed rehearsal control before candidate generation/)
  assert.match(workflow, /Verify exact governed Home source before candidate generation/)
  assert.match(workflow, /Independently audit and retain exact candidate bundle/)
  assert.match(workflow, /URAI_CANDIDATE_BUNDLE_ROOT: \.urai-artifacts\/launch-critical-candidate-bundle/)
  assert.match(workflow, /Upload exact audited candidate bundle/)
  assert.ok(workflow.includes(`path: ${auditedBundlePath}`))
  assert.doesNotMatch(workflow, /path: \|\n\s+urai-tier1\/public\/assets\/urai\/generated\/\n\s+operations\/assets\/generated-receipts\/\n\s+operations\/assets\/launch-critical-assets\.json/)
  assert.match(workflow, /- 'scripts\/verify-governed-asset-promotion\.mjs'/)
  assert.equal(workflow.indexOf(governedVerifier) < workflow.indexOf(candidateForge), true)
  assert.equal(workflow.indexOf(governedContract) < workflow.indexOf(candidateForge), true)
  assert.equal(workflow.indexOf(candidateAudit) > workflow.indexOf(candidateVerifier), true)
  assert.equal(workflow.indexOf('Upload exact audited candidate bundle') > workflow.indexOf(candidateAudit), true)
  assert.doesNotMatch(workflow, /Independently audit governed production state before candidate generation/)
})

function currentHomeGateScript() {
  const step = workflow.split(/      - name: (?:Verify exact governed Home source|Run governed Home production contract) before candidate generation\n/)[1]?.split('      - name: ')[0]
  assert.ok(step, 'current Home source gate is present')
  assert.match(step, /if: steps\.mode\.outputs\.promotion != 'true' && steps\.mode\.outputs\.replacement != 'true'/)
  const shell = step.split('        run: |\n')[1]
  assert.ok(shell, 'current Home source gate has an executable shell')
  return shell.split('\n').filter(line => line.trim()).map(line => {
    assert.ok(line.startsWith('          '), 'gate shell keeps YAML indentation')
    return line.slice(10)
  }).join('\n')
}

function runCurrentHomeGate(releaseState, contractExit = 0) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'urai-current-home-source-gate-'))
  try {
    const marker = path.join(directory, 'contract-invoked')
    fs.writeFileSync(path.join(directory, 'node'), `#!/bin/bash
set -euo pipefail
if [[ "$1" == "-e" ]]; then
  printf '%s' "$URAI_GATE_TEST_STATE"
elif [[ "$*" == "--test --test-concurrency=1 tests/home-entry-governed-production-contract.test.mjs" ]]; then
  printf '%s' "$*" > "$URAI_GATE_TEST_MARKER"
  exit "$URAI_GATE_TEST_CONTRACT_EXIT"
else
  echo "Unexpected source-gate node invocation: $*" >&2
  exit 97
fi
`, { mode: 0o755 })
    const result = spawnSync('bash', ['-c', currentHomeGateScript()], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${directory}:${process.env.PATH}`,
        URAI_GATE_TEST_STATE: releaseState,
        URAI_GATE_TEST_MARKER: marker,
        URAI_GATE_TEST_CONTRACT_EXIT: String(contractExit),
      },
    })
    assert.equal(result.error, undefined)
    return { ...result, invoked: fs.existsSync(marker) }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true })
  }
}

for (const state of ['pending-final-review', 'production-ready']) {
  test(`current workflow invokes the exact Home source contract for ${state}`, () => {
    const result = runCurrentHomeGate(state)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.invoked, true)
  })
  test(`current workflow propagates the Home source contract failure for ${state}`, () => {
    const result = runCurrentHomeGate(state, 23)
    assert.equal(result.status, 23, result.stderr)
    assert.equal(result.invoked, true)
  })
}

for (const state of ['', 'candidate-not-production-ready', 'unexpected']) {
  test(`current workflow rejects unsupported Home state ${JSON.stringify(state)}`, () => {
    const result = runCurrentHomeGate(state)
    assert.equal(result.status, 1)
    assert.equal(result.invoked, false)
    assert.match(result.stderr, /Unsupported Home releaseState:/)
  })
}
