import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => fs.readFileSync(path.resolve(testDirectory, '..', relativePath), 'utf8')
const requireText = (source, marker, message = marker) => assert.equal(source.includes(marker), true, message)
const normalizeSource = (source) => source.replace(/\r\n/g, '\n').replace(/"/g, "'").replace(/\s+/g, ' ')
const requireNormalizedPattern = (source, pattern, message) => assert.match(normalizeSource(source), pattern, message)

test('accessibility and performance implementation contracts are present on visible-avatar Home and first-person Ground', () => {
  const reducedMotion = read('src/spatial/hooks/useReducedMotion.ts')
  const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')
  const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
  const worldEvents = read('src/spatial/world/worldEvents.ts')
  const template = read('src/app/template.tsx')
  const worldShell = read('src/spatial/world/UraiWorldShell.tsx')
  const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
  const routeOwnerCss = read('src/spatial/world/routeOwnerConvergence.css')
  const homeCapability = read('src/app/HomeSpatialCanvas.tsx')
  const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const currentHome = read('src/spatial/layout/HomeWorldProductionV223.tsx')
  const focus = read('src/app/focus/FocusChamberClient.tsx')
  const ground = read('src/app/GroundSpatialWorldClean.tsx')
  const playwrightConfig = read('../playwright.accessibility.config.ts')
  const performanceMetrics = read('tests/accessibility-performance-metrics.spec.ts')
  const accessibilityEvidence = read('tests/accessibility-performance-evidence.spec.ts')
  const embodiedEvidence = read('tests/accessibility-performance-embodied-exploration.spec.ts')

  requireText(reducedMotion, 'prefers-reduced-motion: reduce')
  requireText(reducedMotion, "addEventListener?.('change', update)")
  requireText(reducedMotion, "removeEventListener?.('change', update)")
  for (const marker of ['saveData', 'deviceMemory', 'effectiveType', 'visibilitychange', 'markFirstSpatialFrame']) requireText(adaptiveQuality, marker)

  for (const marker of [
    "open ? 'Close Orb travel controls' : 'Open Orb travel controls'",
    'aria-expanded={open}',
    'aria-controls="urai-world-companion-menu"',
    'inert={!open ? true : undefined}',
    'firstControl?.focus()',
    'orbRef.current?.focus()',
    "event.key !== 'Escape'",
    'onClick={toggleCompanion}',
  ]) requireText(companion, marker)
  assert.doesNotMatch(companion, /onKeyDown=\{/, 'Native button keyboard activation must not have a second manual dispatch owner')
  requireText(worldEvents, 'export function takePendingUraiWorldOrbOpen()')
  assert.doesNotMatch(template, /HomeSemanticOrbHydrationBridge/, 'Home must not mount a second capture-phase semantic Orb click owner')
  requireText(worldShell, "const showWorldCompanion = world.destination !== 'life-map'")
  requireText(companionCss, 'min-height: 48px;')
  requireText(companionCss, 'min-width: 48px;')
  requireText(companionCss, 'env(safe-area-inset-bottom)')
  requireText(companionCss, '@media (prefers-reduced-motion: reduce)')
  requireText(routeOwnerCss, 'outline: 3px solid rgba(224,255,255,.96) !important;')

  requireNormalizedPattern(homeCapability, /canvas\.getContext\('webgl2'(?:,\s*\{[^)]*\})?\)\s*\?\?\s*canvas\.getContext\('webgl'(?:,\s*\{[^)]*\})?\)/, 'Home must test WebGL2 and WebGL capability')
  requireText(homeRuntime, 'AssetDrivenHomeWorld')
  requireText(homeRuntime, 'aria-label="Open URAI Orb companion"')
  requireText(homeRuntime, 'aria-label="Open Ground directly"')
  requireText(homeRuntime, 'aria-label="Open Life Map directly"')
  requireText(homeRuntime, "addEventListener('webglcontextlost', onContextLost)")
  requireText(homeRuntime, "addEventListener('webglcontextrestored', onContextRestored)")
  requireText(homeRuntime, 'accessible-fallback-after-renderer-failure')
  requireText(homeRuntime, 'role="status"')

  for (const marker of [
    'data-home-embodied-self="visible-cinematic-avatar"',
    'data-home-presence-presentation="visible-avatar-third-person"',
    'data-home-movement="camera-look-world-surface-selection"',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    "'cinematic-third-person'",
    'home-visible-user-avatar',
    'home-living-memory-orb',
    '/assets/urai/generated/models/urai-orb-avatar-v1.glb',
    '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb',
    'THREE.LoopOnce',
    'prefers-reduced-motion: reduce',
  ]) requireText(currentHome, marker)
  assert.doesNotMatch(currentHome, /first-person-viewpoint-no-avatar|privacy-preserving-first-person/, 'Home must not regress to retired no-avatar presentation')
  assert.doesNotMatch(currentHome, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/, 'Orb authored state entry clips must not loop forever')
  assert.match(currentHome, /idle\.reset\(\)\.setLoop\(THREE\.LoopRepeat, Infinity\)/, 'The supported Avatar idle clip may loop while reduced motion is off')
  assert.doesNotMatch(currentHome, /MobileMovementPad|useMovementInput|stepEmbodiedMotion/, 'Home must not regress to a synthetic movement-pad world')

  for (const marker of [
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-runtime-owner="first-person-lived-world"',
    'data-ground-camera="eye-level-terrain-following-no-authored-bob"',
    'data-ground-collision="terrain-plus-authored-obstacle-field"',
    'data-ground-place-layer="consent-aware-empty-by-default"',
    'data-ground-private-location-mounted="false"',
    'data-ground-pointer-lock="false"',
    'data-ground-visible-avatar="false"',
    'data-ground-visible-hands="false"',
    'MobileMovementPad',
    'aria-label="Return Home"',
    'aria-label="Ground place and privacy tools"',
    'min-width:48px',
    'min-height:48px',
    'env(safe-area-inset-right)',
    'env(safe-area-inset-left)',
    '@media(prefers-reduced-motion:reduce)',
  ]) requireText(ground, marker)
  assert.doesNotMatch(ground, /ground-destination-compass|GroundPhysicalArchitecture|GroundVaultArchitecture|ground-central-nexus/, 'Ground must not restore the institutional destination hub')
  assert.doesNotMatch(routeOwnerCss, /ground-spatial-root canvas[\s\S]{0,220}transform:\s*scale\(/, 'Ground canvas must not exceed viewport through CSS scaling')
  requireText(routeOwnerCss, 'max-width: 100vw !important;')
  requireText(routeOwnerCss, 'max-height: 100svh !important;')

  for (const marker of [
    "toHaveAttribute('data-home-embodied-self', 'visible-cinematic-avatar'",
    "toHaveAttribute('data-home-presence-presentation', 'visible-avatar-third-person'",
    "toHaveAttribute('data-home-movement', 'camera-look-world-surface-selection'",
    "data-home-orb-runtime-asset",
    "data-home-avatar-runtime-asset",
    'data-ground-exploration="first-person-no-visible-body"',
    "name: 'Ground first-person movement controls'",
  ]) requireText(embodiedEvidence, marker)
  assert.doesNotMatch(embodiedEvidence, /toHaveAttribute\('data-home-embodied-self', 'first-person-viewpoint-no-avatar'\)/, 'Accessibility evidence must not reassert retired no-avatar Home')

  requireText(focus, 'aria-label={`Open Replay for ${memory.title}`}')
  assert.equal(focus.includes('min-height:44px'), false, 'Focus controls must not retain 44px minimum targets')
  requireText(focus, 'min-height:48px')
  requireText(focus, 'env(safe-area-inset-left)')
  requireText(focus, 'env(safe-area-inset-right)')
  requireText(focus, 'env(safe-area-inset-bottom)')
  requireText(focus, '@media(prefers-reduced-motion:reduce)')

  requireText(playwrightConfig, 'python3 -m http.server 3000')
  assert.equal(playwrightConfig.includes('next dev'), false, 'Performance evidence must not use a development server')
  for (const marker of ['DESKTOP_FRAME_P95_BUDGET_MS = 20', 'MOBILE_FRAME_P95_BUDGET_MS = 33.3', 'MAX_HEAP_GROWTH_BYTES = 32 * 1024 * 1024', 'JOURNEY_CYCLES = 5', "serverMode: 'static-export'", 'WEBGL_debug_renderer_info', 'hardwareAcceleration']) requireText(performanceMetrics, marker)
  for (const marker of ['[data-urai-audit-action="orb-controls"]', "name: 'Open URAI Orb companion', exact: true", "toHaveAttribute('aria-hidden', 'false'"]) requireText(accessibilityEvidence, marker)
})
