#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'audit', 'v9')
const evidencePath = path.join(outDir, 'ecosystem-evidence.json')
if (!fs.existsSync(evidencePath)) {
  console.error('[v9-report] missing ecosystem evidence. Run node scripts/ecosystem/collect-evidence.mjs first.')
  process.exit(1)
}
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
const missing = []
for (const [group, values] of Object.entries(evidence)) {
  if (group === 'generatedAt') continue
  for (const [key, value] of Object.entries(values)) if (!value) missing.push(`${group}.${key}`)
}
const report = {
  generatedAt: new Date().toISOString(),
  decision: missing.length === 0 ? 'V9_ECOSYSTEM_INTELLIGENCE_READY' : 'V9_ECOSYSTEM_INTELLIGENCE_INCOMPLETE',
  missing,
  riskClass: missing.length === 0 ? 'safe-to-ship' : 'evidence-missing',
}
fs.writeFileSync(path.join(outDir, 'ecosystem-intelligence-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
process.exit(missing.length === 0 ? 0 : 1)
