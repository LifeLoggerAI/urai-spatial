import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const tests = [
  'tests/aaa-world-artifact-contract.test.mjs',
  'tests/asset-factory-phase6-contract.test.mjs',
  'tests/body-biometric-contract.test.mjs',
  'tests/field-reconstruction-phase5-contract.test.mjs',
  'tests/home-cohesion-contract.test.mjs',
  'tests/lifemap-cinematic-contract.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
  'tests/orb-companion-contract.test.mjs',
  'tests/quest-entry-lifecycle.test.mjs',
  'tests/quest-ended-during-attach.test.mjs',
  'tests/quest-pointer-cancel.test.mjs',
  'tests/replay-memory-theater-contract.test.mjs',
  'tests/spatial-launch-boundaries.test.mjs',
  'tests/unit-runner-coverage.test.mjs',
  'tests/v2-asset-gating.test.mjs',
  'tests/xr-runtime-contract.test.mjs',
]

for (const testPath of tests) {
  if (!fs.existsSync(testPath)) {
    console.error(`MISSING ${testPath}`)
    process.exit(1)
  }
  const result = spawnSync(process.execPath, ['--import', 'tsx', '--test', testPath], {
    encoding: 'utf8',
  })
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
