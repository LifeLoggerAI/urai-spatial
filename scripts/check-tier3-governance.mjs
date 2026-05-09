#!/usr/bin/env node
import fs from 'node:fs'

const requiredRoutes = ['/', '/life-map', '/focus', '/replay', '/unwind']
const requiredFeatures = ['spatial-home-flow', 'life-map-navigation', 'focus-memory-inspection', 'timeline-replay-flow', 'unwind-safe-recovery']
const canonText = fs.readFileSync('src/canon/tier3.ts', 'utf8')
const failures = []

for (const id of requiredFeatures) {
  if (!canonText.includes(`id: '${id}'`)) failures.push(`missing Tier-3 feature canon: ${id}`)
  for (const field of ['label', 'owningSystem', 'owningTier', 'route', 'component', 'dataRequirements', 'interactionStates', 'accessibilityRequirements', 'testRequirements', 'productionReadinessStatus']) {
    if (!canonText.includes(field)) failures.push(`${id} missing ${field}`)
  }
}

for (const route of requiredRoutes) {
  const file = route === '/' ? 'urai-tier1/src/app/page.tsx' : `urai-tier1/src/app${route}/page.tsx`
  if (!fs.existsSync(file)) failures.push(`missing Tier-3 route file for ${route}: ${file}`)
}

const e2eText = fs.existsSync('tests/spatial-lock.mjs') ? fs.readFileSync('tests/spatial-lock.mjs', 'utf8') : ''
for (const route of requiredRoutes) {
  if (!e2eText.includes(route)) failures.push(`spatial E2E missing route literal ${route}`)
}
if (!e2eText.includes('Escape')) failures.push('spatial E2E missing ESC recovery coverage')

if (failures.length) {
  console.error('Tier-3 governance failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Tier-3 governance passed')
