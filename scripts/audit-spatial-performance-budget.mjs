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
const activeLifeMapPath = 'urai-tier1/src/components/lifemap/ComposedLifeMapScene.tsx'
const productionWorldPath = 'urai-tier1/src/components/lifemap/LifeMapProductionWorld.tsx'
const visualSystemPath = 'urai-tier1/src/components/lifemap/lifeMapVisualSystem.ts'
const resourceLifeMapPath = 'urai-tier1/src/components/lifemap/AdaptiveLifeMapScene.tsx'
const activeLifeMapBoundaryPath = 'urai-tier1/src/components/lifemap/LifeMapRouteBoundary.tsx'
const activeLifeMapWrapperPath = 'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx'
const isolationPath = 'urai-tier1/src/spatial/world/lifeMapProductionIsolation.css'
const budgetSource = read(budgetPath)
const canvas = read(canvasPath)
const adaptiveController = read(adaptiveControllerPath)
const lifeMap = read(activeLifeMapPath)
const productionWorld = read(productionWorldPath)
const visualSystem = read(visualSystemPath)
const resourceLifeMap = read(resourceLifeMapPath)
const boundary = read(activeLifeMapBoundaryPath)
const wrapper = read(activeLifeMapWrapperPath)
const isolation = read(isolationPath)
let budget = null
try { budget = JSON.parse(budgetSource) } catch (error) { failures.push(`Invalid ${budgetPath}: ${error.message}`) }

for (const marker of ['deviceMemory', 'hardwareConcurrency', 'saveData', 'effectiveType', 'documentVisible']) requireMatch(`Adaptive controller ${marker}`, adaptiveController, new RegExp(marker))
for (const marker of ['particleCount', 'pixelRatioMax', 'shadows', 'postprocessing', 'antialias']) requireMatch(`Secondary spatial Canvas consumes ${marker}`, canvas, new RegExp(`profile\\.${marker}`))
for (const marker of ['pixelRatioMax', 'antialias', 'reducedMotion', 'shadows', 'documentVisible']) requireMatch(`Active Life Map consumes ${marker}`, lifeMap, new RegExp(`profile\\.${marker}`))
for (const marker of ['tier', 'postprocessing', 'reducedMotion']) requireMatch(`Production Life Map consumes ${marker}`, productionWorld, new RegExp(`profile\\.${marker}`))

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

requireMatch('Life Map boundary imports composed scene', boundary, /import ComposedLifeMapScene from ["']\.\/ComposedLifeMapScene["']/)
requireMatch('Life Map boundary imports semantic navigator', boundary, /import LifeMapSemanticNavigator from ["']\.\/LifeMapSemanticNavigator["']/)
requireMatch('Life Map boundary preserves one stable composed scene and semantic navigator', boundary, /return <>\s*<ComposedLifeMapScene \/>\s*<LifeMapSemanticNavigator \/>\s*<\/>/)
forbidMatch('Life Map boundary remounts on query identity', boundary, /useSearchParams|key=|revision|previousIdentity/)

requireMatch('Active Life Map adaptive hook', lifeMap, /useAdaptiveSpatialQuality\(\)/)
requireMatch('Active Life Map imports production world', lifeMap, /import \{ LifeMapProductionWorld/)
requireMatch('Active Life Map mounts production world', lifeMap, /<LifeMapProductionWorld/)
requireMatch('Active Life Map single Canvas', lifeMap, /<Canvas/)
requireMatch('Active Life Map bounded DPR', lifeMap, /dpr=\{\[1, profile\.pixelRatioMax\]\}/)
requireMatch('Active Life Map visibility-aware frameloop', lifeMap, /frameloop=\{profile\.documentVisible \? "always" : "never"\}/)
requireMatch('Active Life Map high-performance preference', lifeMap, /powerPreference: "high-performance"/)
requireMatch('Active Life Map reduced motion', lifeMap, /profile\.reducedMotion/)
requireMatch('Active Life Map explicit demo identity', lifeMap, /params\.get\("demo"\) === "1"/)
requireMatch('Active Life Map damped camera travel', lifeMap, /THREE\.MathUtils\.damp/)
requireMatch('Active Life Map persistent camera position goal', lifeMap, /positionGoal = useRef\(new THREE\.Vector3\(\)\)/)
requireMatch('Active Life Map persistent camera target goal', lifeMap, /targetGoal = useRef\(new THREE\.Vector3\(\)\)/)
requireMatch('Active Life Map persistent look target', lifeMap, /lookTarget = useRef\(new THREE\.Vector3/)
requireMatch('Active Life Map portrait framing', lifeMap, /size\.height > size\.width/)
requireMatch('Active Life Map layout-safe initial camera placement', lifeMap, /useLayoutEffect/)
requireMatch('Active Life Map context loss handling', lifeMap, /webglcontextlost/)
requireMatch('Active Life Map context restoration', lifeMap, /webglcontextrestored/)
requireMatch('Active Life Map query-preserving Focus path', lifeMap, /destinationHref\("focus"\)/)
requireMatch('Active Life Map query-preserving Replay path', lifeMap, /destinationHref\("replay"\)/)
requireMatch('Active Life Map ACES tone mapping', lifeMap, /ACESFilmicToneMapping/)
requireMatch('Active Life Map controlled exposure', lifeMap, /toneMappingExposure = 1\.15/)
requireMatch('Production Life Map owns render proof publication', productionWorld, /function RenderProofRepublisher\(/)
requireMatch('Production Life Map render proof invalidates on context loss', productionWorld, /webglcontextlost/)
requireMatch('Production Life Map render proof republishes on context restoration', productionWorld, /webglcontextrestored/)
requireMatch('Production Life Map render proof enforces visible-object and anchor thresholds', productionWorld, /lifeMapRenderReady = calls > 0 && objects > 20 && anchors >= 8 \? "true" : "false"/)
requireMatch('Production Life Map mounts its proof publisher', productionWorld, /<RenderProofRepublisher \/>/)
forbidMatch('Active Life Map duplicates production proof attributes', lifeMap, /data-life-map-render-(?:ready|calls|triangles|visible)/)
requireMatch('Active Life Map sequential phase timing', lifeMap, /PHASE_DURATION_MS\[phase\]/)
forbidMatch('Active Life Map hardcoded legacy DPR', lifeMap, /dpr=\{\[1,\s*1\.85\]\}/)
forbidMatch('Active Life Map retained high-resolution memory canvases', lifeMap, /canvas\.width\s*=\s*768|canvas\.height\s*=\s*768/)

for (const marker of ['life-map-white-gold-life-core', 'life-map-authored-chapter-regions', 'life-map-curved-semantic-paths', 'life-map-memory-artifact-families', 'life-map-achievement-monument', 'life-map-goal-horizon', 'life-map-privacy-vault', 'life-map-emotional-weather', 'life-map-archive-particles', 'life-map-intimate-memory-chamber']) requireMatch(`Production world ${marker}`, productionWorld, new RegExp(marker))
for (const family of ['visual', 'audio', 'relationship', 'place', 'emotion', 'pattern', 'achievement', 'goal', 'future', 'everyday', 'archive', 'protected']) requireMatch(`Visual system artifact family ${family}`, visualSystem, new RegExp(`"${family}"`))
requireMatch('Production world adaptive particle tiers', productionWorld, /qualityTier === "low" \? 80 : qualityTier === "medium" \? 150 : 240/)
requireMatch('Production world adaptive star tiers', productionWorld, /profile\.tier === "low" \? 420 : profile\.tier === "medium" \? 760 : 1160/)
requireMatch('Production world quality-aware postprocessing', productionWorld, /active=\{profile\.postprocessing\}/)
requireMatch('Production world reduced-motion animation guards', productionWorld, /if \(!group\.current \|\| reducedMotion\) return/)
forbidMatch('Production memory artifact reintroduces generic sphere owner', productionWorld.slice(productionWorld.indexOf('function MemoryArtifact'), productionWorld.indexOf('function SemanticPath')), /sphereGeometry/)

requireMatch('Canonical Life Map hides shared atmosphere', isolation, /urai-world-atmosphere/)
requireMatch('Canonical Life Map hides asset-spine plate', isolation, /urai-final-asset-spine-scene-layer/)
requireMatch('Canonical Life Map forces visible canvas', isolation, /canvas[\s\S]*opacity: 1 !important/)
requireMatch('Canonical Life Map removes dashboard inspector', isolation, /life-map-semantic-inspector/)

requireMatch('Life Map atmospheric texture remains bounded', resourceLifeMap, /canvas\.width = 256[\s\S]*canvas\.height = 256/)
requireMatch('Life Map radial atmosphere texture remains disposable', resourceLifeMap, /createRadialGradient/)
requireMatch('Life Map texture lifecycle disposes the exact created texture', resourceLifeMap, /return \(\) => nextTexture\?\.dispose\(\)/)
requireMatch('Life Map near parallax remains adaptive', resourceLifeMap, /camera\.position\.x \* (?:0?\.)42/)
requireMatch('Life Map middle parallax remains adaptive', resourceLifeMap, /camera\.position\.x \* (?:0?\.)18/)
forbidMatch('Life Map atmospheric resource uses rectangular weather geometry', resourceLifeMap.slice(resourceLifeMap.indexOf('function createRadialTexture'), resourceLifeMap.indexOf('function CameraRig')), /planeGeometry|boxGeometry/)

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
const report = { ok: failures.length === 0, budgetId: budget?.budgetId ?? null, integrationState: failures.length === 0 ? 'integrated' : 'failed', activeProductionRoute: '/life-map', activeLifeMapPath, productionWorldPath, visualSystemPath, isolationPath, resourceLifeMapPath, activeLifeMapBoundaryPath, activeLifeMapWrapperPath, failures, oversized }
console.log(JSON.stringify(report, null, 2))
if (failures.length) process.exitCode = 1
