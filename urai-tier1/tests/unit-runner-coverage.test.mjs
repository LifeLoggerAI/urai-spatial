import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const focusedRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests.mjs', import.meta.url), 'utf8')
const compactRunnerSource = fs.readFileSync(new URL('../scripts/run-unit-contract-tests-compact.mjs', import.meta.url), 'utf8')

const requiredFocusedTests = [
  'tests/lifemap-founder-harness-contract.test.mjs',
  'tests/authorized-export-download.test.mjs',
  'tests/operational-export-client.test.mjs',
  'tests/owned-memory-media-client.test.mjs',
  'tests/scenario-council-session-behavior.test.mjs',
  'tests/geographic-location-request.test.mjs',
  'tests/dependency-security-regressions.test.mjs',
  'tests/localization-flow.test.mjs',
  'tests/localization-journey-copy.test.mjs',
  'tests/person-presence-provider-contract.test.mjs',
  'tests/person-presence-voice-contract.test.mjs',
  'tests/person-presence-session-contract.test.mjs',
  'tests/person-render-binding-promotion.test.mjs',
  'tests/replay-person-presence-ui.test.mjs',
  'tests/replay-person-presence-lifecycle.test.mjs',
  'tests/life-model-functions-contract.test.mjs',
  'tests/life-model-data-rights-contract.test.mjs',
  'tests/life-model-privacy-boundary.test.mjs',
  'tests/life-model-kernel.test.mjs',
  'tests/scene-truth-life-model-compiler.test.mjs',
  'tests/replay-life-model-authority.test.mjs',
  'tests/life-movie-life-model-binding.test.mjs',
  'tests/life-movie-runtime-contract.test.mjs',
  'tests/life-movie-runtime-binding-contract.test.mjs',
  'tests/focus-review-regression-contract.test.mjs',
  'tests/world-return-destination.test.mjs',
  'tests/replay-transition-evidence-contract.test.mjs',
  'tests/dispatcher-transient-retry-contract.test.mjs',
  'tests/home-runtime-cursor-cleanup-contract.test.mjs',
  'tests/home-movement-lifecycle.test.mjs',
  'tests/status-live-authority-contract.test.mjs',
  'tests/open-graph-asset-ownership-contract.test.mjs',
  'tests/captured-reality-life-model-binding.test.mjs',
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
