#!/usr/bin/env node
// R1548 review only: no identity inputs, provider calls, or production promotion.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const home = '/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const enabled = process.env.URAI_REVIEW_VISUAL_FIXTURES === 'true'
const face = process.env.NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION === 'true'
const splat = process.env.NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET === home
const hostedOrRelease = process.env.VERCEL === '1' || process.env.URAI_PRODUCTION_RELEASE === 'true'
// A reused workspace can retain binaries from an earlier local review build.
// A skipped generator MUST NOT allow a default or release build to package them.
const homeOutput = resolve(base, 'public' + home)
const faceOutput = resolve(base, 'public/__digital-human-dev/anonymous-face-morph-v1.glb')
if (!enabled || (!face && !splat) || hostedOrRelease) {
  const stale = [homeOutput, faceOutput].filter((path) => existsSync(path))
  if (stale.length) {
    throw new Error(`R1548_REVIEW_FIXTURES_STALE_OUTPUT_DENIED:${stale.join(',')}`)
  }
}
if (!enabled || (!face && !splat)) {
  console.log('R1548_REVIEW_FIXTURES_SKIPPED')
  process.exit(0)
}
if (hostedOrRelease) {
  throw new Error('R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD')
}
const commands = []
if (splat) commands.push(['generate-public-home-splat.mjs', homeOutput])
if (face) commands.push(['digital-human/generate-anonymous-face-glb.mjs',
  faceOutput])
for (const [script, output] of commands) {
  const run = spawnSync(process.execPath, [resolve(base, 'scripts', script), output], { stdio: 'inherit' })
  if (run.status !== 0) throw new Error('R1548_REVIEW_FIXTURE_GENERATION_FAILED')
}
console.log('R1548_REVIEW_FIXTURES_GENERATED_REVIEW_ONLY')
