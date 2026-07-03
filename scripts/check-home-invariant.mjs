#!/usr/bin/env node
import fs from 'node:fs'

const files = {
  root: 'urai-tier1/src/app/page.tsx',
  home: 'urai-tier1/src/app/home/page.tsx',
  threshold: 'urai-tier1/src/app/FinalHomeThreshold.tsx',
  world: 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx',
}

const failures = []

function read(label) {
  const path = files[label]
  if (!fs.existsSync(path)) {
    failures.push(`missing canonical Home file: ${path}`)
    return ''
  }
  return fs.readFileSync(path, 'utf8')
}

const root = read('root')
const home = read('home')
const threshold = read('threshold')
const world = read('world')

for (const [path, source] of [[files.root, root], [files.home, home]]) {
  if (source && !source.includes('FinalHomeThreshold')) {
    failures.push(`${path} must render FinalHomeThreshold`)
  }
  for (const legacyOwner of ['TierOneExperience', 'UraiV1Experience', 'SpatialHomeShell']) {
    if (source.includes(legacyOwner)) failures.push(`${path} must not route through ${legacyOwner}`)
  }
}

if (threshold && !threshold.includes('HomeSpatialWorldFinal')) {
  failures.push('FinalHomeThreshold must render HomeSpatialWorldFinal')
}

const requiredWorldSignals = [
  'className="urai-genesis-home urai-home-spatial-world-final"',
  'aria-label="URAI Home World threshold"',
  'urai-genesis-home__sky',
  'urai-genesis-home__ground',
  'urai-genesis-home__body',
  'urai-genesis-home__orb',
  'href="/ground?from=home"',
  'href="/life-map?from=home-sky"',
  "window.matchMedia('(prefers-reduced-motion: reduce)')",
  'Skip to world routes',
  'onPointerMove={handlePointerMove}',
  'event.key.toLowerCase() === "o"',
  'event.key === "Escape"',
]

for (const signal of requiredWorldSignals) {
  if (world && !world.includes(signal)) failures.push(`HomeSpatialWorldFinal missing invariant: ${signal}`)
}

const forbiddenPatterns = [
  /FirstLightExperience/i,
  /SpatialHomeShell/i,
  /UraiV1Experience/i,
  /CanonicalTierLockHud/i,
  /loading\s+urai\s+spatial/i,
]

for (const pattern of forbiddenPatterns) {
  for (const [path, source] of [[files.root, root], [files.home, home], [files.threshold, threshold], [files.world, world]]) {
    if (pattern.test(source)) failures.push(`Home invariant violation in ${path}: ${pattern}`)
  }
}

if (failures.length > 0) {
  console.error('Tier-1 home invariant failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Tier-1 Home invariant passed: / and /home use FinalHomeThreshold -> HomeSpatialWorldFinal with sky, ground, body, orb, portals, keyboard access, and reduced-motion safety.')
