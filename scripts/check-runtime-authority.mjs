#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const failures = []
const cache = new Map()

function read(path) {
  if (cache.has(path)) return cache.get(path)
  const full = join(root, path)
  if (!existsSync(full)) {
    failures.push(`missing required runtime authority file: ${path}`)
    cache.set(path, '')
    return ''
  }
  const text = readFileSync(full, 'utf8')
  cache.set(path, text)
  return text
}

function requireIncludes(path, needle, label = needle) {
  const text = read(path)
  if (text && !text.includes(needle)) failures.push(`${path} missing ${label}`)
}

function requireNotIncludes(path, needle, label = needle) {
  const text = read(path)
  if (text && text.includes(needle)) failures.push(`${path} still contains forbidden ${label}`)
}

const files = {
  rootRoute: 'urai-tier1/src/app/page.tsx',
  homeRoute: 'urai-tier1/src/app/home/page.tsx',
  homeThreshold: 'urai-tier1/src/app/FinalHomeThreshold.tsx',
  appTemplate: 'urai-tier1/src/app/template.tsx',
  homeRuntime: 'urai-tier1/src/app/HomeSpatialRuntimeLayer.tsx',
  homeWorld: 'urai-tier1/src/app/HomeSpatialWorldFinal.tsx',
  lifeMapPage: 'urai-tier1/src/app/life-map/page.tsx',
  lifeMapLayout: 'urai-tier1/src/app/life-map/layout.tsx',
  lifeMapRuntime: 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx',
  focusRoute: 'urai-tier1/src/app/focus/page.tsx',
  replayRoute: 'urai-tier1/src/app/replay/page.tsx',
  mirrorRoute: 'urai-tier1/src/app/mirror/page.tsx',
  architecture: 'docs/ARCHITECTURE_LOCK.md',
  sourceTruth: 'docs/URAI_SPATIAL_SOURCE_OF_TRUTH_LOCK.md',
}

for (const path of Object.values(files)) read(path)

for (const path of [files.rootRoute, files.homeRoute]) {
  requireIncludes(path, 'FinalHomeThreshold', 'FinalHomeThreshold canonical Home entry')
  for (const retired of ['TierOneExperience', 'UraiV1Experience', 'RootModeExperience', 'UraiSpatialStage', '@/scene/HomeScene']) {
    requireNotIncludes(path, retired, `retired launch owner ${retired}`)
  }
}

requireIncludes(files.homeThreshold, 'HomeSpatialWorldFinal', 'capability-safe Home fallback owner')
requireIncludes(files.homeThreshold, 'useWebGLAvailable', 'WebGL capability gate')
requireIncludes(files.homeThreshold, 'if (mounted && webglAvailable !== null) return null', 'handoff to settled runtime layer')
requireIncludes(files.homeThreshold, 'data-testid="urai-home-accessible-fallback"', 'accessible Home threshold marker')

requireIncludes(files.appTemplate, "import HomeSpatialRuntimeLayer from './HomeSpatialRuntimeLayer'", 'Home runtime layer import')
requireIncludes(files.appTemplate, '<HomeSpatialRuntimeLayer />', 'Home runtime layer mount')

requireIncludes(files.homeRuntime, "normalizedPathname === '/' || normalizedPathname === '/home'", 'Home-only pathname authority')
requireIncludes(files.homeRuntime, 'AssetDrivenHomeWorld', 'asset-driven primary Home owner')
requireIncludes(files.homeRuntime, '<HomeAccessibleSanctuaryFallback />', 'no-WebGL/failure sanctuary fallback owner')
requireIncludes(files.homeRuntime, 'data-home-fallback-canon="inhabited-natural-sanctuary"', 'inhabited natural sanctuary fallback canon')
requireNotIncludes(files.homeRuntime, '<HomeSpatialWorldFinal />', 'retired no-WebGL/failure shell')
requireIncludes(files.homeRuntime, 'data-webgl-ready="false"', 'explicit no-WebGL/failure runtime state')
requireIncludes(files.homeRuntime, 'data-urai-home-runtime=', 'Home runtime authority marker')

requireIncludes(files.lifeMapPage, 'SpatialLifeMapCanonical is intentionally owned by the persistent route layout', 'layout-owned Life Map declaration')
requireIncludes(files.lifeMapLayout, 'SpatialLifeMapCanonical', 'canonical Life Map runtime import')
requireIncludes(files.lifeMapLayout, 'pathname === "/life-map" || pathname === "/life-map/"', 'canonical Life Map pathname guard')
requireIncludes(files.lifeMapLayout, '<SpatialLifeMapCanonical />', 'canonical Life Map mount')
requireIncludes(files.lifeMapRuntime, 'urai-r3f-canonical-lifemap', 'canonical Life Map runtime fingerprint')

requireIncludes(files.focusRoute, "import FinalFocusChamber from './FocusChamberClient'", 'canonical Focus owner')
requireIncludes(files.focusRoute, '<FinalFocusChamber />', 'canonical Focus mount')

requireIncludes(files.replayRoute, "import CinematicReplayClient from './CinematicReplayClient'", 'canonical Replay owner')
requireIncludes(files.replayRoute, 'const FinalReplayFilm = CinematicReplayClient', 'final Replay alias')
requireIncludes(files.replayRoute, '<FinalReplayFilm />', 'canonical Replay mount')
requireIncludes(files.replayRoute, 'data-testid="replay-route-launch-fingerprint"', 'Replay launch fingerprint')

requireIncludes(files.mirrorRoute, "import MirrorSpatialClient from './MirrorSpatialClient'", 'canonical Mirror owner')
requireIncludes(files.mirrorRoute, '<MirrorSpatialClient />', 'canonical Mirror mount')

for (const token of ['FinalHomeThreshold', 'HomeSpatialRuntimeLayer', 'SpatialLifeMapCanonical', 'FocusChamberClient', 'CinematicReplayClient']) {
  requireIncludes(files.architecture, token, `current architecture owner ${token}`)
  requireIncludes(files.sourceTruth, token, `current source-of-truth owner ${token}`)
}
requireIncludes(files.architecture, 'There is no launch `TierOneExperience`', 'retired multi-mode runtime prohibition')
requireIncludes(files.sourceTruth, 'Retired / migration-candidate owners', 'retired owner boundary')
requireNotIncludes(files.sourceTruth, 'TierOneExperience -> HomeScene', 'obsolete TierOneExperience -> HomeScene authority chain')

if (failures.length) {
  console.error('URAI Spatial runtime authority check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('URAI Spatial runtime authority check passed: FinalHomeThreshold/HomeSpatialRuntimeLayer, canonical Life Map, Focus, Replay, and Mirror owners are locked.')
