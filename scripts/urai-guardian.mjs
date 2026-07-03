#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'

const tests = [
  'urai-tier1/tests/guardian/route-canon.test.mjs',
  'urai-tier1/tests/guardian/location-privacy-canon.test.mjs',
  'urai-tier1/tests/guardian/no-debug-copy-canon.test.mjs',
  'urai-tier1/tests/guardian/focus-place-door-canon.test.mjs',
  'urai-tier1/tests/guardian/place-routes-canon.test.mjs',
  'urai-tier1/tests/guardian/place-safety-continuity-canon.test.mjs',
  'urai-tier1/tests/guardian/place-repository-canon.test.mjs',
  'urai-tier1/tests/guardian/replay-explanation-export-canon.test.mjs',
  'urai-tier1/tests/guardian/place-layer-insight-canon.test.mjs',
  'urai-tier1/tests/guardian/realm-routes-canon.test.mjs',
  'urai-tier1/tests/guardian/passport-council-runtime-canon.test.mjs',
  'urai-tier1/tests/guardian/accessibility-cues-canon.test.mjs',
  'urai-tier1/tests/guardian/static-route-smoke-canon.test.mjs',
  'urai-tier1/tests/guardian/live-data-validation-canon.test.mjs',
  'urai-tier1/tests/guardian/release-script-canon.test.mjs',
  'urai-tier1/tests/guardian/deploy-workflow-canon.test.mjs',
]

const diagnosticTierChecks = [
  'scripts/check-tier2-governance.mjs',
  'scripts/check-tier3-governance.mjs',
  'scripts/check-tier4-governance.mjs',
  'scripts/check-tier5-governance.mjs',
]

function run(file, kind) {
  console.log(`[guardian] running ${file}`)
  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' })
  if (result.status !== 0) {
    mkdirSync('artifacts/guardian', { recursive: true })
    writeFileSync(
      'artifacts/guardian/failure.txt',
      `FAILED_${kind.toUpperCase()}=${file}\nEXIT=${result.status ?? 1}\n`,
    )
    process.exit(result.status ?? 1)
  }
}

for (const test of tests) run(test, 'test')
for (const check of diagnosticTierChecks) run(check, 'tier_check')

console.log('URAI guardian passed.')
