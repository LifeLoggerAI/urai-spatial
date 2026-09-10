import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const target = new URL('../tests/final-aaa-world-convergence-contract.test.mjs', import.meta.url)
const source = await readFile(target, 'utf8')

for (const marker of [
  "const activeHomeProduction = read('src/spatial/layout/HomeWorldProductionV223.tsx')",
  "const activeHomeVisual = read('src/spatial/layout/HomeWorldProductionV225PolishV3.tsx')",
  "world\\.setAttribute\\('data-home-v226-certification', 'fresh-exact-head-pixels-required'\\)",
  "world\\.setAttribute\\('data-home-animation-owner', 'v226-rooted-living-memory-presence'\\)",
]) {
  if (!source.includes(marker)) throw new Error(`V226 convergence marker missing: ${marker}`)
}

for (const obsolete of [
  "'data-home-v223-certification', 'fresh-exact-head-pixels-required'",
  "'data-home-v225-certification', 'fresh-exact-head-pixels-required'",
  "'data-home-animation-owner', 'v225-asymmetric-veined-living-memory-presence'",
]) {
  if (source.includes(obsolete)) throw new Error(`Obsolete convergence authority re-entered: ${obsolete}`)
}

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/final-aaa-world-convergence-contract.test.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
})
if (result.status !== 0) process.exitCode = result.status ?? 1
