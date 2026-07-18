import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const testDirectory = path.dirname(fileURLToPath(import.meta.url))
const read = (relativePath) => fs.readFileSync(path.resolve(testDirectory, '..', relativePath), 'utf8')
const requireText = (source, marker, message = marker) => assert.equal(source.includes(marker), true, message)

test('accessibility and performance implementation contracts are present', () => {
  const reducedMotion = read('src/spatial/hooks/useReducedMotion.ts')
  const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')
  const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
  const worldShell = read('src/spatial/world/UraiWorldShell.tsx')
  const companionCss = read('src/spatial/world/persistentWorldCompanion.css')
  const homeCanvas = read('src/app/HomeSpatialCanvas.tsx')
  const homeRuntime = read('src/app/HomeSpatialRuntimeLayer.tsx')
  const homeFallback = read('src/app/FinalHomeThreshold.tsx')
  const focus = read('src/app/focus/FocusChamberClient.tsx')
  const focusCss = read('src/app/focus/FocusChamber.module.css')
  const cinematicFocusCss = read('src/app/focus/FocusChamberCinematic.module.css')
  const landscapeFocusCss = read('src/app/focus/FocusChamberLandscape.module.css')
  const accessibilityWorkflow = read('../.github/workflows/accessibility-performance-evidence.yml')
  const ground = read('src/app/GroundSpatialWorldClean.tsx')
  const playwrightConfig = read('../playwright.accessibility.config.ts')
  const performanceMetrics = read('tests/accessibility-performance-metrics.spec.ts')
  const accessibilityEvidence = read('tests/accessibility-performance-evidence.spec.ts')

  requireText(reducedMotion, 'prefers-reduced-motion: reduce')
  requireText(reducedMotion, "addEventListener?.('change', update)")
  requireText(reducedMotion, "removeEventListener?.('change', update)")

  for (const marker of ['saveData', 'deviceMemory', 'effectiveType', 'visibilitychange', 'markFirstSpatialFrame']) {
    requireText(adaptiveQuality, marker)
  }

  requireText(companion, "open ? 'Close Orb travel controls' : 'Open Orb travel controls'")
  requireText(companion, 'aria-expanded={open}')
  requireText(companion, 'aria-controls="urai-world-companion-menu"')
  requireText(companion, 'inert={!open ? true : undefined}')
  requireText(companion, 'firstControl?.focus()')
  requireText(companion, 'orbRef.current?.focus()')
  requireText(companion, "event.key !== 'Escape'")
  requireText(companion, "event.key !== 'Enter' && event.key !== ' '")
  requireText(companion, 'event.stopPropagation()')
  requireText(companion, 'onClick={toggleCompanion}')
  requireText(companion, 'const [hydrated, setHydrated] = useState(false)')
  requireText(companion, 'setHydrated(true)')
  requireText(companion, "disabled={!hydrated || phase !== 'idle'}")
  requireText(companion, "aria-current={destination.id === world.destination ? 'page' : undefined}")
  requireText(companion, 'aria-label="Return through the world"')
  requireText(worldShell, "const COMPANION_FREE_DESTINATIONS = new Set(['life-map', 'focus'])")
  requireText(worldShell, 'const showWorldCompanion = !COMPANION_FREE_DESTINATIONS.has(world.destination)')
  requireText(worldShell, 'showWorldCompanion ? <PersistentWorldCompanion /> : null')

  requireText(companionCss, 'width: 64px;')
  requireText(companionCss, 'height: 64px;')
  requireText(companionCss, 'min-height: 48px;')
  requireText(companionCss, 'min-width: 48px;')
  requireText(companionCss, 'env(safe-area-inset-bottom)')
  requireText(companionCss, '@media (prefers-reduced-motion: reduce)')

  requireText(homeCanvas, "canvas.getContext('webgl2') ?? canvas.getContext('webgl')")
  requireText(homeFallback, 'data-testid="urai-home-accessible-fallback"')
  requireText(homeFallback, '<HomeSpatialWorldFinal />')
  requireText(homeRuntime, "addEventListener('webglcontextlost', onContextLost)")
  requireText(homeRuntime, "addEventListener('webglcontextrestored', onContextRestored)")
  requireText(homeRuntime, 'recoveryAttemptsRef.current >= 1')
  requireText(homeRuntime, 'accessible-fallback-after-renderer-failure')
  requireText(homeRuntime, 'role="status"')

  requireText(ground, "event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' })")
  assert.equal(ground.includes('min-height:44px'), false, 'Ground destinations must not retain 44px targets')
  requireText(ground, 'min-height:48px')

  requireText(focus, 'aria-label={`Open Replay for ${memory.title}`}')
  requireText(focus, 'data-orb-owner="none"')
  assert.equal(focusCss.includes('min-height:44px'), false, 'Focus controls must not retain 44px minimum targets')
  requireText(focusCss, 'min-height: 48px;')
  requireText(focusCss, 'env(safe-area-inset-left)')
  requireText(focusCss, 'env(safe-area-inset-right)')
  requireText(focusCss, 'env(safe-area-inset-bottom)')
  requireText(focusCss, '@media (prefers-reduced-motion: reduce)')
  requireText(cinematicFocusCss, '@media (prefers-reduced-motion: reduce)')
  requireText(cinematicFocusCss, '@media (orientation: landscape) and (max-height: 520px)')
  assert.equal(cinematicFocusCss.includes('min-height: 44px;'), false, 'Short-landscape Focus controls must retain 48px targets')
  requireText(cinematicFocusCss, ".cinematic details summary {\n    min-height: 48px;")
  requireText(landscapeFocusCss, '@media (orientation: landscape) and (max-height: 520px)')
  for (const workflowPath of [
    'urai-tier1/src/app/focus/FocusChamber.module.css',
    'urai-tier1/src/app/focus/FocusChamberCinematic.module.css',
    'urai-tier1/src/app/focus/FocusChamberLandscape.module.css',
    'urai-tier1/src/spatial/lifemap/LifeMapDeepLinkControls.tsx',
    'urai-tier1/src/spatial/lifemap/SpatialLifeMapCanonical.tsx',
    'urai-tier1/src/spatial/memory/selectedMemoryContract.ts',
    'urai-tier1/src/spatial/world/UraiWorldShell.tsx',
    'urai-tier1/src/spatial/world/WorldStateProvider.tsx',
    'urai-tier1/src/spatial/world/WorldTransitionController.tsx',
    'urai-tier1/src/spatial/world/worldEvents.ts',
  ]) {
    requireText(accessibilityWorkflow, workflowPath, `Accessibility evidence must trigger for ${workflowPath}`)
  }
  requireText(accessibilityWorkflow, 'pnpm build:static', 'Accessibility evidence must build the exact static export consumed by Playwright.')
  assert.equal(accessibilityWorkflow.includes('pnpm --dir urai-tier1 build\n'), false, 'Accessibility evidence must not run a non-export Next build.')
  requireText(accessibilityWorkflow, 'test -f urai-tier1/out/focus/index.html')
  requireText(accessibilityWorkflow, 'test -f urai-tier1/out/replay/index.html')
  requireText(accessibilityWorkflow, 'test -f urai-tier1/out/life-map/index.html')
  requireText(accessibilityWorkflow, 'artifacts/accessibility-performance', 'Browser reports, screenshots, traces, and attachments must be retained.')

  requireText(playwrightConfig, 'python3 -m http.server 3000')
  assert.equal(playwrightConfig.includes('next dev'), false, 'Performance evidence must not use a development server')
  for (const marker of [
    'DESKTOP_FRAME_P95_BUDGET_MS = 20',
    'MOBILE_FRAME_P95_BUDGET_MS = 33.3',
    'MAX_HEAP_GROWTH_BYTES = 32 * 1024 * 1024',
    'JOURNEY_CYCLES = 5',
    "serverMode: 'static-export'",
    'WEBGL_debug_renderer_info',
    'NOT_AVAILABLE_HARDWARE_RENDERER',
    'hardwareAcceleration',
  ]) {
    requireText(performanceMetrics, marker)
  }

  for (const marker of [
    '[data-urai-audit-action="orb-controls"]',
    'toHaveAccessibleName(/close orb travel controls/i)',
    'hasScrollableAncestor',
    'scrollableGroundRail',
    'focusContainment.filter',
    "toHaveAttribute('data-phase', 'idle')",
    "page.keyboard.press('Escape')",
  ]) {
    requireText(accessibilityEvidence, marker)
  }
})
