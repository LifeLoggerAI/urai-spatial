#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const failures = []
const oversized = []

function read(relativePath) {
  try { return fs.readFileSync(path.join(root, relativePath), 'utf8') }
  catch (error) { failures.push(`Failed to read ${relativePath}: ${error.message}`); return '' }
}
function requireMatch(label, source, pattern) { if (!pattern.test(source)) failures.push(`${label}: missing ${pattern}`) }
function forbidMatch(label, source, pattern) { if (pattern.test(source)) failures.push(`${label}: forbidden ${pattern}`) }

const budgetPath = 'operations/performance/spatial-performance-budget.json'
const canvasPath = 'urai-tier1/src/spatial/components/world/SpatialWorldCanvas.tsx'
const adaptivePath = 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts'
const activeLifeMapPath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const activeLifeMapBoundaryPath = 'urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx'
const activeLifeMapWrapperPath = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const budgetSource = read(budgetPath)
const canvas = read(canvasPath)
const adaptive = read(adaptivePath)
const lifeMap = read(activeLifeMapPath)
const boundary = read(activeLifeMapBoundaryPath)
const wrapper = read(activeLifeMapWrapperPath)
let budget = null
try { budget = JSON.parse(budgetSource) } catch (error) { failures.push(`Invalid ${budgetPath}: ${error.message}`) }

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) requireMatch(`Adaptive controller ${marker}`, adaptive, new RegExp(marker))
for (const marker of ['particleCount', 'pixelRatioMax', 'shadows', 'postprocessing', 'antialias']) requireMatch(`Secondary spatial Canvas consumes ${marker}`, canvas, new RegExp(`profile\\.${marker}`))
for (const marker of ['pixelRatioMax', 'antialias', 'reducedMotion']) requireMatch(`Active Life Map consumes ${marker}`, lifeMap, new RegExp(`profile\\.${marker}`))

requireMatch('Secondary visibility-aware frameloop', canvas, /frameloop=\{profile\.documentVisible \? 'always' : 'never'\}/)
requireMatch('Secondary first actual frame marker', canvas, /useFrame\(\(\) => \{[\s\S]*markFirstSpatialFrame/)
requireMatch('Secondary layout containment', canvas, /contain: 'layout paint size'/)
requireMatch('Secondary particle geometry disposal', canvas, /geometry\.dispose\(\)/)
requireMatch('Secondary constellation geometry disposal', canvas, /lines\.dispose\(\)/)
requireMatch('Secondary shadow map tiering', canvas, /profile\.tier === 'high' \? 1024 : 512/)

requireMatch('Active route imports Life Map boundary', wrapper, /import\(["']@\/components\/lifemap\/LifeMapRouteBoundary["']\)/)
requireMatch('Active route renders Life Map boundary', wrapper, /<LifeMapRouteBoundary\s*\/>/)
requireMatch('Active route wraps query reader in Suspense', wrapper, /<Suspense[\s\S]*<LifeMapAccessGate/)
requireMatch('Signed-out route does not mount private memories', wrapper, /data-private-memory-mounted="false"/)
forbidMatch('Wrapper retains implicit demo authority', wrapper, /lifeMapDemoMode|DEMO_MODE_KEY/)

requireMatch('Life Map boundary imports adaptive scene', boundary, /import AdaptiveLifeMapScene from ["']\.\/AdaptiveLifeMapScene["']/)
requireMatch('Life Map boundary reads query identity', boundary, /useSearchParams\(\)/)
requireMatch('Life Map boundary remounts adaptive scene', boundary, /<AdaptiveLifeMapScene key=/)

requireMatch('Active Life Map adaptive hook', lifeMap, /useAdaptiveSpatialQuality\(\)/)
requireMatch('Active Life Map single Canvas', lifeMap, /<Canvas/)
requireMatch('Active Life Map bounded DPR', lifeMap, /dpr=\{\[1, profile\.pixelRatioMax\]\}/)
requireMatch('Active Life Map high-performance preference', lifeMap, /powerPreference: "high-performance"/)
requireMatch('Active Life Map reduced motion', lifeMap, /profile\.reducedMotion/)
requireMatch('Active Life Map explicit demo identity', lifeMap, /params\.get\("demo"\) === "1"/)
requireMatch('Active Life Map near depth', lifeMap, /data-depth-band="near"/)
requireMatch('Active Life Map middle depth', lifeMap, /data-depth-band="middle"/)
requireMatch('Active Life Map far depth', lifeMap, /data-depth-band="far"/)
requireMatch('Active Life Map near parallax', lifeMap, /camera\.position\.x \* 0\.42/)
requireMatch('Active Life Map middle parallax', lifeMap, /camera\.position\.x \* 0\.18/)
requireMatch('Active Life Map damped camera travel', lifeMap, /THREE\.MathUtils\.damp/)
requireMatch('Active Life Map radial atmosphere texture', lifeMap, /createRadialGradient/)
requireMatch('Active Life Map texture disposal', lifeMap, /texture\?\.dispose\(\)/)
requireMatch('Active Life Map context loss handling', lifeMap, /webglcontextlost/)
requireMatch('Active Life Map context restoration', lifeMap, /webglcontextrestored/)
requireMatch('Active Life Map query-preserving Focus path', lifeMap, /destinationHref\("focus"\)/)
requireMatch('Active Life Map query-preserving Replay path', lifeMap, /destinationHref\("replay"\)/)
forbidMatch('Active Life Map rectangular weather geometry', lifeMap.slice(lifeMap.indexOf('function createRadialTexture'), lifeMap.indexOf('function CameraRig')), /planeGeometry|boxGeometry/)
forbidMatch('Active Life Map hardcoded legacy DPR', lifeMap, /dpr=\{\[1,\s*1\.85\]\}/)
forbidMatch('Active Life Map retained high-resolution memory canvases', lifeMap, /canvas\.width\s*=\s*768|canvas\.height\s*=\s*768/)

if (budget) {
  for (const tier of ['low', 'medium', 'high']) {
    const profile = budget.qualityTiers?.[tier]
    if (!profile) { failures.push(`Missing quality tier: ${tier}`); continue }
    for (const key of ['pixelRatioMax', 'particleCount', 'shadows', 'postprocessing', 'antialias']) if (!(key in profile)) failures.push(`Quality tier ${tier} missing ${key}`)
  }
  const assetRoot = path.join(root, 'urai-tier1/public/assets/urai')
  if (fs.existsSync(assetRoot)) walk(assetRoot)
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) { walk(absolute); continue }
      const bytes = fs.statSync(absolute).size
      const extension = path.extname(entry.name).toLowerCase()
      const limit = ['.glb', '.gltf'].includes(extension) ? budget.budgets.largestSingleModelBytes : ['.png', '.jpg', '.jpeg', '.webp', '.avif', '.ktx2', '.hdr'].includes(extension) ? budget.budgets.largestSingleTextureBytes : null
      if (limit && bytes > limit) oversized.push({ path: path.relative(root, absolute), bytes, limit })
    }
  }
}
if (oversized.length) failures.push(`${oversized.length} spatial assets exceed their single-file budget.`)
const report = { ok: failures.length === 0, budgetId: budget?.budgetId ?? null, integrationState: failures.length === 0 ? 'integrated' : 'failed', activeProductionRoute: '/life-map', activeLifeMapPath, activeLifeMapBoundaryPath, activeLifeMapWrapperPath, failures, oversized }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
