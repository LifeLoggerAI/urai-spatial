#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const requiredSystems = ['storytime', 'spatial', 'privacy', 'admin', 'companion', 'memory']
const file = 'src/canon/tier2Systems.ts'
const text = fs.readFileSync(file, 'utf8')

for (const system of requiredSystems) {
  if (!text.includes(`id: '${system}'`)) {
    console.error(`Missing required Tier-2 system mapping: ${system}`)
    process.exit(1)
  }
}

const pathHints = [
  'src/components/life-map',
  'src/spatial',
  'firebase/firestore.rules',
  'urai-tier1/src/app/api',
]
for (const p of pathHints) {
  if (!fs.existsSync(path.resolve(p))) {
    console.error(`Tier-2 mapped path missing in repo: ${p}`)
    process.exit(1)
  }
}

const tier2Doc = fs.readFileSync('docs/canon/TIER_2_CANON_STANDARDS.md', 'utf8')
for (const heading of ['## Official tier name', '## Dependency rules', '## Mutation rules', '## Required checks']) {
  if (!tier2Doc.includes(heading)) {
    console.error(`Tier-2 doc missing section: ${heading}`)
    process.exit(1)
  }
}

console.log('Tier-2 governance checks passed.')
