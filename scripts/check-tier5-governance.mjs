#!/usr/bin/env node
import fs from 'node:fs'

const canonText = fs.readFileSync('src/canon/tier5.ts', 'utf8')
const failures = []
const requiredOps = ['launch-lock-ci', 'playwright-e2e-lock', 'release-reporting', 'rollback-incident-response', 'artifact-retention']
for (const id of requiredOps) {
  if (!canonText.includes(`id: '${id}'`)) failures.push(`missing Tier-5 operational canon: ${id}`)
  if (!canonText.includes('productionReadinessStatus')) failures.push(`${id} missing productionReadinessStatus`)
}
for (const file of ['.github/workflows/urai-launch.yml', '.github/workflows/urai-spatial-ci.yml', 'tests/spatial-lock.mjs', 'audit/tier-lock/TIER_1_5_FINAL_LOCK_REPORT.md']) {
  if (!fs.existsSync(file)) failures.push(`missing Tier-5 operational file: ${file}`)
}
const launch = fs.existsSync('.github/workflows/urai-launch.yml') ? fs.readFileSync('.github/workflows/urai-launch.yml', 'utf8') : ''
for (const needle of ['pnpm check:source-integrity', 'pnpm check:production-routes', 'pnpm urai:tier1', 'pnpm urai:tier2', 'pnpm urai:tier3', 'pnpm urai:tier4', 'pnpm urai:tier5', 'pnpm lock:e2e', 'actions/upload-artifact']) {
  if (!launch.includes(needle)) failures.push(`launch CI missing ${needle}`)
}
if (failures.length) {
  console.error('Tier-5 governance failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Tier-5 governance passed')
