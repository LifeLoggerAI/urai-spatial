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

test('accessibility and performance implementation contracts cover Home presentation, first-person Home and first-person Ground', () => {
  const reducedMotion = read('src/spatial/hooks/useReducedMotion.ts')
  const adaptiveQuality = read('src/spatial/performance/useAdaptiveSpatialQuality.ts')
  const companion = read('src/spatial/world/PersistentWorldCompanion.tsx')
  const worldEvents = read('src/spatial/world/worldEvents.ts')
  const homeController = read('src/spatial/home/useHomeExperienceController.ts')
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
    'firstControl.focus()',
    "firstControl.focus({ preventScroll: true })",
    'orbRef.current?.focus()',
    "event.key !== 'Escape'",
    'onClick={toggleCompanion}',
  ]) requireText(companion, marker)
  assert.doesNotMatch(companion, /onKeyDown=\{/, 'Native button keyboard activation must not have a second manual dispatch owner')
  requireText(worldEvents, 'export function takePendingUraiWorldOrbOpen()')
  assert.doesNotMatch(template, /HomeSemanticOrbHydrationBridge/, 'Home must not mount a second capture-phase semantic Orb click owner')
  requireText(worldShell, "const flatControlRoute = pathname === '/settings' || pathname.startsWith('/settings/')")
  requireText(worldShell, "const showWorldCompanion = !flatControlRoute && world.destination !== 'life-map' && world.destination !== 'location-map'")
  requireText(worldShell, "{!flatControlRoute ? <PersistentRealmAtmosphere /> : null}")
  requireText(worldShell, "{!flatControlRoute ? <GroundGateway /> : null}")
  requireText(worldShell, "data-flat-control-route={flatControlRoute ? 'true' : 'false'}")
  requireText(companionCss, 'min-height: 48px;')
  requireText(companionCss, 'min-width: 48px;')
  requireText(companionCss, 'env(safe-area-inset-bottom)')
  requireText(companionCss, '@media (prefers-reduced-motion: reduce)')
  requireText(routeOwnerCss, 'outline: 3px solid rgba(224,255,255,.96) !important;')

  requireNormalizedPattern(homeCapability, /canvas\.getContext\('webgl2'(?:,\s*\{[^)]*\})?\)\s*\?\?\s*canvas\.getContext\('webgl'(?:,\s*\{[^)]*\})?\)/, 'Home must test WebGL2 and WebGL capability')
  requireText(homeRuntime, 'AssetDrivenHomeWorld')
  for (const marker of [
    'aria-label="Open UrAi Orb companion"',
    'aria-label="Open Ground directly"',
    'aria-label="Open Life Map directly"',
    "addEventListener('webglcontextlost', onContextLost)",
    "addEventListener('webglcontextrestored', onContextRestored)",
    'accessible-fallback-after-renderer-failure',
    'role="status"',
  ]) requireText(homeRuntime, marker)
  assert.doesNotMatch(homeRuntime, /Enter first-person Home|home-semantic-avatar|requestHomeAvatarActivation/)
  requireText(homeController, 'activateAvatar')
  requireText(homeController, "type: 'AVATAR_ACTIVATE'")

  for (const marker of [
    "homeState.stableState === 'HOME_PRESENTATION'",
    "homeState.stableState === 'AVATAR_HOME_FIRST_PERSON'",
    'HomeEmbodiedAvatar',
    "'visible-avatar-home-presentation'",
    "'visible-avatar-presentation-activation-gate'",
    "'bodyless-first-person-home'",
    "'shared-keyboard-touch-walk-look-interact'",
    "'avatar-presentation-target-activate'",
    "'home-first-person'",
    "'home-avatar-presentation'",
    'avatar-presentation-to-bodyless-first-person-authored-living-memory-orb-sculpted-sanctuary-and-broad-sky-threshold',
    'data-home-ground-entry="physical-world-surface"',
    'data-home-life-map-entry="visible-sky-broad-interaction"',
    'presentation-avatar-then-first-person-camera-only-no-hands-body-rig',
    'data-home-avatar-activation-gate="required-before-first-person-home"',
    'data-testid="urai-home-avatar-enter-first-person"',
    'useHomeExperienceController',
    'useMovementInput({',
    'stepEmbodiedMotion({',
    'MobileMovementPad',
    'HOME_WALK_SPEED',
    'HOME_WALK_ACCELERATION',
    'HOME_WALK_DECELERATION',
    '(portrait ? 66 : 58)',
    'aria-label="Open Avatar Self View"',
    'THREE.LoopOnce',
    'prefers-reduced-motion: reduce',
  ]) requireText(currentHome, marker)
  assert.match(currentHome, /<HomeEmbodiedAvatar/, 'Home presentation must mount the governed Avatar activation target')
  assert.doesNotMatch(currentHome, /visible-cinematic-avatar|visible-avatar-third-person|hidden-exterior-avatar-first-person/i, 'Home must not restore retired third-person/avatar modes')
  assert.doesNotMatch(currentHome, /first-person-hand|fps-hand|player-hands|weapon-rig/i, 'Bodyless first-person Home must not invent a body/hands rig')
  assert.doesNotMatch(currentHome, /next\.reset\(\)\.setLoop\(THREE\.LoopRepeat\s*,\s*Infinity\)/, 'Orb authored state entry clips must not loop forever')

  for (const marker of [
    'data-ground-exploration="first-person-no-visible-body"',
    'data-ground-runtime-owner="first-person-lived-world"',
    'data-ground-camera="eye-level-terrain-following-no-authored-bob"',
    'data-ground-collision="terrain-plus-authored-obstacle-field"',
    'data-ground-place-layer="consent-aware-empty-by-default"',
    'data-ground-private-location-mounted="false"',
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
    "toHaveAttribute('data-home-stable-state', 'HOME_PRESENTATION'",
    "getByRole('button', { name: 'Enter first-person Home through your Avatar' })",
    "toHaveAttribute('data-home-stable-state', 'AVATAR_HOME_FIRST_PERSON'",
    "toHaveAttribute('data-home-embodied-self', 'camera-only-first-person-home'",
    "toHaveAttribute('data-home-presence-presentation', 'bodyless-first-person-home'",
    "toHaveAttribute('data-home-movement', 'shared-keyboard-touch-walk-look-interact'",
    "toHaveAttribute('data-home-non-xr-body-policy', 'camera-only-no-hands-body-rig'",
    "toHaveAttribute('data-home-presence-policy', 'presentation-avatar-then-first-person-camera-only-no-hands-body-rig'",
    "getByRole('button', { name: 'Open Avatar Self View' })",
    "name: 'Move through Home'",
    'data-ground-exploration="first-person-no-visible-body"',
    "name: 'Ground first-person movement controls'",
  ]) requireText(embodiedEvidence, marker)

  requireText(focus, "'Enter Replay for ' + memory.title")
  assert.equal(focus.includes('min-height:44px'), false, 'Focus controls must not retain 44px minimum targets')
  requireText(focus, 'min-height:48px')
  requireText(focus, 'env(safe-area-inset-left)')
  requireText(focus, 'env(safe-area-inset-right)')
  requireText(focus, 'env(safe-area-inset-bottom)')
  requireText(focus, '@media(prefers-reduced-motion:reduce)')

  requireText(playwrightConfig, 'python3 -m http.server 3000')
  assert.equal(playwrightConfig.includes('next dev'), false, 'Performance evidence must not use a development server')
  for (const marker of ['DESKTOP_FRAME_P95_BUDGET_MS = 20', 'MOBILE_FRAME_P95_BUDGET_MS = 33.3', 'MAX_HEAP_GROWTH_BYTES = 32 * 1024 * 1024', 'JOURNEY_CYCLES = 5', "serverMode: 'static-export'", 'WEBGL_debug_renderer_info', 'hardwareAcceleration']) requireText(performanceMetrics, marker)
  for (const marker of ['[data-urai-audit-action="orb-controls"]', "name: 'Open UrAi Orb companion', exact: true", "toHaveAttribute('aria-hidden', 'false'"]) requireText(accessibilityEvidence, marker)
})
