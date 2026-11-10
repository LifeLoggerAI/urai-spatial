import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const focusedRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')
const compactRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url), 'utf8')

const requiredFocusedTests = [
  'tests/hidden-memory-selection-denial.test.mjs',
  'tests/launch-ungating-runtime-contract.test.mjs',
  'tests/browser-location-store.test.mjs',
  'tests/selected-memory-live-lifecycle.test.mjs',
  'tests/private-media-bucket-failclosed.test.mjs',
  'tests/replay-source-media-behavior.test.mjs',
  'tests/life-movie-privacy-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/provider-boundary-contract.test.mjs',
  'tests/provider-hosting-runtime-contract.test.mjs',
  'tests/provider-preview-routing-contract.test.mjs',
  'tests/public-estate-constellation-contract.test.mjs',
  'tests/security-boundary-contract.test.mjs',
  'tests/sensory-asset-resolution-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/spatial-production-audio-runtime-contract.test.mjs',
  'tests/spatial-missing-resource-diagnostic-contract.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
  'tests/xr-static-gate-diagnostics-contract.test.mjs',
]

test('both focused unit runners include critical Spatial public contract tests', () => {
  for (const testPath of requiredFocusedTests) {
    assert.ok(focusedRunnerSource.includes(`'${testPath}'`), `focused unit runner must include ${testPath}`)
    assert.ok(compactRunnerSource.includes(`'${testPath}'`), `compact unit runner must include ${testPath}`)
  }
})