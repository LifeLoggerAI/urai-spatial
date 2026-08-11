import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const launcherPath = fileURLToPath(new URL('../../scripts/run-lifemap-founder-proof-fixed.mjs', import.meta.url))
const runnerPath = fileURLToPath(new URL('../../scripts/capture-lifemap-founder-proof-fixed.mjs', import.meta.url))
const launcher = await readFile(launcherPath, 'utf8')
const runner = await readFile(runnerPath, 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const world = await readFile(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')
const isolation = await readFile(new URL('../src/spatial/world/lifeMapProductionIsolation.css', import.meta.url), 'utf8')

function runNode(args) {
  return spawnSync(process.execPath, args, { cwd: repoRoot, encoding: 'utf8' })
}

test('Founder proof is a checked-in stable module with a mandatory syntax gate', () => {
  assert.match(launcher, /spawnSync\(process\.execPath, \['--check', runnerPath\]/)
  assert.match(launcher, /--validate-only/)
  assert.doesNotMatch(launcher, /writeFile|replaceFunction|journeyPattern|\.capture-lifemap-founder-proof-fixed/)
  assert.doesNotMatch(runner, /journeyPattern|deterministic phase block not found|replaceFunction/)
  const syntax = runNode(['--check', runnerPath])
  assert.equal(syntax.status, 0, syntax.stderr || syntax.stdout)
  const validation = runNode(['scripts/run-lifemap-founder-proof-fixed.mjs', '--validate-only'])
  assert.equal(validation.status, 0, validation.stderr || validation.stdout)
  assert.match(validation.stdout, /FOUNDER_CAPTURE_SYNTAX_OK/)
})

test('Founder runner retains every required real interaction and phase owner', () => {
  for (const owner of [
    'openPage', 'selectQuietReset', 'selectAndCapturePhase', 'clickRouteAction', 'canvasSignal', 'desktopJourney',
    'keyboardJourney', 'mobileJourney', 'reducedMotionJourney', 'privacyAndRecoveryJourneys',
    'contextRecoveryJourney', 'assertVisualSanity',
  ]) {
    const matches = runner.match(new RegExp(`(?:async\\s+)?function\\s+${owner}\\s*\\(`, 'g')) || []
    assert.equal(matches.length, 1, `${owner} declaration count drifted`)
  }
  assert.match(runner, /Search and navigate Life Map/)
  assert.match(runner, /Search and filter Life Map/)
  assert.match(runner, /role="listitem"/)
  assert.match(runner, /const action = selectedAction\(page, name\)/)
  assert.match(runner, /await action\.waitFor\(\{ state: 'visible', timeout: 20_000 \}\)/)
  assert.match(runner, /await action\.click\(\{ timeout: 120_000 \}\)/)
  assert.match(runner, /await waitForPath\(page, destinationPath\)/)
  assert.match(runner, /page\.locator\(destinationSelector\)\.first\(\)\.waitFor/)
  for (const routeAction of [
    "clickRouteAction(page, 'Enter Focus', '/focus', '[data-testid=\"urai-focus-page\"]')",
    "clickRouteAction(page, 'Replay', '/replay', '[data-testid=\"urai-replay-page\"]')",
    "clickRouteAction(page, 'Overview', '/life-map', ROOT)",
  ]) assert.ok(runner.includes(routeAction), `missing route action: ${routeAction}`)
  assert.match(runner, /page\.keyboard\.press\('Enter'\)/)
  assert.match(runner, /result\.tap\(\{ timeout: 120_000 \}\)/)
  assert.match(runner, /result\.click\(\{ timeout: 120_000 \}\)/)
  const armedObserver = runner.indexOf("const capturePromise = observeRenderedPhase(page, expectedPhase, 45_000)")
  const semanticSelection = runner.indexOf('const selectionPromise = selectQuietReset(page, options.selection || {})')
  assert.ok(armedObserver >= 0 && semanticSelection > armedObserver, 'phase observation must be armed before semantic selection')
  assert.match(runner, /await Promise\.all\(\[capturePromise, selectionPromise\]\)/)
  assert.match(runner, /new MutationObserver\(\(\) => record\('mutation'\)\)/)
  assert.match(runner, /window\.requestAnimationFrame\(\(frameTime\) =>/)
  assert.match(runner, /renderedFramePhase: framePhase/)
  assert.match(runner, /transition\.renderedFramePhase !== expectedPhase/)
  assert.ok(runner.indexOf('await desktopJourney()') < runner.indexOf('await highResolutionOverview()'), 'time-critical phase proof must precede expensive 3x readback')
  for (const phase of ['departure', 'travel', 'approach', 'arrival']) {
    assert.match(runner, new RegExp(`selectAndCapturePhase\\(page, '${phase}'`))
  }
  assert.doesNotMatch(runner, /force:\s*true|dispatchEvent\(new MouseEvent/)

})

test('Founder runner validates the retained high-resolution PNG with the distributed acceptance method', () => {
  assert.match(runner, /deviceScaleFactor:\s*3/)
  assert.match(runner, /scale:\s*'device'/)
  assert.match(runner, /source:\s*'retained-png'/)
  assert.match(runner, /context\.getImageData\(x, y, block, block\)/)
  assert.doesNotMatch(runner, /gl\.readPixels/)
  assert.match(runner, /const columns = 24/)
  assert.match(runner, /const rows = 16/)
  assert.match(runner, /const block = 3/)
  assert.match(runner, /sampleCount !== 3456/)
  assert.match(runner, /variance < 8/)
  assert.match(runner, /nonDarkRatio <= 0/)
  assert.match(runner, /screenshot\.bytes < 120_000/)
  assert.match(runner, /distributed-grid-24x16-3x3/)
  assert.match(runner, /desktop-overview did not retain the required 3x high-resolution PNG evidence/)
})

test('Founder proof observes the real production state machine without a production backdoor', () => {
  assert.match(scene, /setPhase\("departure"\)/)
  assert.match(scene, /setPhase\("travel"\)/)
  assert.match(scene, /setPhase\("approach"\)/)
  assert.match(scene, /setPhase\("arrival"\)/)
  assert.match(scene, /data-life-map-phase=\{phase\}/)
  assert.match(navigator, /className="life-map-search-trigger"/)
  assert.match(navigator, /className="life-map-navigator" aria-label="Search and filter Life Map"/)
  assert.doesNotMatch(scene, /URAI_FOUNDER|founderProof|proofPhase|__uraiFounderPhase/)
  assert.doesNotMatch(navigator, /URAI_FOUNDER|founderProof|proofPhase|__uraiFounderPhase/)
  assert.match(runner, /expectedPhases/)
  assert.match(runner, /phase drifted/)
})

test('render proof is invalidated and republished after a real production WebGL context restoration journey', () => {
  assert.match(world, /function RenderProofRepublisher\(/)
  assert.match(world, /webglcontextlost/)
  assert.match(world, /webglcontextrestored/)
  assert.match(world, /lifeMapRenderReady = "false"/)
  assert.match(world, /frames\.current < 4/)
  assert.match(world, /lifeMapRenderReady = calls > 0 && objects > 20 && anchors >= 8 \? "true" : "false"/)
  assert.match(world, /<RenderProofRepublisher \/>/)
  assert.match(runner, /WEBGL_lose_context/)
  assert.match(runner, /extension\.loseContext\(\)/)
  assert.match(runner, /restoreContext\(\)/)
  assert.match(runner, /webgl-context-loss/)
  assert.match(runner, /webgl-recovered/)
  assert.match(runner, /context-recovery-state-preserved/)
  assert.match(runner, /did not prove WebGL restoration/)
  assert.match(runner, /did not preserve selected memory identity after recovery/)
})

test('collapsed semantic navigator preserves a visible pointer and touch opener', () => {
  assert.match(navigator, /className="life-map-search-trigger"/)
  assert.match(navigator, /aria-expanded=\{open\}/)
  assert.match(navigator, /width:48px;height:48px/)
  assert.match(navigator, /cursor:pointer/)
  assert.match(isolation, /\.life-map-search-trigger \{ pointer-events: auto !important; min-width: 48px !important; min-height: 48px !important; \}/)
  assert.match(isolation, /html\.urai-route-life-map:has\(\.life-map-navigator\) \[data-testid='urai-true-3d-life-map'\] \{ pointer-events: none !important; \}/)
  assert.match(isolation, /html\.urai-route-life-map:has\(\.life-map-navigator\) \[data-testid='urai-true-3d-life-map'\] canvas \{ pointer-events: none !important; \}/)
  assert.doesNotMatch(isolation, /life-map-navigator:not\(\[open\]\)|> summary/)
})

test('open semantic navigator directly owns world hit suppression independent of route CSS class', () => {
  assert.match(navigator, /const WORLD_OWNER = '\[data-testid="urai-true-3d-life-map"\]'/)
  assert.match(navigator, /document\.querySelector<HTMLElement>\(WORLD_OWNER\)/)
  assert.match(navigator, /owner\.style\.setProperty\('pointer-events', 'none', 'important'\)/)
  assert.match(navigator, /owner\.dataset\.semanticNavigationOpen = 'true'/)
  assert.match(navigator, /owner\.style\.removeProperty\('pointer-events'\)/)
  assert.match(navigator, /delete owner\.dataset\.semanticNavigationOpen/)
  assert.doesNotMatch(navigator, /force:\s*true|dispatchEvent\(new MouseEvent|\.click\(\)/)
})

test('portrait navigator clears selected inspector and stays above the threshold action rail', () => {
  const mobileBlock = isolation.match(/@media \(max-width:700px\) \{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(mobileBlock, /\.life-map-thresholds \{ width: calc\(100vw - 16px\) !important; bottom: max\(8px,env\(safe-area-inset-bottom\)\) !important;/)
  assert.match(mobileBlock, /\.life-map-search-trigger \{ right: 12px !important; bottom: max\(12px,env\(safe-area-inset-bottom\)\) !important; \}/)
  assert.match(mobileBlock, /\.life-map-navigator \{ right: 12px !important; bottom: max\(68px,calc\(env\(safe-area-inset-bottom\) \+ 58px\)\) !important; \}/)
})
