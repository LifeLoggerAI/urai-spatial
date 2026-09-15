import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

const target = new URL('../tests/final-aaa-world-convergence-contract.test.mjs', import.meta.url)
const source = await readFile(target, 'utf8')

for (const marker of [
  "const activeHomeProduction = read('src/spatial/layout/HomeWorldProductionV223.tsx')",
  "const currentHomeVisualAuthority = JSON.parse(read('src/app/currentHomeVisualAuthority.json'))",
  "const groundedOrb = read('src/spatial/assets/HomeOrbGroundedV288.tsx')",
  "v288-cinematic-lived-world-grounded-reliquary",
  "v288-grounded-biomorphic-reliquary",
  "data-home-v288-certification",
  "data-home-v288-retained-pixel-rebuild",
  "physical-world-surface",
  "visible-sky-broad-interaction",
]) {
  if (!source.includes(marker)) throw new Error(`V288 convergence marker missing: ${marker}`)
}

for (const retirementAssertion of [
  "assert.doesNotMatch(assetHome, /data-home-v226-certification/)",
  "assert.match(assetHome, /data-home-v226-retained-pixel-rebuild=\"superseded\"/)",
  "assert.match(assetHome, /data-home-v288-retained-pixel-rebuild=\"active\"/)",
  "assert.doesNotMatch(activeHomeProduction, /stepEmbodiedMotion|useMovementInput|MobileMovementPad/)",
]) {
  if (!source.includes(retirementAssertion)) throw new Error(`V288 fail-closed retirement assertion missing: ${retirementAssertion}`)
}

for (const obsoletePositiveAuthority of [
  "assert.match(assetHome, /data-home-v226-certification/)",
  "data-home-v226-retained-pixel-rebuild=\"active\"",
  "v226-rooted-living-memory-presence",
  "<HomeV225PolishV3 orbState={p.orbState}",
]) {
  if (source.includes(obsoletePositiveAuthority)) throw new Error(`Obsolete convergence authority re-entered positively: ${obsoletePositiveAuthority}`)
}

const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'tests/final-aaa-world-convergence-contract.test.mjs'], {
  cwd: new URL('..', import.meta.url),
  stdio: 'inherit',
})
if (result.status !== 0) process.exitCode = result.status ?? 1
