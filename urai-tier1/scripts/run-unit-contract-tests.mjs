import { spawn } from 'node:child_process'
import fs from 'node:fs'

const focusedContractTests = [
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/brand-authority-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/field-reconstruction-phase5-contract.test.mjs',
  'tests/home-cohesion-contract.test.mjs',
  'tests/lifemap-cinematic-contract.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/replay-memory-theater-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/unit-runner-coverage.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
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
