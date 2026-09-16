import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const visualWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const canonicalVisualWrapper = read('../scripts/run-canonical-live-visual-audit-current-home.mjs')
const mirrorReleaseProof = read('../tests/mirror-release-proof.mjs')
const mirrorReleaseRunner = read('../tests/mirror-release-proof-runner.mjs')
const mirrorMobile = read('src/app/mirror/mirror-mobile-inspection.css')
const mirrorWorld = read('src/app/mirror/MirrorSpatialClient.tsx')
const selectedMemory = read('src/spatial/memory/selectedMemoryContract.ts')
const worldTypes = read('src/spatial/world/worldTypes.ts')
const worldState = read('src/spatial/world/WorldStateProvider.tsx')
const worldTransition = read('src/spatial/world/WorldTransitionController.tsx')
const worldEvents = read('src/spatial/world/worldEvents.ts')

test('continuous visual proof preserves portal lifecycle and attributed navigation diagnostics', () => {
  assert.match(visualWrapper, /routeEvidence\?\.lifecycleObserved/)
  assert.match(visualWrapper, /request\.resourceType === 'document'/)
  assert.match(visualWrapper, /request\.isNavigationRequest === true/)
  assert.match(visualWrapper, /Home failed-request resource metadata was not materialized/)
  assert.match(visualWrapper, /Generated portal wrapper retained the retired discreet-controls contract/)
})

test('canonical visual proof materializes the current bare Mirror entry contract', () => {
  assert.match(canonicalVisualWrapper, /retired Mirror audit marker/)
  assert.match(canonicalVisualWrapper, /\[data-testid=\"mirror-bare-entry\"\]/)
  assert.match(canonicalVisualWrapper, /Choose what Mirror may open\./)
  assert.match(canonicalVisualWrapper, /Open disclosed demo/)
  assert.match(canonicalVisualWrapper, /Open Passport/)
})

test('Mirror browser proof validates accepted mobile suppression without reconciliation', () => {
  assert.match(mirrorReleaseProof, /if \(deviceName === 'desktop'\) await orb\.click\(\)/)
  assert.match(mirrorReleaseProof, /else await orb\.waitFor\(\{ state: 'hidden' \}\)/)
  assert.match(mirrorReleaseProof, /mobileOrbHiddenDuringInspection: deviceName === 'mobile'/)
  assert.match(mirrorReleaseProof, /timeout: 60000/)
  assert.match(mirrorReleaseProof, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/)
  assert.match(mirrorReleaseProof, /waitForURL\([^;]+waitUntil: 'domcontentloaded'/s)
  assert.match(mirrorReleaseProof, /page\.locator\('main'\)\.first\(\)\.waitFor/)
  assert.match(mirrorReleaseRunner, /failed without reconciliation/)
  assert.doesNotMatch(mirrorReleaseRunner, /reconciledCases|intentional mobile Orb suppression|Replay screenshot timeout/)
})

test('Mirror inspector removes competing help and mobile hit owners while pinning semantic thresholds', () => {
  assert.match(mirrorMobile, /body:has\(\.mirrorWorld \.mirrorInspection\) \.urai-movement-help/)
  assert.match(mirrorMobile, /body:has\(\.mirrorWorld \.mirrorInspection\) \.urai-world-companion/)
  assert.match(mirrorMobile, /display: none !important/)
  assert.match(mirrorMobile, /> div,/)
  assert.match(mirrorMobile, /canvas \{/)
  assert.match(mirrorMobile, /pointer-events: none !important/)
  assert.match(mirrorMobile, /\.mirrorThresholds \{/)
  assert.match(mirrorMobile, /z-index: 100 !important/)
  assert.match(mirrorMobile, /isolation: isolate/)
  assert.match(mirrorMobile, /\.mirrorThresholds button \{/)
  assert.match(mirrorMobile, /z-index: 101/)
  assert.match(mirrorMobile, /pointer-events: auto/)
})

test('Mirror selected evidence remains camera-safe inside grounded reflection geology', () => {
  assert.match(mirrorWorld, /selected\.position\[2\] \+ 5\.4/)
  assert.match(mirrorWorld, /new THREE\.TubeGeometry\(new THREE\.CatmullRomCurve3\(points\), 56, \.035, 8, false\)/)
  assert.match(mirrorWorld, /mirror-v230-rooted-branching-reflection-instrument/)
  assert.match(mirrorWorld, /position=\{\[0, \.78, -3\.05\]\}/)
  assert.match(mirrorWorld, /mirror-v230-continuous-worn-sanctuary-floor/)
  assert.match(mirrorWorld, /position=\{\[pattern\.position\[0\], \.22, pattern\.position\[2\]\]\}/)
  assert.doesNotMatch(mirrorWorld, /dodecahedronGeometry|ringGeometry/)
  assert.doesNotMatch(mirrorWorld, /Math\.sin\(t \* Math\.PI\) \* \(\.62/)
  assert.match(mirrorWorld, /`\/\$\{destination\}\/\?\$\{params\.toString\(\)\}`/)
  assert.doesNotMatch(mirrorWorld, /new THREE\.BoxGeometry\(\.12, \.76, \.48/)
  assert.doesNotMatch(mirrorWorld, /selected \? \[1\.32,1\.12,1\.22\]/)
})

test('world travel watchdog only settles after the requested route pathname commits', () => {
  assert.match(worldEvents, /const targetPathname = new URL\(fallbackHref, window\.location\.origin\)\.pathname/)
  assert.match(worldEvents, /if \(currentPathname !== targetPathname\) commitHardFallback\(fallbackHref\)/)
  assert.match(worldEvents, /if \(currentPathname !== targetPathname\) return/)
  assert.doesNotMatch(worldEvents, /if \(currentLocation === startingLocation\) commitHardFallback/)
})

test('selected-memory replay fragments are canonicalized by timestamp and cover the final segment', () => {
  assert.match(selectedMemory, /const chronologicalSegments = \[\.\.\.segments\]\.sort/)
  assert.match(selectedMemory, /left\.startsAtMs - right\.startsAtMs/)
  assert.match(selectedMemory, /const hasCanonicalChronology = CANONICAL_REPLAY_PHASES\.every/)
  assert.match(selectedMemory, /const hasNonOverlappingChronology = chronologicalSegments\.every/)
  assert.match(selectedMemory, /segment\.startsAtMs === 0/)
  assert.match(selectedMemory, /replaySegments\.length !== CANONICAL_REPLAY_PHASES\.length/)
  assert.match(selectedMemory, /segments\.length !== replaySegments\.length/)
  assert.match(selectedMemory, /const finalSegmentEndMs = finalSegment \? finalSegment\.startsAtMs \+ finalSegment\.durationMs : -1/)
  assert.match(selectedMemory, /requestedDurationMs >= finalSegmentEndMs/)
  assert.match(selectedMemory, /segments: chronologicalSegments/)
})

test('world travel preserves explicit demo identity through reverse navigation', () => {
  assert.match(worldTypes, /demo\?: boolean/)
  assert.match(worldTypes, /\| 'demo'/)
  assert.match(worldState, /const demo = params\.get\('demo'\) === '1'/)
  assert.match(worldState, /demo: true/)
  assert.match(worldTransition, /'demo',/)
  assert.match(worldTransition, /if \(context\?\.demo\) target\.searchParams\.set\('demo', '1'\)/)
  assert.match(worldTransition, /demo: currentWorld\.demo/)
})
