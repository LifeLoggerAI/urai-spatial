#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const checks = [
  'scripts/check-tier1-canon-lock.mjs',
  'scripts/check-tier1-immutable-diff.mjs',
  'scripts/check-tier1-redefinition.mjs',
  'scripts/check-runtime-boundary.mjs',
  'scripts/check-runtime-authority.mjs',
  'scripts/check-home-invariant.mjs',
  'scripts/check-firestore-tier1-boundaries.mjs',
]

for (const check of checks) {
  console.log(`[tier1-governance] running ${check}`)
  const result = spawnSync(process.execPath, [check], { stdio: 'inherit' })
  if (result.status !== 0) {
    console.error(`TIER1_GOVERNANCE_FAILED=${check}`)
    process.exit(result.status ?? 1)
  }
}

console.log('Tier 1 governance check passed.')
