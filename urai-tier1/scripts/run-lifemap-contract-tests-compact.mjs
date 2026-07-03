import { spawnSync } from 'node:child_process'

const tests = [
  'tests/lifemap-ascent-contract.test.mjs',
  'tests/lifemap-cinematic-contract.test.mjs',
  'tests/lifemap-data-generation.test.mjs',
  'tests/lifemap-focus-regressions.test.mjs',
  'tests/lifemap-scene-behavior.test.mjs',
  'tests/lifemap-trust-loop.test.mjs',
  'tests/lifemap-universe-contract.test.mjs',
  'tests/lifemapEventEmitters.test.mjs',
  'tests/lifemapSceneLogic.test.mjs',
  'tests/lifemapStars.test.mjs',
  'tests/memory-star-phase4-contract.test.mjs',
]

for (const testPath of tests) {
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

console.log(`PASS all ${tests.length} Life Map contract suites`)
