import { spawn } from 'node:child_process'
import fs from 'node:fs'

const focusedContractTests = [
  'tests/person-presence-provider-contract.test.mjs',
  'tests/person-presence-voice-contract.test.mjs',
  'tests/person-presence-session-contract.test.mjs',
  'tests/person-render-binding-promotion.test.mjs',
  'tests/replay-person-presence-ui.test.mjs',
  'tests/life-model-functions-contract.test.mjs',
  'tests/life-model-data-rights-contract.test.mjs',
  'tests/life-model-privacy-boundary.test.mjs',
  'tests/life-model-kernel.test.mjs',
  'tests/scene-truth-life-model-compiler.test.mjs',
  'tests/replay-life-model-authority.test.mjs',
  'tests/life-movie-life-model-binding.test.mjs',
  'tests/captured-reality-life-model-binding.test.mjs',
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/automatic-hosting-recovery-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/captured-reality-gaussian-v1-contract.test.mjs',
  'tests/captured-reality-private-runtime-contract.test.mjs',
  'tests/captured-reality-source-preparation-contract.test.mjs',
  'tests/captured-reality-private-route-contract.test.mjs',
  'tests/captured-reality-replay-entry-contract.test.mjs',
  'tests/captured-reality-runtime-budget-contract.test.mjs',
  'tests/captured-reality-replay-binding-contract.test.mjs',
  'tests/captured-reality-receipt-contract.test.mjs',
  'tests/embodied-exploration-contract.test.mjs',
  'tests/field-reconstruction-phase5-contract.test.mjs',
  'tests/home-cohesion-contract.test.mjs',
  'tests/home-ground-lifemap-art-bible-contract.test.mjs',
  'tests/lifemap-cinematic-contract.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/launch-ungating-runtime-contract.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/provider-boundary-contract.test.mjs',
  'tests/possible-futures-truth-contract.test.mjs',
  'tests/scenario-server-boundary-contract.test.mjs',
  'tests/provider-hosting-runtime-contract.test.mjs',
  'tests/provider-preview-routing-contract.test.mjs',
  'tests/public-estate-constellation-contract.test.mjs',
  'tests/replay-memory-theater-contract.test.mjs',
  'tests/security-boundary-contract.test.mjs',
  'tests/sensory-asset-resolution-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/spatial-production-audio-runtime-contract.test.mjs',
  'tests/spatial-missing-resource-diagnostic-contract.test.mjs',
  'tests/unit-runner-coverage.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
  'tests/xr-static-gate-diagnostics-contract.test.mjs',
]

const missingTests = focusedContractTests.filter((testPath) => !fs.existsSync(testPath))
if (missingTests.length > 0) {
  console.error('Focused contract test runner references missing test files:')
  for (const testPath of missingTests) console.error(`- ${testPath}`)
  process.exit(1)
}

const child = spawn(process.execPath, ['--import', 'tsx', '--test', ...focusedContractTests], {
  stdio: 'inherit',
  shell: false,
})

child.on('exit', (code, signal) => {
  if (signal) {
    console.error(`Focused contract tests terminated with signal ${signal}`)
    process.exit(1)
  }
  process.exit(code ?? 1)
})