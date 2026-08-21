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
const routeBoundary = await readFile(new URL('../src/components/lifemap/LifeMapRouteBoundary.tsx', import.meta.url), 'utf8')
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
  for (const owner of ['openPage', 'selectQuietReset', 'clickRouteAction', 'canvasSignal', 'desktopJourney', 'desktopArrivalEvidence', 'desktopActionsAndKeyboard', 'isolatedJourneyPhases', 'mobileAndReduced', 'assertVisualSanity']) {
    const matches = runner.match(new RegExp(`(?:async\\s+)?function\\s+${owner}\\s*\\(`, 'g')) || []
    assert.equal(matches.length, 1, `${owner} declaration count drifted`)
  }
  assert.match(runner, /Search and navigate Life Map/)
  assert.match(runner, /Search and filter Life Map/)
  assert.match(runner, /data-life-map-semantic-result/)
  assert.match(runner, /data-life-map-node-id="quiet-reset"/)
  assert.match(runner, /selectedAction\(page, 'Overview'\)/)
  assert.match(runner, /selectedActionSelector\('Overview'\)/)
  assert.match(runner, /await activateCanonicalControl\(page, selector, geometry, 'pointer'\)/)
  assert.match(runner, /await activateCanonicalControl\(page, overviewSelector, overviewGeometry, 'pointer'\)/)
  assert.doesNotMatch(runner, /await action\.click\(\)/)
  assert.doesNotMatch(runner, /await overviewAction\.click\(\)/)
  assert.match(runner, /page\.keyboard\.press\('Enter'\)/)
  assert.match(runner, /page\.mouse\.click\(x, y\)/)
  assert.match(runner, /page\.touchscreen\.tap\(x, y\)/)
  for (const phase of ['departure', 'travel', 'approach', 'arrival']) assert.match(runner, new RegExp(`'${phase}'`))
})

test('Founder runner observes transient production phases without mutating production timing', () => {
  assert.match(runner, /function armJourneyPhaseWatch\(/)
  assert.match(runner, /function readJourneyPhaseWatch\(/)
  assert.match(runner, /new MutationObserver\(inspect\)/)
  assert.match(runner, /attributeFilter:\s*\['data-life-map-phase', 'data-life-map-mode', 'data-life-map-scale'\]/)
  assert.match(runner, /if \(options\.targetPhase\) await armJourneyPhaseWatch\(page, options\.targetPhase\)/)
  assert.match(runner, /const observedPhase = options\.targetPhase \? await readJourneyPhaseWatch\(page, options\.targetPhase\) : null/)
  assert.doesNotMatch(runner, /window\.setTimeout\s*=/)
  assert.doesNotMatch(runner, /__uraiFounderOriginalSetTimeout|captureTimingFactor|installPhaseCaptureTiming|restorePhaseCaptureTiming/)
})

test('Founder transient probes do not compete with a retained production WebGL context', () => {
  const desktopJourney = runner.match(/async function desktopJourney\(\) \{[\s\S]*?\n\}\n\nasync function desktopArrivalEvidence/)?.[0] || ''
  const desktopArrival = runner.match(/async function desktopArrivalEvidence\(\) \{[\s\S]*?\n\}\n\nasync function desktopActionsAndKeyboard/)?.[0] || ''
  const desktopActions = runner.match(/async function desktopActionsAndKeyboard\(\) \{[\s\S]*?\n\}\n\nasync function mobileAndReduced/)?.[0] || ''
  const mobileAndReduced = runner.match(/async function mobileAndReduced\(\) \{[\s\S]*?\n\}\n\nasync function privacyAndRecovery/)?.[0] || ''
  assert.doesNotMatch(desktopJourney, /captureIsolatedJourneyPhase\(/)
  assert.doesNotMatch(mobileAndReduced, /captureIsolatedJourneyPhase\(/)
  assert.doesNotMatch(desktopJourney, /clickRouteAction\(/)
  assert.doesNotMatch(desktopJourney, /selectedActions\(page\)/)
  assert.match(desktopArrival, /const arrivalBrowser = await chromium\.launch\(\{ headless: true \}\)/)
  assert.match(desktopArrival, /await selectedActions\(page\)\.waitFor[\s\S]*await shot\(page, 'stable-arrival'/)
  assert.match(desktopArrival, /await arrivalPage\?\.context\.close\(\)\s+await arrivalBrowser\.close\(\)/)
  assert.match(desktopActions, /const actionBrowser = await chromium\.launch\(\{ headless: true \}\)/)
  assert.match(desktopActions, /await clickRouteAction\(page, 'Enter Focus'/)
  assert.match(desktopActions, /await actionPage\?\.context\.close\(\)\s+await actionBrowser\.close\(\)/)
  assert.match(runner, /await desktopJourney\(\)\s+await desktopArrivalEvidence\(\)\s+await desktopActionsAndKeyboard\(\)\s+await isolatedJourneyPhases\(\)\s+await mobileAndReduced\(\)/)
  assert.match(runner, /await isolated\?\.context\.close\(\)\s+await isolatedBrowser\.close\(\)/)
})

test('Founder runner retains one explicit 3x high-resolution proof while the interaction matrix stays runner-feasible', () => {
  assert.match(runner, /deviceScaleFactor:\s*options\.deviceScaleFactor \|\| 1/)
  assert.match(runner, /function highResolutionOverview\(/)
  assert.match(runner, /deviceScaleFactor:\s*3/)
  assert.match(runner, /desktop-overview-high-resolution/)
  assert.match(runner, /highResolution\.signal\.width < 4320/)
  assert.match(runner, /highResolution\.signal\.height < 2700/)
  assert.match(runner, /highResolution\.screenshot\.bytes < 1_000_000/)
})

test('Founder runner validates retained PNG evidence with the distributed acceptance method', () => {
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
  assert.doesNotMatch(runner, /setPhase\(|PHASE_DURATION_MS\s*=|window\.setTimeout\s*=/)
})

test('restored Life Map route preserves URL identity but commits arrival only after that id resolves to a real node', () => {
  assert.match(scene, /const \[selectedId, setSelectedId\] = useState<string \| null>\(overviewRequested \? null : queryNode \|\| null\)/)
  assert.match(scene, /const \[phase, setPhase\] = useState<JourneyPhase>\("overview"\)/)
  assert.match(scene, /const restoredRoutePending = useRef\(Boolean\(!overviewRequested && queryNode\)\)/)
  assert.match(scene, /const node = nodes\.find\(\(candidate\) => candidate\.id === queryNode\)/)
  assert.match(scene, /setSelectedId\(node\.id\);\s*setPhase\("arrival"\)/)
  assert.doesNotMatch(scene, /useState<JourneyPhase>\(selectedId \? "arrival" : "overview"\)/)
})

test('route boundary repairs a direct-entry state exactly once and requires a healthy authored world before overview recovery', () => {
  assert.match(routeBoundary, /const initial = new URLSearchParams\(window\.location\.search\)/)
  assert.match(routeBoundary, /if \(initial\.get\('overview'\) === '1'\) return/)
  assert.match(routeBoundary, /const nodeId = initial\.get\('node'\) \|\| initial\.get\('memoryId'\)/)
  assert.match(routeBoundary, /let repaired = false/)
  assert.match(routeBoundary, /if \(phase === 'arrival'\)/)
  assert.match(routeBoundary, /root\.querySelector\('\.life-map-thresholds'\)/)
  assert.match(routeBoundary, /if \(phase === 'overview'\)/)
  assert.match(routeBoundary, /root\.dataset\.lifeMapRenderReady === 'true'/)
  assert.match(routeBoundary, /visibleAnchors >= MIN_DIRECT_ROUTE_RENDER_ANCHORS/)
  assert.match(routeBoundary, /repaired = true/)
  assert.match(routeBoundary, /window\.dispatchEvent\(new CustomEvent<LifeMapSelectionDetail>\(LIFE_MAP_SELECTION_EVENT/)
  assert.equal((routeBoundary.match(/dispatchEvent\(new CustomEvent/g) || []).length, 1)
  assert.doesNotMatch(routeBoundary, /requestLifeMapSelection|restoreSelectedRoute|maxAttempts|attempts\s*[+<=>]/)
  assert.match(routeBoundary, /<ComposedLifeMapScene \/>/)
  assert.match(routeBoundary, /<LifeMapSemanticNavigator \/>/)
})

test('Founder render proof samples one atomic live-root snapshot', () => {
  const renderedWorld = runner.match(
    /async function waitForRenderedWorld\(page, timeout = 30_000\) \{[\s\S]*?\n\}\n\nasync function waitForOverviewState/,
  )?.[0] || ''

  assert.match(renderedWorld, /page\.evaluate\(\(rootSelector\) => \{/)
  assert.match(renderedWorld, /const element = document\.querySelector\(rootSelector\)/)
  assert.match(renderedWorld, /element\.dataset\.lifeMapRenderReady/)
  assert.match(renderedWorld, /element\.dataset\.lifeMapVisibleAnchors/)
  assert.match(renderedWorld, /element\.dataset\.lifeMapVisibleObjects/)
  assert.match(renderedWorld, /element\.dataset\.lifeMapRenderCalls/)
  assert.doesNotMatch(renderedWorld, /root\.getAttribute/)
  assert.match(
    renderedWorld,
    /state\.ready === 'true'[\s\S]*state\.anchors >= 8[\s\S]*state\.objects > 20[\s\S]*state\.calls > 0/,
  )
  assert.match(renderedWorld, /timeout, 75\)/)
})

test('render proof refuses stale invalidation writes and republishes after WebGL context restoration', () => {
  assert.match(world, /function RenderProofRepublisher\(/)
  assert.match(world, /webglcontextlost/)
  assert.match(world, /webglcontextrestored/)
  assert.match(world, /lifeMapRenderReady = "false"/)
  assert.match(world, /const writeInvalid = \(\) => \{\s+if \(!invalidated\.current\) return;/)
  assert.match(world, /frames\.current < 4/)
  assert.match(world, /(?:lifeMapRenderReady =|const ready =) calls > 0 && objects > 20 && anchors >= 8(?: \? "true" : "false")?/)
  assert.match(world, /<RenderProofRepublisher \/>/)
})

test('collapsed semantic navigator preserves a visible pointer and touch opener', () => {
  assert.match(navigator, /className="life-map-search-trigger"/)
  assert.match(navigator, /aria-expanded=\{open\}/)
  assert.match(navigator, /width:48px;height:48px/)
  assert.match(navigator, /cursor:pointer/)
  assert.match(isolation, /\.life-map-search-trigger \{ pointer-events: auto !important; min-width: 48px !important; min-height: 48px !important; \}/)
  assert.doesNotMatch(isolation, /life-map-navigator:not\(\[open\]\)|> summary/)
})

test('portrait navigator clears selected inspector and stays above the threshold action rail', () => {
  const mobileBlock = isolation.match(/@media \(max-width:700px\) \{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(mobileBlock, /\.life-map-thresholds \{ width: calc\(100vw - 16px\) !important; bottom: max\(8px,env\(safe-area-inset-bottom\)\) !important;/)
  assert.match(mobileBlock, /\.life-map-search-trigger \{ right: 12px !important; bottom: max\(12px,env\(safe-area-inset-bottom\)\) !important; \}/)
  assert.match(mobileBlock, /\.life-map-navigator \{ right: 12px !important; bottom: max\(68px,calc\(env\(safe-area-inset-bottom\) \+ 58px\)\) !important; \}/)
})
