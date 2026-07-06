import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const runnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')
const compactRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url), 'utf8')

const requiredFocusedTests = [
  'tests/brand-authority-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
]

test('focused unit runners include critical Spatial public contract tests', () => {
  for (const testPath of requiredFocusedTests) {
    assert.ok(runnerSource.includes(`'${testPath}'`), `full focused runner must include ${testPath}`)
    assert.ok(compactRunnerSource.includes(`'${testPath}'`), `compact focused runner must include ${testPath}`)
  }
})
