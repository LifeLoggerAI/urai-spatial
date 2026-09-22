import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const focusedRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')
const compactRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url), 'utf8')

const requiredFocusedTests = [
  '../tests/canonical-route-compatibility.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/ground-zero-ambiguity-contract.test.mjs',
  'tests/lived-world-core-reconstruction-contract.test.mjs',
  'tests/global-emotional-field-core-contract.test.mjs',
  'tests/home-avatar-embodiment-state-contract.test.mjs',
  'tests/home-avatar-presentation-contract.test.mjs',
  'tests/home-experience-controller-contract.test.mjs',
  'tests/home-emotional-weather-canon-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/private-source-media-consent-contract.test.mjs',
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

const systemicVisualConvergenceTests = [
  'tests/home-current-art-repair-contract.test.mjs',
  'tests/orb-v286-biomorphic-reliquary-contract.test.mjs',
  'tests/lifemap-review-repair-contract.test.mjs',
  'tests/lifemap-cosmic-canon-contract.test.mjs',
  'tests/lifemap-aaa-composition-contract.test.mjs',
  'tests/lifemap-stable-geography-contract.test.mjs',
  'tests/focus-review-regression-contract.test.mjs',
  'tests/replay-final-rail-authority-contract.test.mjs',
]

const extendedCanonAcceptanceTests = [
  'tests/lifemap-memory-star-presentation-contract.test.mjs',
  'tests/possible-futures-spatial-truth-contract.test.mjs',
  'tests/ritual-reference-capture-contract.test.mjs',
  'tests/rituals-experience-contract.test.mjs',
  'tests/shadow-embodied-realm-contract.test.mjs',
  'tests/shadow-route-convergence-contract.test.mjs',
  'tests/legacy-archive-world-contract.test.mjs',
  'tests/haptic-runtime-contract.test.mjs',
  'tests/spatial-audio-behavior.test.mjs',
  'tests/spatial-positioned-audio-contract.test.mjs',
  'tests/replay-source-audio-truth-contract.test.mjs',
  'tests/guardian/council-reference-canon.test.mjs',
  'tests/guardian/passport-council-runtime-canon.test.mjs',
  'tests/guardian/legacy-reference-canon.test.mjs',
  'tests/guardian/shadow-reference-canon.test.mjs',
]

test('both focused unit runners include critical Spatial public contract tests', () => {
  for (const testPath of requiredFocusedTests) {
    assert.ok(focusedRunnerSource.includes(`'${testPath}'`), `focused unit runner must include ${testPath}`)
    assert.ok(compactRunnerSource.includes(`'${testPath}'`), `compact unit runner must include ${testPath}`)
  }
})

test('compact unit runner includes the V101 retained-pixel repair contract', () => {
  assert.ok(compactRunnerSource.includes("'tests/home-v88-retained-pixel-repair-contract.test.mjs'"))
})

test('compact CI executes the systemic Home, Orb, Life Map, Focus, Replay, and stable-geography regressions', () => {
  for (const testPath of systemicVisualConvergenceTests) {
    assert.ok(compactRunnerSource.includes(`'${testPath}'`), `compact unit runner must include ${testPath}`)
  }
})


test('both focused unit runners include expanded canon acceptance contracts', () => {
  for (const testPath of extendedCanonAcceptanceTests) {
    assert.ok(focusedRunnerSource.includes(`'${testPath}'`), `focused unit runner must include ${testPath}`)
    assert.ok(compactRunnerSource.includes(`'${testPath}'`), `compact unit runner must include ${testPath}`)
  }
})
