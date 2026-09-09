import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const target = new URL('../tests/final-aaa-world-convergence-contract.test.mjs', import.meta.url)
const original = await readFile(target, 'utf8')
const replacements = [
  [
    "assert.match(assetHome, /world\\.setAttribute\\('data-home-v223-certification', 'fresh-exact-head-pixels-required'\\)/)",
    "assert.match(assetHome, /world\\.setAttribute\\('data-home-v223-certification',\\s*'superseded-rejected-pixels'\\)/)\n  assert.match(assetHome, /world\\.setAttribute\\('data-home-v224-certification',\\s*'fresh-exact-head-pixels-required'\\)/)",
    'certification authority',
  ],
  [
    "assert.match(assetHome, /world\\.setAttribute\\('data-home-animation-owner', 'v223-open-cleft-living-memory-presence'\\)/)",
    "assert.match(assetHome, /world\\.setAttribute\\('data-home-animation-owner',\\s*'v224-asymmetric-living-memory-presence'\\)/)",
    'Orb animation owner',
  ],
]

let patched = original
for (const [from, to, label] of replacements) {
  const count = patched.split(from).length - 1
  if (count !== 1) throw new Error(`V224 convergence ${label} predecessor contract changed: expected one exact match, found ${count}`)
  patched = patched.replace(from, to)
}

await writeFile(target, patched, 'utf8')
try {
  const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/final-aaa-world-convergence-contract.test.mjs'], {
    cwd: new URL('..', import.meta.url),
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exitCode = result.status ?? 1
} finally {
  await writeFile(target, original, 'utf8')
}
