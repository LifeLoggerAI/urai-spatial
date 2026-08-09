import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const tests = [
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/v1-aaa-asset-program-matrix-contract.test.mjs',
  'tests/geographic-location-vault.test.mjs',
  'tests/geographic-location-client-contract.test.mjs',
  'tests/geographic-maps-launch-policy.test.mjs',
  'tests/maps-cloud-bootstrap-contract.test.mjs',
  'tests/urai-ecosystem-governance-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/asset-validation-fail-closed-contract.test.mjs',
  'tests/automatic-hosting-recovery-contract.test.mjs',
  'tests/accessibility-performance-source-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/continuous-spatial-restoration-contract.test.mjs',
  'tests/embodied-exploration-contract.test.mjs',
  'tests/exact-static-release-contract.test.mjs',
  'tests/field-reconstruction-phase5-contract.test.mjs',
  'tests/final-aaa-world-convergence-contract.test.mjs',
  'tests/firebase-hosting-capture-workflow-contract.test.mjs',
  'tests/firebase-hosting-recovery-contract.test.mjs',
  'tests/home-cohesion-contract.test.mjs',
  'tests/home-ground-lifemap-art-bible-contract.test.mjs',
  'tests/lifemap-cinematic-contract.test.mjs',
  'tests/lifemap-deep-link-controls-contract.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
  'tests/mirror-spatial-realm-contract.test.mjs',
  'tests/mirror-canonical-owner-hydration-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/provider-boundary-contract.test.mjs',
  'tests/provider-hosting-runtime-contract.test.mjs',
  'tests/post-deploy-ground-smoke-contract.test.mjs',
  'tests/persistent-world-doorway-regression.test.mjs',
  'tests/quest-entry-lifecycle.test.mjs',
  'tests/quest-ended-during-attach.test.mjs',
  'tests/quest-pointer-cancel.test.mjs',
  'tests/release-control-smoke-boundary-contract.test.mjs',
  'tests/replay-memory-theater-contract.test.mjs',
  'tests/replay-operations-contract.test.mjs',
  'tests/replay-product-controls-contract.test.mjs',
  'tests/replay-mobile-control-clearance-contract.test.mjs',
  'tests/route-owner-exclusivity-contract.test.mjs',
  'tests/security-boundary-contract.test.mjs',
  'tests/selected-memory-production-contract.test.mjs',
  'tests/sensory-asset-resolution-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/spatial-production-audio-runtime-contract.test.mjs',
  'tests/tier0-world-navigation-canon.test.mjs',
  'tests/spatial-missing-resource-diagnostic-contract.test.mjs',
  'tests/unit-runner-coverage.test.mjs',
  'tests/v2-asset-gating.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
  'tests/xr-static-gate-diagnostics-contract.test.mjs',
]

for (const testPath of tests) {
  if (!fs.existsSync(testPath)) {
    console.error(`MISSING ${testPath}`)
    process.exit(1)
  }
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', testPath], { encoding: 'utf8' })
  if (result.status === 0) {
    console.log(`PASS ${testPath}`)
    continue
  }
  console.error(`FAIL ${testPath}`)
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status ?? 1)
}

console.log(`PASS all ${tests.length} focused contract suites`)
