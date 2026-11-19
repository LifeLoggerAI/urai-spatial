#!/usr/bin/env node
// R1548 review only: no identity inputs, provider calls, or production promotion.
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const base = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const home = '/assets/urai/home-production/interpretive/sanctuary-golden-grove-v1.splat'
const enabled = process.env.URAI_REVIEW_VISUAL_FIXTURES === 'true'
const face = process.env.NEXT_PUBLIC_URAI_ANONYMOUS_FACE_CALIBRATION === 'true'
const splat = process.env.NEXT_PUBLIC_URAI_HOME_INTERPRETIVE_SPLAT_ASSET === home
if (!enabled || (!face && !splat)) {
  console.log('R1548_REVIEW_FIXTURES_SKIPPED')
  process.exit(0)
}
if (process.env.VERCEL === '1' || process.env.URAI_PRODUCTION_RELEASE === 'true') {
  throw new Error('R1548_REVIEW_FIXTURES_DENIED_ON_HOSTED_OR_RELEASE_BUILD')
}
const commands = []
if (splat) commands.push(['generate-public-home-splat.mjs', resolve(base, 'public' + home)])
if (face) commands.push(['digital-human/generate-anonymous-face-glb.mjs',
  resolve(base, 'public/__digital-human-dev/anonymous-face-morph-v1.glb')])
for (const [script, output] of commands) {
  const run = spawnSync(process.execPath, [resolve(base, 'scripts', script), output], { stdio: 'inherit' })
  if (run.status !== 0) throw new Error('R1548_REVIEW_FIXTURE_GENERATION_FAILED')
}
console.log('R1548_REVIEW_FIXTURES_GENERATED_REVIEW_ONLY')
