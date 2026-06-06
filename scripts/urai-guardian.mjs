#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

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
]

for (const test of tests) {
  const result = spawnSync(process.execPath, [test], { stdio: 'inherit' })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

console.log('URAI guardian passed.')
