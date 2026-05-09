#!/usr/bin/env node
import fs from 'node:fs'

const canonText = fs.readFileSync('src/canon/tier4.ts', 'utf8')
const failures = []
const requiredStandards = ['route-integrity', 'console-hygiene', 'reduced-motion', 'firebase-boundaries', 'env-readiness']
for (const id of requiredStandards) {
  if (!canonText.includes(`id: '${id}'`)) failures.push(`missing Tier-4 implementation canon: ${id}`)
  if (!canonText.includes('productionReadinessStatus')) failures.push(`${id} missing productionReadinessStatus`)
}
for (const file of ['firebase.json', 'firebase/firestore.rules', 'firebase/firestore.indexes.json', 'urai-tier1/tsconfig.runtime.json', 'urai-tier1/src/app/globals.css']) {
  if (!fs.existsSync(file)) failures.push(`missing Tier-4 implementation file: ${file}`)
}
const globals = fs.existsSync('urai-tier1/src/app/globals.css') ? fs.readFileSync('urai-tier1/src/app/globals.css', 'utf8') : ''
if (!globals.includes('prefers-reduced-motion')) failures.push('globals.css missing reduced-motion handling')
if (!globals.includes('safe-area-inset')) failures.push('globals.css missing safe-area handling')

if (failures.length) {
  console.error('Tier-4 governance failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Tier-4 governance passed')
