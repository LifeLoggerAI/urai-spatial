import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))
const launcherPath = fileURLToPath(new URL('../../scripts/run-lifemap-founder-proof-fixed.mjs', import.meta.url))
const runnerPath = fileURLToPath(new URL('../../scripts/capture-lifemap-founder-proof-fixed.mjs', import.meta.url))
const launcher = await readFile(launcherPath, 'utf8')
const runner = (await readFile(runnerPath, 'utf8')).replace(/\r\n/g, '\n')
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
  assert.match(runner, /highResolution\.screenshot\.bytes < 250_000/)
  assert.match(runner, /highResolution\.signal\.source !== 'retained-png'/)
  assert.match(runner, /highResolution\.signal\.sampleCount !== 3456/)
  assert.match(runner, /highResolution\.signal\.sampling !== 'distributed-grid-24x16-3x3'/)
  assert.match(runner, /highResolution\.signal\.variance >= 0 && highResolution\.signal\.variance < 8/)
  assert.match(runner, /highResolution\.signal\.nonDarkRatio >= 0 && highResolution\.signal\.nonDarkRatio <= 0/)
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
  assert.match(runner, /const viewportPixels = Number\(capture\.viewport\?\.width \|\| 0\) \* Number\(capture\.viewport\?\.height \|\| 0\)/)
  assert.match(runner, /Math\.min\(120_000, Math\.max\(90_000, Math\.round\(viewportPixels \* 0\.30\)\)\)/)
  assert.match(runner, /capture\.screenshot\.bytes < minimumScreenshotBytes/)
  assert.match(runner, /distributed-grid-24x16-3x3/)
})

test('Founder proof observes the real production state machine without a production backdoor', () => {
  assert.match(scene, /setPhase\("departure"\)/)
  assert.match(scene, /setPhase\("travel"\)/)
  assert.match(scene, /setPhase\("approach"\)/)
  assert.match(scene, /setPhase\("arrival"\)/)
  assert.match(scene, /data-life-map-phase=\{phase\}/)
  assert.match(navigator, /className="life-map-search-trigger"/)
  assert.match(navigator, /className="life-map-navigator" aria-labelledby="life-map-navigator-label"/)
  assert.match(navigator, /id="life-map-navigator-label"[^>]*locale.props\('lifeMap.searchRegion'\)[^>]*>\{locale.text\('lifeMap.searchRegion'\)\}/)
  assert.match(runner, /region.contains\(label\) && label.textContent === 'Search and filter Life Map'/)
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
  assert.match(routeBoundary, /<ComposedLifeMapScene\b[^>]*\/>/)
  assert.match(routeBoundary, /<LifeMapSemanticNavigator\b[^>]*\/>/)
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
  const trigger = isolation.match(/\.life-map-search-trigger \{([^}]+)\}/)?.[1] || ''
  for (const declaration of ['position: fixed !important', 'left: auto !important', 'pointer-events: auto !important', 'min-width: 48px !important', 'min-height: 48px !important', 'box-sizing: border-box !important']) {
    assert.ok(trigger.includes(declaration), `Search opener must retain ${declaration}`)
  }
  assert.doesNotMatch(isolation, /life-map-navigator:not\(\[open\]\)|> summary/)
})

test('portrait navigator clears selected inspector and stays above the threshold action rail', () => {
  const mobileBlock = isolation.match(/@media \(max-width:700px\) \{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(mobileBlock, /\.life-map-thresholds \{ width: calc\(100vw - 16px\) !important; bottom: max\(8px,env\(safe-area-inset-bottom\)\) !important;/)
  assert.match(mobileBlock, /\.life-map-search-trigger \{ left: auto !important; right: 12px !important; top: max\(12px,env\(safe-area-inset-top\)\) !important; bottom: auto !important; transform: none !important; margin: 0 !important; \}/)
  assert.match(mobileBlock, /\.life-map-navigator \{ right: 12px !important; top: max\(68px,calc\(env\(safe-area-inset-top\) \+ 58px\)\) !important; bottom: auto !important; max-height: min\(64vh,calc\(100svh - 84px\)\) !important; \}/)
})


test('semantic navigator portals its hit surface above the canonical WebGL stacking context', () => {
  assert.match(navigator, /import \{ createPortal \} from 'react-dom'/)
  assert.match(navigator, /const \[portalReady, setPortalReady\] = useState\(false\)/)
  assert.match(navigator, /useEffect\(\(\) => \{ setPortalReady\(true\) \}, \[\]\)/)
  assert.match(navigator, /if \(!portalReady\) return null/)
  assert.match(navigator, /return createPortal\(<>/)
  assert.match(navigator, /<\/>[,] document\.body\)/)
})


test('founder proof follows the current rendered signed-out privacy boundary and no-WebGL fallback', () => {
  assert.match(runner, /data-testid="urai-r3f-canonical-lifemap"\]\[data-life-map-access="signed-out"/)
  assert.match(runner, /data-testid="urai-life-map-signed-out-disclosure"/)
  assert.match(runner, /privateSourceMounted: Boolean\(document\.querySelector\('\[data-life-map-source="private"\], \[data-private-memory-mounted="true"\]'\)\)/)
  assert.match(runner, /if \(signedOutBoundary\.privateSourceMounted\) throw new Error\('signed-out Life Map mounted a private memory source'\)/)
  assert.match(runner, /if \(!\/no personal data displayed\/i\.test\(signedOutBoundary\.disclosure\)\)/)
  assert.match(runner, /data-testid="urai-life-map-authored-fallback"/)
})

function replayReadinessHarness(snapshots, url = 'http://127.0.0.1:4173/replay/?demo=1&memoryId=quiet-reset&manifestId=replay-recovery-thread') {
  const pollSource = runner.match(/async function poll\([\s\S]*?\n\}\n/)?.[0]
  const readinessSource = runner.match(/async function waitForReplayRenderedWorld\([\s\S]*?\n\}\n/)?.[0]
  assert.ok(pollSource && readinessSource, 'Replay destination proof must wait for actual media and a rendered first frame')
  class TestElement {}
  class TestCanvas {}
  let samples = 0
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[data-testid="cinematic-replay-client"]', 'Do not certify from the hidden proof-only Replay surface')
      const state = snapshots[Math.min(samples++, snapshots.length - 1)]
      if (!state) return null
      const canvas = Object.assign(new TestCanvas(), { dataset: { replayFirstFrame: state.firstFrame ? 'true' : 'false' } })
      return Object.assign(new TestElement(), {
        dataset: { memoryId: state.memoryId, manifestId: state.manifestId, replayMediaStatus: state.mediaStatus, replayMediaReady: state.mediaReady, webglState: state.webgl, replayEnvironmentFallback: state.admission },
        querySelector: (canvasSelector) => { assert.equal(canvasSelector, 'canvas'); return canvas },
      })
    },
  }
  const waitForReplay = runInNewContext(`${pollSource}\n${readinessSource}\nwaitForReplayRenderedWorld`, { URL, Date, setTimeout, document, HTMLElement: TestElement, HTMLCanvasElement: TestCanvas })
  return { run: (timeout = 1000) => waitForReplay({ url: () => url, evaluate: async (read) => read() }, timeout), samples: () => samples }
}

const renderedReplay = { memoryId: 'demo:quiet-reset', manifestId: 'replay-recovery-thread', mediaStatus: 'ready', mediaReady: 'true', webgl: 'ready', admission: 'disclosed-demo', firstFrame: true }

test('Replay rendered proof binds the actual disclosed demo namespace without admitting a private route', async () => {
  const state = await replayReadinessHarness([renderedReplay], 'http://127.0.0.1:4173/replay/?demo=1&memoryId=demo%3Aquiet-reset&manifestId=replay-recovery-thread').run()
  assert.equal(state.memoryId, 'demo:quiet-reset')
  await assert.rejects(replayReadinessHarness([renderedReplay], 'http://127.0.0.1:4173/replay/?memoryId=quiet-reset&manifestId=replay-recovery-thread').run(), /requires the selected memory and manifest route identity/)
})

test('Replay capture waits through the real loading state before retaining the selected media first frame', async () => {
  const proof = replayReadinessHarness([{ ...renderedReplay, mediaStatus: 'loading', mediaReady: 'false', firstFrame: false }, renderedReplay])
  const state = await proof.run()
  assert.equal(proof.samples(), 2)
  assert.equal(state.firstFrame, true)
  assert.equal(state.mediaStatus, 'ready')
  assert.match(runner, /const replayRenderProof = await waitForReplayRenderedWorld\(page\)\s+await shot\(page, 'replay-destination', 'replay', \{ memoryId: 'quiet-reset', replayRenderProof \}\)/)
})

test('Replay capture rejects a visible shell, loading or errored media and an unrendered canvas', async (t) => {
  for (const [name, state] of [
    ['shell only', null],
    ['media loading', { ...renderedReplay, mediaStatus: 'loading' }],
    ['media error', { ...renderedReplay, mediaStatus: 'error' }],
    ['readiness false', { ...renderedReplay, mediaReady: 'false' }],
    ['no first frame', { ...renderedReplay, firstFrame: false }],
    ['lost context', { ...renderedReplay, webgl: 'lost' }],
  ]) await t.test(name, async () => {
    await assert.rejects(replayReadinessHarness([state]).run(10), /selected Replay media and first rendered frame timed out/)
  })
})

test('Replay capture rejects a stale memory, wrong manifest, private source or a route without exact selected identity', async (t) => {
  for (const [name, state] of [
    ['stale memory', { ...renderedReplay, memoryId: 'different-memory' }],
    ['wrong manifest', { ...renderedReplay, manifestId: 'different-manifest' }],
    ['private recorded source', { ...renderedReplay, admission: 'recorded-source' }],
  ]) await t.test(name, async () => {
    await assert.rejects(replayReadinessHarness([state]).run(10), /selected Replay media and first rendered frame timed out/)
  })
  await assert.rejects(replayReadinessHarness([renderedReplay], 'http://127.0.0.1:4173/replay/').run(), /requires the selected memory and manifest route identity/)
})

function stylesheetHarness(states, failLoad = false) {
  const pollSource = runner.match(/async function poll\([\s\S]*?\n\}\n/)?.[0]
  const source = runner.match(/async function waitForDocumentStylesheets\([\s\S]*?\n\}\n/)?.[0]
  assert.ok(source && pollSource)
  let samples = 0, loadObserved = false
  const document = {
    get readyState() { return states[Math.min(samples, states.length - 1)].readyState },
    querySelectorAll(selector) {
      assert.ok(loadObserved, 'Document load must be awaited before reading CSS')
      assert.equal(selector, 'link[rel="stylesheet"]')
      const state = states[Math.min(samples++, states.length - 1)]
      return state.loaded.map((loaded, i) => ({ href: '/style-' + i + '.css', sheet: loaded ? {} : null }))
    },
  }
  const fn = runInNewContext(pollSource + '\n' + source + '\nwaitForDocumentStylesheets', { Date, setTimeout, document })
  return { samples: () => samples, run: (timeout = 1000) => fn({
    waitForLoadState: async (state, options) => {
      assert.equal(state, 'load'); assert.equal(options.timeout, timeout)
      if (failLoad) throw new Error('Document load failed')
      loadObserved = true
    },
    evaluate: async read => read(),
  }, timeout) }
}
test('Founder navigation waits for actual loaded document CSS without hiding failed requests', async () => {
  const h = stylesheetHarness([{ readyState: 'complete', loaded: [false] }, { readyState: 'complete', loaded: [true] }])
  const state = await h.run()
  assert.equal(h.samples(), 2)
  assert.equal(state.stylesheets[0].loaded, true)
  assert.match(runner, /if \(page\.url\(\) !== 'about:blank'\) await waitForDocumentStylesheets\(page\)/)
  assert.match(runner, /await waitForPath\(page, destinationPath\)\s+await waitForDocumentStylesheets\(page\)/)
  assert.match(runner, /event\.kind === 'requestfailed'/)
  assert.doesNotMatch(runner, /ERR_ABORTED.*\.css|\.css.*ERR_ABORTED/)
})
test('Founder CSS readiness rejects absent stylesheets, unloaded CSS and load failure', async () => {
  for (const state of [{readyState:'loading', loaded:[true]}, {readyState:'complete', loaded:[]}, {readyState:'complete', loaded:[false]}]) {
    await assert.rejects(stylesheetHarness([state]).run(10), /complete document stylesheets timed out/)
  }
  await assert.rejects(stylesheetHarness([{readyState:'complete',loaded:[true]}], true).run(), /Document load failed/)
})

function runnerFunction(name) {
  const source = runner.match(new RegExp(`(?:async )?function ${name}\\([\\s\\S]*?\\n\\}\\n`))?.[0]
  assert.ok(source, `Missing proof function ${name}`)
  return source
}

const checkNarrowGeometry = runInNewContext(`${runnerFunction('assertNarrowControlGeometry')}\nassertNarrowControlGeometry`)
const checkNarrowIdentity = runInNewContext(`${runnerFunction('assertNarrowRouteIdentity')}\nassertNarrowRouteIdentity`, { URL })
const narrowViewport = { width: 320, height: 700 }
const reachableControl = { selector: 'button.primary', x: 16, y: 620, width: 90, height: 48, disabled: false, visible: true, centerOwned: true }
const selectedLifeMap = { source: 'explicit-demo', phase: 'arrival', mode: 'selected', scale: 'intimate', title: 'The Quiet Reset' }
const selectedMemory = { memoryId: 'demo:quiet-reset', manifestId: 'replay-recovery-thread', starId: 'quiet-reset', memoryStatus: 'demo' }
const selectedRoute = (path, memoryId = 'quiet-reset') => `http://127.0.0.1:4173${path}/?demo=1&memoryId=${encodeURIComponent(memoryId)}&manifestId=replay-recovery-thread&node=quiet-reset`

test('narrow proof admits reachable separated controls and rejects clipping, overlap and interception', () => {
  const separated = [reachableControl, { ...reachableControl, selector: 'button.unwind', x: 114 }]
  assert.equal(checkNarrowGeometry(separated, narrowViewport).length, 2)
  for (const invalid of [
    { x: -1 }, { y: -1 }, { x: 240 }, { y: 680 }, { width: 47 }, { height: 47 },
    { x: Number.NaN }, { disabled: true }, { visible: false }, { centerOwned: false },
  ]) assert.throws(() => checkNarrowGeometry([{ ...reachableControl, ...invalid }], narrowViewport), /clipped, undersized, disabled or intercepted/)
  assert.throws(() => checkNarrowGeometry([reachableControl, { ...reachableControl, selector: 'button.other', x: 90 }], narrowViewport), /controls overlap/)
  assert.throws(() => checkNarrowGeometry([], narrowViewport), /actual controls/)
  assert.throws(() => checkNarrowGeometry(separated, { width: 390, height: 844 }), /320x700/)
})

test('narrow journey binds route tokens to actual disclosed selected memory through both unwind destinations', () => {
  for (const [path, rendered] of [['/life-map', selectedLifeMap], ['/focus', selectedMemory], ['/replay', selectedMemory]]) {
    for (const memoryId of ['quiet-reset', 'demo:quiet-reset']) assert.equal(checkNarrowIdentity(selectedRoute(path, memoryId), path, rendered).node, 'quiet-reset')
    for (const stale of [
      selectedRoute(path).replace('demo=1', 'demo=0'),
      selectedRoute(path).replace('memoryId=quiet-reset', 'memoryId=other'),
      selectedRoute(path).replace('replay-recovery-thread', 'other-manifest'),
      selectedRoute(path).replace('node=quiet-reset', 'node=other'),
      selectedRoute(path).replace(`${path}/?`, '/wrong/?'),
    ]) assert.throws(() => checkNarrowIdentity(stale, path, rendered), /route identity drifted/)
  }
  for (const invalid of [{ source: 'private' }, { phase: 'overview' }, { mode: 'overview' }, { scale: 'cosmic' }, { title: 'Another memory' }]) {
    assert.throws(() => checkNarrowIdentity(selectedRoute('/life-map'), '/life-map', { ...selectedLifeMap, ...invalid }), /Life Map identity drifted/)
  }
  for (const invalid of [{ memoryId: 'demo:other' }, { manifestId: 'other-manifest' }, { starId: 'other' }, { memoryStatus: 'private' }]) {
    assert.throws(() => checkNarrowIdentity(selectedRoute('/focus'), '/focus', { ...selectedMemory, ...invalid }), /resolved memory identity drifted/)
  }
  assert.throws(() => checkNarrowIdentity(selectedRoute('/focus'), '/focus', null), /resolved memory identity drifted/)
})

function focusReadinessHarness(snapshots) {
  class TestElement {}
  class TestCanvas {}
  let samples = 0
  const document = {
    querySelector(selector) {
      assert.equal(selector, '[data-testid="urai-final-focus-chamber"]')
      const state = snapshots[Math.min(samples++, snapshots.length - 1)]
      if (!state) return null
      const canvas = Object.assign(new TestCanvas(), { dataset: { focusFirstFrame: state.firstFrame ? 'true' : 'false' } })
      return Object.assign(new TestElement(), {
        dataset: { memoryId: state.memoryId, manifestId: state.manifestId, starId: state.starId, memoryStatus: state.memoryStatus,
          focusInputReady: state.inputReady, focusRenderReady: state.renderReady, focusMemoryRevealState: state.reveal, webglState: state.webgl },
        querySelector: canvasSelector => { assert.equal(canvasSelector, '.focusCanvas canvas'); return canvas },
      })
    },
  }
  const fn = runInNewContext(`${runnerFunction('poll')}\n${runnerFunction('waitForFocusRenderedWorld')}\nwaitForFocusRenderedWorld`, { Date, setTimeout, document, HTMLElement: TestElement, HTMLCanvasElement: TestCanvas })
  return { samples: () => samples, run: (timeout = 1000) => fn({ evaluate: async read => read() }, timeout) }
}
const renderedFocus = { ...selectedMemory, inputReady: 'true', renderReady: 'true', reveal: 'ready', webgl: 'ready', firstFrame: true }

test('narrow Focus proof waits for the disclosed selected manifestation and real canvas frame', async () => {
  const h = focusReadinessHarness([{ ...renderedFocus, renderReady: 'false', firstFrame: false }, renderedFocus])
  const state = await h.run()
  assert.equal(h.samples(), 2)
  assert.equal(state.firstFrame, true)
  for (const invalid of [null, ...[
    { memoryId: 'demo:other' }, { manifestId: 'other' }, { starId: 'other' }, { memoryStatus: 'private' },
    { inputReady: 'false' }, { renderReady: 'false' }, { reveal: 'unavailable' }, { webgl: 'lost' }, { firstFrame: false },
  ].map(patch => ({ ...renderedFocus, ...patch }))]) {
    await assert.rejects(focusReadinessHarness([invalid]).run(10), /selected Focus memory and first rendered frame timed out/)
  }
})

test('320px touch and reduced-motion keyboard proof appends complete actual journeys to the original matrix', () => {
  const narrow = runnerFunction('narrowMobileJourney')
  assert.match(narrow, /prefix: 'narrow-touch', interaction: 'touch', motion: 'no-preference'/)
  assert.match(narrow, /prefix: 'narrow-keyboard-reduced', interaction: 'keyboard', motion: 'reduce'/)
  assert.match(narrow, /viewport: \{ width: 320, height: 700 \}/)
  assert.match(narrow, /await narrowFocusRestoration\(page, profile\.interaction\)/)
  assert.match(narrow, /await selectQuietReset\(page, \{ touch: profile\.interaction === 'touch', keyboard: profile\.interaction === 'keyboard', narrow: true \}\)/)
  for (const state of ['arrival', 'focus', 'replay', 'focus-return', 'lifemap-return']) assert.ok(narrow.includes(`await retain('${state}'`), `Missing retained narrow ${state}`)
  for (const selector of ["selectedActionSelector('Enter Focus')", "'.focusControls button.primary'", "'.replayWorld button.unwind'", "'.focusControls button.unwind'"]) {
    assert.ok(narrow.includes(`await narrowActivate(page, ${selector}, profile.interaction)`), `Missing actual narrow action ${selector}`)
  }
  const restoration = runnerFunction('narrowFocusRestoration')
  assert.match(restoration, /page\.keyboard\.press\('Escape'\)/)
  assert.match(restoration, /Close Life Map search/)
  assert.match(restoration, /Close Adam/)
  assert.match(restoration, /searchRestored/)
  assert.match(restoration, /founderRestored/)
  assert.match(runner, /try \{\s+await narrowMobileJourney\(\)\s+await highResolutionOverview\(\)/)
  assert.match(runner, /await privacyAndRecovery\(\)\s+assertVisualSanity\(\)/)
  assert.match(runner, /receipt\.captures\.length >= 38/)
  assert.doesNotMatch(narrow, /force:\s*true|dispatchEvent|setAttribute|\.goto\(/)
})

test('narrow keyboard proof follows bounded natural Tab order and rejects an unreachable control', async () => {
  class TestElement { constructor(id) { this.id = id; this.tagName = 'BUTTON'; this.className = '' } }
  const controls = ['first', 'middle', 'target'].map(id => new TestElement(id))
  let focused = 0, tabs = 0
  const document = { querySelector: () => controls[2], get activeElement() { return controls[focused] } }
  const traverse = runInNewContext(`${runnerFunction('narrowTabTo')}\nnarrowTabTo`, { document, HTMLElement: TestElement })
  const page = { evaluate: async (read, selector) => read(selector), keyboard: { press: async key => { assert.equal(key, 'Tab'); focused = Math.min(focused + 1, 2); tabs += 1 } } }
  const reached = await traverse(page, '#target', 4)
  assert.equal(reached.tabs, 2)
  assert.equal(tabs, 2)
  focused = 0; tabs = 0
  page.keyboard.press = async key => { assert.equal(key, 'Tab'); tabs += 1 }
  await assert.rejects(traverse(page, '#target', 3), /Tab traversal could not reach/)
  assert.equal(tabs, 3)
  assert.doesNotMatch(runnerFunction('narrowTabTo'), /\.focus\(|setAttribute|dispatchEvent/)
  assert.match(runnerFunction('narrowActivate'), /await narrowTabTo\(page, selector\)\s+await page\.keyboard\.press\('Enter'\)/)
  assert.match(runnerFunction('selectQuietReset'), /if \(options\.narrow\) await narrowActivate\(page, resultSelector/)
  assert.match(runnerFunction('selectQuietReset'), /if \(options\.narrow\) await narrowActivate\(page, triggerSelector/)
})

test('narrow reduced-motion proof observes media preference and unmasked stable arrival camera samples', () => {
  const checkMotion = runInNewContext(`${runnerFunction('assertNarrowMotion')}\nassertNarrowMotion`)
  const camera = [0, 3, 7.5, 0, 1, 0, 50]
  const samples = [0, 125, 250].map(elapsedMs => ({ elapsedMs, phase: 'arrival', camera: [...camera] }))
  const reduced = { mediaQueryMatches: true, arrivalSamples: samples }
  assert.equal(checkMotion(reduced, 'reduce', true).arrivalSamples.length, 3)
  assert.equal(checkMotion({ mediaQueryMatches: false }, 'no-preference', true).mediaQueryMatches, false)
  assert.throws(() => checkMotion({ mediaQueryMatches: false, arrivalSamples: samples }, 'reduce', true), /preference was not observed/)
  assert.throws(() => checkMotion({ mediaQueryMatches: true }, 'reduce', true), /bounded camera stability observation/)
  assert.throws(() => checkMotion({ ...reduced, arrivalSamples: samples.slice(0, 2) }, 'reduce', true), /bounded camera stability observation/)
  for (const invalid of [{ phase: 'travel' }, { camera: [0, 3, 7.6, 0, 1, 0, 50] }, { camera: [0, 3, Number.NaN, 0, 1, 0, 50] }, { camera: [] }]) {
    assert.throws(() => checkMotion({ ...reduced, arrivalSamples: [samples[0], samples[1], { ...samples[2], ...invalid }] }, 'reduce', true), /camera or phase moved/)
  }
  assert.match(runnerFunction('narrowMotionEvidence'), /matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/)
  assert.match(runnerFunction('captureScreenshot'), /animations = 'disabled'/)
  assert.match(runnerFunction('narrowMobileJourney'), /focusRestoration, renderProof \}, 'allow'\)/)
  assert.match(runnerFunction('assertVisualSanity'), /capture\.screenshot\.animations !== 'allow'/)
})
