#!/usr/bin/env node
import fs from 'node:fs'

const files = {
  root: 'urai-tier1/src/app/page.tsx',
  home: 'urai-tier1/src/app/home/page.tsx',
  threshold: 'urai-tier1/src/app/FinalHomeThreshold.tsx',
  world: 'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
  fallback: 'urai-tier1/src/app/HomeSemanticFallback.tsx',
  template: 'urai-tier1/src/app/template.tsx',
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

// The route threshold only owns pre-hydration/capability detection. The template
// owns the settled spatial world and its renderer-failure fallback.
const fallback = read('fallback')
const template = read('template')
for (const [label, source, signals] of [
  ['FinalHomeThreshold', threshold, ['<HomeSemanticFallback />', 'if (mounted && webglAvailable !== null) return null']],
  ['AppTemplate', template, ['<HomeSpatialRuntimeLayer />', '{children}']],
  ['HomeSpatialRuntimeLayer', world, [
    "normalizedPathname === '/' || normalizedPathname === '/home'",
    "if (!homeRouteActive) return null",
    "if (webglAvailable === false || rendererState === 'failed')",
    '<HomeSemanticFallback />', '<AssetDrivenHomeWorld', '<HomeSemanticNavigation />',
    'webglcontextlost', 'webglcontextrestored', 'prefers-reduced-motion:reduce',
    'aria-label="Open URAI Orb companion"',
    'aria-label="Open Ground directly"', 'aria-label="Open Life Map directly"',
    'href={HOME_SEMANTIC_DESTINATIONS.ground.travelHref}',
    'href={HOME_SEMANTIC_DESTINATIONS.lifeMap.travelHref}',
  ]],
  ['HomeSemanticFallback', fallback, [
    'aria-label="URAI Home semantic fallback"', 'aria-label="Home semantic destinations"',
    'href="/ground/?from=home-ground"', 'href="/life-map/?from=home-sky"',
    'href="/passport"', 'href="/privacy"',
  ]],
]) {
  for (const signal of signals) {
    if (!source.includes(signal)) failures.push(`${label} missing invariant: ${signal}`)
  }
}
if (threshold.includes('<HomeSpatialWorldFinal')) {
  failures.push('FinalHomeThreshold must not mount the retired parallel Home world')
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

console.log('Tier-1 Home invariant passed: / and /home use the pre-hydration threshold and template-owned spatial runtime with accessible destinations and renderer recovery.')
