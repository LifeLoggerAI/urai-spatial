#!/usr/bin/env node
import fs from 'node:fs'

const demoStarsPath = 'urai-tier1/src/spatial/demo/demoMemoryStars.ts'

if (!fs.existsSync(demoStarsPath)) {
  console.error(`Demo seed source missing: ${demoStarsPath}`)
  process.exit(1)
}

const text = fs.readFileSync(demoStarsPath, 'utf8')
const requiredMarkers = [
  'DEMO_FOCUS_MANIFEST_ID',
  'demo',
  'manifest',
]

const missing = requiredMarkers.filter((marker) => !text.includes(marker))
if (missing.length) {
  console.error(`Demo seed source is missing required markers: ${missing.join(', ')}`)
  process.exit(1)
}

console.log(`Demo seed data verified from ${demoStarsPath}. No external write was required.`)
