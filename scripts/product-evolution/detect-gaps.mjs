#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const outDir = path.join(root, 'audit', 'v8')
const observationPath = path.join(outDir, 'product-observation.json')

if (!fs.existsSync(observationPath)) {
  console.error('[v8-gap-detect] missing product observation. Run node scripts/product-evolution/observe.mjs first.')
  process.exit(1)
}

const observation = JSON.parse(fs.readFileSync(observationPath, 'utf8'))
const gaps = []

for (const doc of observation.releaseDocs || []) {
  if (!doc.present) gaps.push({ id: `missing-doc-${doc.file}`, severity: 'medium', recommendation: `Restore ${doc.file}` })
}
for (const gate of observation.gates || []) {
  if (!gate.present) gaps.push({ id: `missing-gate-${gate.file}`, severity: 'high', recommendation: `Add ${gate.file}` })
}

if (!observation.releaseDocs?.some((doc) => doc.file.includes('FINAL_PRODUCTION_RELEASE_CHECKLIST') && doc.present)) {
  gaps.push({ id: 'release-checklist-not-detected', severity: 'high', recommendation: 'Keep final production release checklist current.' })
}

const result = {
  generatedAt: new Date().toISOString(),
  decision: gaps.length === 0 ? 'V8_NO_STRUCTURAL_GAPS_DETECTED' : 'V8_PRODUCT_GAPS_DETECTED',
  gaps,
}

fs.writeFileSync(path.join(outDir, 'product-gaps.json'), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify(result, null, 2))
process.exit(0)
