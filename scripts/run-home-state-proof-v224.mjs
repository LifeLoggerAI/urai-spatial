import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const target = new URL('./capture-home-state-proof.mjs', import.meta.url)
const source = await readFile(target, 'utf8')
const required = [
  "record.visibleWorld === 'v226-rooted-inhabited-memory-sanctuary'",
  "record.runtimeAssets?.includes('HomeWorldProductionV223Geometry.tsx')",
  "record.runtimeAssets?.includes('rock-tile-floor-diff-1k.webp')",
  "record.runtimeAssets?.includes('rock-tile-floor-normal-gl-1k.webp')",
  "record.runtimeAssets?.includes('rock-tile-floor-arm-1k.webp')",
]
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`V226 Home State committed contract missing ${marker}`)
}
if (source.includes("v223-authored-inhabited-memory-sanctuary")) throw new Error('V226 Home State committed contract retains obsolete V223 visible-world authority')

const result = spawnSync(process.execPath, ['scripts/capture-home-state-proof.mjs'], {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
})
if (result.status !== 0) process.exitCode = result.status ?? 1
