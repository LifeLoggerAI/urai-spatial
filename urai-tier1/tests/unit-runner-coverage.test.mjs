import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const runnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')

const requiredFocusedTests = [
  'tests/body-biometric-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/production-release-identity-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
]

test('focused unit runner includes critical Spatial public and release contract tests', () => {
  for (const testPath of requiredFocusedTests) {
    assert.ok(runnerSource.includes(`'${testPath}'`), `focused unit runner must include ${testPath}`)
  }
})
