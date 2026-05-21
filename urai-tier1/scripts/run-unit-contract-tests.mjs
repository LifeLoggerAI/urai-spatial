import { spawn } from 'node:child_process'

const focusedContractTests = [
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/field-reconstruction-phase5-contract.test.mjs',
  'tests/home-scene-routing.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
  'tests/replay-memory-theater-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
]

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
