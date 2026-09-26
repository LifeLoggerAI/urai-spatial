#!/usr/bin/env node
import fs from 'node:fs'

const files = {
  root: 'urai-tier1/src/app/page.tsx',
  home: 'urai-tier1/src/app/home/page.tsx',
  threshold: 'urai-tier1/src/app/FinalHomeThreshold.tsx',
  world: 'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
  fallback: 'urai-tier1/src/app/HomeSemanticFallback.tsx',
  template: 'urai-tier1/src/app/template.tsx',
  product: 'urai-tier1/src/spatial/layout/HomeWorldProductionV223.tsx',
  avatar: 'urai-tier1/src/spatial/home/HomeEmbodiedAvatar.tsx',
  state: 'urai-tier1/src/spatial/home/homeExperienceState.ts',
  controller: 'urai-tier1/src/spatial/home/useHomeExperienceController.ts',
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
const product = read('product')
const avatar = read('avatar')
const state = read('state')
const controller = read('controller')
for (const [label, source, signals] of [
  ['FinalHomeThreshold', threshold, ['<HomeSemanticFallback />', 'if (mounted && webglAvailable !== null) return null']],
  ['AppTemplate', template, ['<HomeSpatialRuntimeLayer />', '{children}']],
  ['HomeSpatialRuntimeLayer', world, [
    "normalizedPathname === '/' || normalizedPathname === '/home'",
    "if (!homeRouteActive) return null",
    "if (webglAvailable === false || rendererState === 'failed')",
    '<HomeSemanticFallback />', '<AssetDrivenHomeWorld', '<HomeSemanticNavigation />',
    'webglcontextlost', 'webglcontextrestored', 'prefers-reduced-motion:reduce',
    'aria-label="Open UrAi Orb companion"',
    'aria-label="Open Ground directly"', 'aria-label="Open Life Map directly"',
    'href={homeSemanticHref(HOME_SEMANTIC_DESTINATIONS.ground.travelHref, currentSearch)}',
    'href={homeSemanticHref(HOME_SEMANTIC_DESTINATIONS.lifeMap.travelHref, currentSearch)}',
  ]],
  ['HomeSemanticFallback', fallback, [
    'aria-label="UrAi Home semantic fallback"', 'aria-label="Home semantic destinations"',
    'href="/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent"', 'href="/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete"',
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

for (const marker of [
  "homeState.stableState === 'AVATAR_HOME_FIRST_PERSON'",
  'bodyless-first-person-home',
  'data-home-presence-policy="direct-first-person-camera-only-no-hands-body-rig"',
  'data-home-avatar-activation-gate="none-direct-first-person-home"',
  'direct-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
  'home-physical-world home-camera-only-first-person home-living-memory-orb home-life-map-sky-threshold',
  'aria-label="Open Avatar Self View"',
]) {
  if (!product.includes(marker)) failures.push(`HomeWorldProductionV223 missing direct-first-person Home invariant: ${marker}`)
}
for (const retired of ['HomeEmbodiedAvatar','visible-avatar-presentation-activation-gate','presentation-avatar-then-first-person-camera-only-no-hands-body-rig','data-testid="urai-home-avatar-enter-first-person"']) {
  if (product.includes(retired)) failures.push(`HomeWorldProductionV223 restored retired Avatar-first authority: ${retired}`)
}
for (const marker of ["makeHomeOriginSnapshot('AVATAR_HOME_FIRST_PERSON')","stableState: 'AVATAR_HOME_FIRST_PERSON'"]) {
  if (!state.includes(marker)) failures.push(`homeExperienceState missing direct-first-person state invariant: ${marker}`)
}
for (const marker of ['openSelfView','completeEmbodiment']) {
  if (!controller.includes(marker)) failures.push(`useHomeExperienceController missing direct-first-person continuity invariant: ${marker}`)
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

console.log('Tier-1 Home invariant passed: threshold/template runtime -> Avatar Home presentation -> activation/embodiment -> bodyless non-XR first-person Home, with accessible fallback and renderer recovery.')
