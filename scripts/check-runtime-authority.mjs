#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []

function read(path) {
  const full = join(root, path)
  if (!existsSync(full)) {
    failures.push(`missing required runtime authority file: ${path}`)
    return ''
  }
  return readFileSync(full, 'utf8')
}

function requireIncludes(path, needle, label = needle) {
  const text = read(path)
  if (text && !text.includes(needle)) failures.push(`${path} missing ${label}`)
}

function requireNotIncludes(path, needle, label = needle) {
  const text = read(path)
  if (text && text.includes(needle)) failures.push(`${path} still contains ${label}`)
}

const canonicalRoutes = [
  ['/', 'urai-tier1/src/app/page.tsx', 'mode="home"'],
  ['/home', 'urai-tier1/src/app/home/page.tsx', 'mode="home"'],
  ['/ascent', 'urai-tier1/src/app/ascent/page.tsx', 'mode="ascent"'],
  ['/life-map', 'urai-tier1/src/app/life-map/page.tsx', 'mode="life-map"'],
  ['/focus', 'urai-tier1/src/app/focus/page.tsx', 'mode="focus"'],
  ['/replay', 'urai-tier1/src/app/replay/page.tsx', 'mode="replay"'],
  ['/mirror', 'urai-tier1/src/app/mirror/page.tsx', 'mode="mirror"'],
]

for (const [route, file, modeToken] of canonicalRoutes) {
  requireIncludes(file, 'TierOneExperience', `${route} TierOneExperience import/use`)
  requireIncludes(file, modeToken, `${route} canonical mode ${modeToken}`)
  requireNotIncludes(file, '@/spatial/scene/SpatialScene', `${route} legacy SpatialScene import`)
  requireNotIncludes(file, 'src/spatial/scene/SpatialScene', `${route} legacy SpatialScene import`)
}

requireIncludes('urai-tier1/src/spatial/layout/TierOneExperience.tsx', '@/scene/HomeScene', 'HomeScene canonical import')
requireIncludes('urai-tier1/src/spatial/layout/TierOneExperience.tsx', '<HomeScene sceneMode={mode} />', 'HomeScene routed handoff')
requireIncludes('urai-tier1/src/scene/HomeScene.tsx', "type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'", 'canonical SceneMode union')
requireIncludes('urai-tier1/src/scene/HomeScene.tsx', "router.push('/ascent')", 'Home to Ascent transition')
requireIncludes('urai-tier1/src/scene/HomeScene.tsx', "router.push('/life-map')", 'Ascent/Focus to Life Map routing')
requireIncludes('urai-tier1/src/scene/HomeScene.tsx', 'data-scene-mode={sceneMode}', 'current E2E mode attribute')
requireIncludes('urai-tier1/src/scene/HomeScene.tsx', 'data-testid="urai-sky-click-target"', 'sky click target')
requireIncludes('urai-tier1/src/scene/SpatialVisualOverlayPremium.tsx', 'data-testid={`lifemap-node-${star.manifestId}`}', 'deterministic LifeMap node test ids')
requireIncludes('urai-tier1/scripts/tier-lock/tier-config.mjs', "{ route: '/ascent'", 'ascent route tier coverage')
requireIncludes('tests/spatial-lock.mjs', 'data-scene-mode', 'current mode attribute in spatial E2E')
requireIncludes('tests/replay-tier5-lock.mjs', 'data-scene-mode', 'current mode attribute in replay E2E')
requireIncludes('docs/ARCHITECTURE_LOCK.md', 'TierOneExperience.tsx', 'architecture lock canonical shell')
requireIncludes('docs/ARCHITECTURE_LOCK.md', 'HomeScene.tsx', 'architecture lock canonical scene')
requireIncludes('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md', 'TierOneExperience', 'source-of-truth canonical shell')
requireIncludes('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md', 'HomeScene', 'source-of-truth canonical scene')
requireIncludes('docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md', 'legacy / migration-candidate', 'legacy path declaration')

if (failures.length) {
  console.error('URAI Spatial runtime authority check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('URAI Spatial runtime authority check passed.')
