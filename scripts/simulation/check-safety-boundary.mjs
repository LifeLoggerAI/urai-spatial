#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const boundaryPath = path.join(root, 'docs', 'simulation', 'V10_SAFETY_BOUNDARY.md')
const outDir = path.join(root, 'audit', 'v10')
fs.mkdirSync(outDir, { recursive: true })

const required = [
  'individual prediction engine',
  'manipulation engine',
  'hidden behavioral control',
  'privacy-invasive surveillance',
  'advisory',
  'auditable',
  'privacy-preserving',
]

if (!fs.existsSync(boundaryPath)) {
  console.error('[v10-safety] missing safety boundary doc')
  process.exit(1)
}

const text = fs.readFileSync(boundaryPath, 'utf8')
const missing = required.filter((term) => !text.includes(term))
const report = {
  generatedAt: new Date().toISOString(),
  decision: missing.length === 0 ? 'V10_SAFETY_BOUNDARY_READY' : 'V10_SAFETY_BOUNDARY_INCOMPLETE',
  missing,
}
fs.writeFileSync(path.join(outDir, 'v10-safety-boundary-report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
process.exit(missing.length === 0 ? 0 : 1)
