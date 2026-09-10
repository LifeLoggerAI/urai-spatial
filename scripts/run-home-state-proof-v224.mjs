import { readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const target = new URL('./capture-home-state-proof.mjs', import.meta.url)
const original = await readFile(target, 'utf8')
const replacements = [
  ["record.visibleWorld === 'v223-authored-inhabited-memory-sanctuary'", "record.visibleWorld === 'v226-rooted-inhabited-memory-sanctuary'", 'visible world authority'],
  ["record.runtimeAssets?.includes('home-continuous-landscape-v191.glb')", "record.runtimeAssets?.includes('HomeWorldProductionV223Geometry.tsx')", 'runtime geometry authority'],
  ["record.runtimeAssets?.includes('home-ground-place-v191.glb')", "record.runtimeAssets?.includes('rock-tile-floor-diff-1k.webp')", 'runtime color authority'],
  ["record.runtimeAssets?.includes('home-life-map-place-v191.glb')", "record.runtimeAssets?.includes('rock-tile-floor-normal-gl-1k.webp')", 'runtime normal authority'],
  ["record.runtimeAssets?.includes('urai-living-memory-heart-v191.glb')", "record.runtimeAssets?.includes('rock-tile-floor-arm-1k.webp')", 'runtime roughness authority'],
]

let patched = original
for (const [from, to, label] of replacements) {
  const count = patched.split(from).length - 1
  if (count !== 1) throw new Error(`V226 Home State ${label} predecessor contract changed: expected one exact match, found ${count}`)
  patched = patched.replace(from, to)
}

await writeFile(target, patched, 'utf8')
try {
  const result = spawnSync(process.execPath, ['scripts/capture-home-state-proof.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exitCode = result.status ?? 1
} finally {
  await writeFile(target, original, 'utf8')
}
