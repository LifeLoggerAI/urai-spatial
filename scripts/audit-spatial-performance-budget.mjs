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
const adaptiveControllerPath = 'urai-tier1/src/spatial/performance/useAdaptiveSpatialQuality.ts'
const activeLifeMapPath = 'urai-tier1/src/components/lifemap/CosmicComposedLifeMapScene.tsx'
const activeLifeMapBoundaryPath = 'urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx'
const activeLifeMapWrapperPath = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const resourceLifeMapPath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const visualSystemPath = 'urai-tier1/src/components/lifemap/lifeMapVisualSystem.ts'
const isolationPath = 'urai-tier1/src/spatial/world/lifeMapProductionIsolation.css'

const budgetSource = read(budgetPath)
const canvas = read(canvasPath)
const adaptiveController = read(adaptiveControllerPath)
const lifeMap = read(activeLifeMapPath)
const boundary = read(activeLifeMapBoundaryPath)
const wrapper = read(activeLifeMapWrapperPath)
const resourceLifeMap = read(resourceLifeMapPath)
const visualSystem = read(visualSystemPath)
const isolation = read(isolationPath)

let budget = null
try { budget = JSON.parse(budgetSource) } catch (error) { failures.push(`Invalid ${budgetPath}: ${error.message}`) }

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) requireMatch(`Adaptive controller ${marker}`, adaptiveController, new RegExp(marker))
for (const marker of ['particleCount', 'pixelRatioMax', 'shadows', 'postprocessing', 'antialias']) requireMatch(`Secondary spatial Canvas consumes ${marker}`, canvas, new RegExp(`profile\\.${marker}`))

requireMatch('Active route imports Life Map boundary', wrapper, /import(?:\s+LifeMapRouteBoundary\s+from\s+|\()["']@\/components\/lifemap\/LifeMapRouteBoundary["']\)?/)
requireMatch('Active route renders Life Map boundary', wrapper, /<LifeMapRouteBoundary\s*\/>/)
requireMatch('Active route wraps query reader in Suspense', wrapper, /<Suspense[\s\S]*<LifeMapAccessGate/)
requireMatch('Signed-out route does not mount private memories', wrapper, /data-private-memory-mounted="false"/)
forbidMatch('Wrapper retains implicit demo authority', wrapper, /lifeMapDemoMode|DEMO_MODE_KEY/)

requireMatch('Life Map boundary imports cosmic scene', boundary, /import ComposedLifeMapScene from ["']\.\/CosmicComposedLifeMapScene["']/)
requireMatch('Life Map boundary imports semantic navigator', boundary, /import LifeMapSemanticNavigator from ["']\.\/LifeMapSemanticNavigator["']/)
requireMatch('Life Map boundary preserves one stable scene and semantic navigator', boundary, /return <>\s*<ComposedLifeMapScene \/>\s*<LifeMapSemanticNavigator \/>\s*<\/>/)
forbidMatch('Life Map boundary remounts on query identity', boundary, /useSearchParams|key=|revision|previousIdentity/)

for (const marker of ['pixelRatioMax', 'antialias', 'reducedMotion', 'tier', 'documentVisible']) requireMatch(`Active cosmic Life Map consumes ${marker}`, lifeMap, new RegExp(`profile\\.${marker}`))
requireMatch('Active cosmic Life Map single Canvas', lifeMap, /<Canvas/)
requireMatch('Active cosmic Life Map bounded DPR', lifeMap, /dpr=\{\[1,\s*profile\.pixelRatioMax\]\}/)
requireMatch('Active cosmic Life Map visibility-aware frameloop', lifeMap, /frameloop=\{profile\.documentVisible \? "always" : "never"\}/)
requireMatch('Active cosmic Life Map high-performance preference', lifeMap, /powerPreference:\s*"high-performance"/)
requireMatch('Active cosmic Life Map explicit demo identity', lifeMap, /params\.get\("demo"\) === "1"/)
requireMatch('Active cosmic Life Map adaptive low star tier', lifeMap, /tier === "low" \? 650/)
requireMatch('Active cosmic Life Map adaptive medium star tier', lifeMap, /tier === "medium" \? 1100/)
requireMatch('Active cosmic Life Map bounded high star tier', lifeMap, /: 1700/)
requireMatch('Active cosmic Life Map galaxy geometry disposal', lifeMap, /geometry\.dispose\(\)/)
requireMatch('Active cosmic Life Map reduced-motion galaxy guard', lifeMap, /root\.current && !reducedMotion/)
requireMatch('Active cosmic Life Map context loss handling', lifeMap, /webglcontextlost/)
requireMatch('Active cosmic Life Map context restoration', lifeMap, /webglcontextrestored/)
requireMatch('Active cosmic Life Map query-preserving Focus path', lifeMap, /destinationHref\("focus"\)/)
requireMatch('Active cosmic Life Map query-preserving Replay path', lifeMap, /destinationHref\("replay"\)/)
requireMatch('Active cosmic Life Map selection bridge', lifeMap, /LIFE_MAP_SELECTION_EVENT/)
requireMatch('Active cosmic Life Map render-proof ready publication', lifeMap, /lifeMapRenderReady/)
requireMatch('Active cosmic Life Map render-proof anchor publication', lifeMap, /lifeMapVisibleAnchors/)
requireMatch('Active cosmic Life Map render-proof object publication', lifeMap, /lifeMapVisibleObjects/)
requireMatch('Active cosmic Life Map render-proof call publication', lifeMap, /lifeMapRenderCalls/)
requireMatch('Active cosmic Life Map render-proof thresholds', lifeMap, /gl\.info\.render\.calls > 0 && objects > 20 && anchors >= 8/)
requireMatch('Active cosmic Life Map ACES tone mapping', lifeMap, /ACESFilmicToneMapping/)
requireMatch('Active cosmic Life Map bounded exposure', lifeMap, /toneMappingExposure = 1\.06/)
requireMatch('Active cosmic Life Map portrait-aware camera', lifeMap, /size\.height > size\.width/)
requireMatch('Active cosmic Life Map layout-safe initial camera placement', lifeMap, /useLayoutEffect/)
requireMatch('Active cosmic Life Map phase timing is bounded', lifeMap, /PHASE_MS\[phase\]/)
requireMatch('Active cosmic Life Map declares no ground owner', lifeMap, /data-life-map-ground="none"/)
requireMatch('Active cosmic Life Map declares stellar visual authority', lifeMap, /data-life-map-visual-authority="v260-deep-stellar-personal-universe"/)
for (const marker of ['life-map-deep-space', 'life-map-deep-stellar-field', 'life-map-nebula-veil-', 'life-map-constellations', 'life-map-memory-stars', 'life-map-selected-memory-dust', 'life-map-emotional-weather']) requireMatch(`Active cosmic Life Map ${marker}`, lifeMap, new RegExp(marker))
requireMatch('Active cosmic Life Map explicitly retires graph edges', lifeMap, /v260-no-explicit-graph-edges/)
requireMatch('Active cosmic Life Map stars identify non-graph visual authority', lifeMap, /stellar-memory-not-node-graph/)
forbidMatch('Active cosmic Life Map cannot render graph edge primitives', lifeMap, /<Line\b|lineSegments|dodecahedronGeometry|icosahedronGeometry/)
forbidMatch('Active cosmic Life Map cannot own terrain', lifeMap, /LivingMemoryGeography|memoryValley|ChapterTerritories|lifeMapTerrainHeight|weathered-valley-floor|worn-lineage-path/)
forbidMatch('Active cosmic Life Map cannot import terrain layout owner', lifeMap, /lifeMapSpatialLayout/)
forbidMatch('Active cosmic Life Map cannot retain high-resolution generated canvases', lifeMap, /canvas\.width\s*=\s*768|canvas\.height\s*=\s*768/)

for (const family of ['visual', 'audio', 'relationship', 'place', 'emotion', 'pattern', 'achievement', 'goal', 'future', 'everyday', 'archive', 'protected']) requireMatch(`Visual system artifact family ${family}`, visualSystem, new RegExp(`"${family}"`))

requireMatch('Canonical Life Map hides shared atmosphere', isolation, /urai-world-atmosphere/)
requireMatch('Canonical Life Map hides asset-spine plate', isolation, /urai-final-asset-spine-scene-layer/)
requireMatch('Canonical Life Map forces visible canvas', isolation, /canvas[\s\S]*opacity: 1 !important/)
requireMatch('Canonical Life Map removes dashboard inspector', isolation, /life-map-semantic-inspector/)

requireMatch('Fallback Life Map atmospheric texture remains bounded', resourceLifeMap, /canvas\.width = 256[\s\S]*canvas\.height = 256/)
requireMatch('Fallback Life Map radial atmosphere texture remains disposable', resourceLifeMap, /createRadialGradient/)
requireMatch('Fallback Life Map texture lifecycle disposes exact texture', resourceLifeMap, /return \(\) => nextTexture\?\.dispose\(\)/)
forbidMatch('Fallback Life Map atmosphere uses rectangular weather geometry', resourceLifeMap.slice(resourceLifeMap.indexOf('function createRadialTexture'), resourceLifeMap.indexOf('function CameraRig')), /planeGeometry|boxGeometry/)

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

const report = { ok: failures.length === 0, budgetId: budget?.budgetId ?? null, integrationState: failures.length === 0 ? 'integrated' : 'failed', activeProductionRoute: '/life-map', activeLifeMapPath, activeLifeMapBoundaryPath, activeLifeMapWrapperPath, visualSystemPath, isolationPath, resourceLifeMapPath, failures, oversized }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
