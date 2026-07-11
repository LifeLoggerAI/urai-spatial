#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const oversized = []

function read(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8')
  } catch (error) {
    failures.push(`Failed to read ${relativePath}: ${error.message}`)
    return ''
  }
}

function requireMatch(label, source, pattern) {
  if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`)
}

function forbidMatch(label, source, pattern) {
  if (pattern.test(source)) failures.push(`${label}: forbidden ${pattern}`)
}

const budgetPath = 'operations/performance/spatial-performance-budget.json'
const canvasPath = 'urai-tier1/src/spatial/components/world/SpatialWorldCanvas.tsx'
const adaptivePath = 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts'
const activeLifeMapPath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const activeLifeMapBoundaryPath = 'urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx'
const activeLifeMapWrapperPath = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const budgetSource = read(budgetPath)
const canvas = read(canvasPath)
const adaptive = read(adaptivePath)
const activeLifeMap = read(activeLifeMapPath)
const activeLifeMapBoundary = read(activeLifeMapBoundaryPath)
const activeLifeMapWrapper = read(activeLifeMapWrapperPath)

let budget = null
try {
  budget = JSON.parse(budgetSource)
} catch (error) {
  failures.push(`Invalid ${budgetPath}: ${error.message}`)
}

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) {
  requireMatch(`Adaptive controller ${marker}`, adaptive, new RegExp(marker))
}

for (const marker of ['particleCount', 'pixelRatioMax', 'shadows', 'postprocessing', 'antialias']) {
  requireMatch(`Secondary spatial Canvas consumes ${marker}`, canvas, new RegExp(`profile\.${marker}`))
  requireMatch(`Active Life Map consumes ${marker}`, activeLifeMap, new RegExp(`profile\.${marker}`))
}

requireMatch('Secondary visibility-aware frameloop', canvas, /frameloop=\{profile\.documentVisible \? 'always' : 'never'\}/)
requireMatch('Secondary first actual frame marker', canvas, /useFrame\(\(\) => \{[\s\S]*markFirstSpatialFrame/)
requireMatch('Secondary layout containment', canvas, /contain: 'layout paint size'/)
requireMatch('Secondary particle geometry disposal', canvas, /geometry\.dispose\(\)/)
requireMatch('Secondary constellation geometry disposal', canvas, /lines\.dispose\(\)/)
requireMatch('Secondary shadow map tiering', canvas, /profile\.tier === 'high' \? 1024 : 512/)

requireMatch('Active route imports Life Map boundary', activeLifeMapWrapper, /import\(['"]@\/components\/lifemap\/LifeMapRouteBoundary['"]\)/)
requireMatch('Active route renders Life Map boundary', activeLifeMapWrapper, /<LifeMapRouteBoundary\s*\/>/)
requireMatch('Active route wraps query reader in Suspense', activeLifeMapWrapper, /<Suspense[\s\S]*<LifeMapRouteBoundary/)
forbidMatch('Active wrapper destroys persisted state', activeLifeMapWrapper, /localStorage\.removeItem/)

requireMatch('Life Map boundary imports adaptive scene', activeLifeMapBoundary, /import AdaptiveLifeMapScene from ['"]\.\/AdaptiveLifeMapScene['"]/)
requireMatch('Life Map boundary reads query identity', activeLifeMapBoundary, /useSearchParams\(\)/)
requireMatch('Life Map boundary detects selected-to-overview history', activeLifeMapBoundary, /previousIdentity\.current && !identity/)
requireMatch('Life Map boundary clears stale history snapshot only', activeLifeMapBoundary, /localStorage\.removeItem\(LIFE_MAP_STATE_KEY\)/)
requireMatch('Life Map boundary remounts adaptive scene', activeLifeMapBoundary, /<AdaptiveLifeMapScene key=/)

requireMatch('Active Life Map adaptive hook', activeLifeMap, /useAdaptiveSpatialQuality\(\)/)
requireMatch('Active Life Map visibility-aware frameloop', activeLifeMap, /frameloop=\{profile\.documentVisible \? ["']always["'] : ["']never["']\}/)
requireMatch('Active Life Map first-frame evidence', activeLifeMap, /markFirstSpatialFrame\(["']\/life-map["']/)
requireMatch('Active Life Map state restore read', activeLifeMap, /localStorage\.getItem\(LIFE_MAP_STATE_KEY\)/)
requireMatch('Active Life Map state persistence write', activeLifeMap, /localStorage\.setItem\(LIFE_MAP_STATE_KEY/)
requireMatch('Active Life Map query restoration', activeLifeMap, /useSearchParams\(\)/)
for (const key of ['memoryId', 'manifestId', 'node']) {
  requireMatch(`Active Life Map preserves ${key}`, activeLifeMap, new RegExp(`["']${key}["']`))
}
requireMatch('Active Life Map selected-camera restore', activeLifeMap, /cameraForNode\(node\)/)
requireMatch('Active Life Map Escape behavior', activeLifeMap, /event\.key !== ["']Escape["']/)
requireMatch('Active Life Map reduced motion', activeLifeMap, /profile\.reducedMotion/)
requireMatch('Active Life Map hidden-tab suspension', activeLifeMap, /profile\.documentVisible/)
requireMatch('Active Life Map geometry disposal', activeLifeMap, /geometry\.dispose\(\)/)
requireMatch('Active Life Map query-preserving Focus path', activeLifeMap, /identityHref\(["']focus["']/)
requireMatch('Active Life Map query-preserving Replay path', activeLifeMap, /identityHref\(["']replay["']/)

forbidMatch('Hardcoded legacy secondary particles', canvas, /Float32Array\(360 \* 3\)/)
forbidMatch('Hardcoded legacy secondary DPR', canvas, /dpr=\{\[1, 1\.7\]\}/)
forbidMatch('Reduced-motion-only secondary postprocessing gate', canvas, /EffectComposer enabled=\{!reducedMotion\}/)
forbidMatch('Global resize performance listener', adaptive, /window\.addEventListener\('resize'/)
forbidMatch('Active Life Map hardcoded DPR', activeLifeMap, /dpr=\{\[1,\s*1\.85\]\}/)
forbidMatch('Active Life Map destroys saved context', activeLifeMap, /localStorage\.removeItem/)
forbidMatch('Active Life Map hardcodes continuous render', activeLifeMap, /frameloop=["']always["']/)

if (budget) {
  for (const tier of ['low', 'medium', 'high']) {
    const profile = budget.qualityTiers?.[tier]
    if (!profile) {
      failures.push(`Missing quality tier: ${tier}`)
      continue
    }
    for (const key of ['pixelRatioMax', 'particleCount', 'shadows', 'postprocessing', 'antialias']) {
      if (!(key in profile)) failures.push(`Quality tier ${tier} missing ${key}`)
    }
  }

  const assetRoot = path.join(root, 'urai-tier1/public/assets/urai')
  if (fs.existsSync(assetRoot)) walk(assetRoot)

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        walk(absolute)
        continue
      }

      const bytes = fs.statSync(absolute).size
      const extension = path.extname(entry.name).toLowerCase()
      const limit = ['.glb', '.gltf'].includes(extension)
        ? budget.budgets.largestSingleModelBytes
        : ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2', '.hdr'].includes(extension)
          ? budget.budgets.largestSingleTextureBytes
          : null

      if (limit && bytes > limit) oversized.push({ path: path.relative(root, absolute), bytes, limit })
    }
  }
}

if (oversized.length) failures.push(`${oversized.length} spatial assets exceed their single-file budget.`)

const report = {
  ok: failures.length === 0,
  budgetId: budget?.budgetId ?? null,
  integrationState: failures.length === 0 ? 'integrated' : 'failed',
  activeProductionRoute: '/life-map',
  activeLifeMapPath,
  activeLifeMapBoundaryPath,
  activeLifeMapWrapperPath,
  failures,
  oversized,
}

console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
