import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = (path) => fs.readFileSync(path, 'utf8')
const visualWrapper = read('../scripts/run-continuous-spatial-proof-v19-portal-stable.mjs')
const canonicalVisualWrapper = read('../scripts/run-canonical-live-visual-audit-current-home.mjs')
const mirrorReleaseProof = read('../tests/mirror-release-proof.mjs')
const mirrorReleaseRunner = read('../tests/mirror-release-proof-runner.mjs')
const mirrorRealm = read('src/app/mirror/MirrorRealm.tsx')
const mirrorMobile = read('src/app/mirror/mirror-mobile-inspection.css')
const selectedMemory = read('src/spatial/memory/selectedMemoryContract.ts')
const worldTypes = read('src/spatial/world/worldTypes.ts')
const worldState = read('src/spatial/world/WorldStateProvider.tsx')
const worldTransition = read('src/spatial/world/WorldTransitionController.tsx')

test('continuous visual proof measures effective ancestor opacity', () => {
  assert.match(visualWrapper, /let effectiveOpacity = 1/)
  assert.match(visualWrapper, /current = current\.parentElement/)
  assert.match(visualWrapper, /effectiveOpacity \*= Number\.parseFloat\(currentStyle\.opacity/)
  assert.match(visualWrapper, /return effectiveOpacity > 0\.02/)
  assert.match(visualWrapper, /visibilityCount !== 1/)
  assert.match(visualWrapper, /ancestor-opacity visibility repair was not materialized/)
})

test('canonical visual proof materializes the current bare Mirror entry contract', () => {
  assert.match(canonicalVisualWrapper, /retired Mirror audit marker/)
  assert.match(canonicalVisualWrapper, /\[data-testid=\"mirror-bare-entry\"\]/)
  assert.match(canonicalVisualWrapper, /Choose what Mirror may open\./)
  assert.match(canonicalVisualWrapper, /Open disclosed demo/)
  assert.match(canonicalVisualWrapper, /Open Passport/)
})

test('Mirror browser proof validates accepted mobile suppression without broad reconciliation', () => {
  assert.match(mirrorReleaseProof, /if \(deviceName === 'desktop'\) \{\s*await orb\.click\(\)/s)
  assert.match(mirrorReleaseProof, /else \{\s*await orb\.waitFor\(\{ state: 'hidden' \}\)/s)
  assert.match(mirrorReleaseProof, /mobileOrbHiddenDuringInspection: deviceName === 'mobile'/)
  assert.match(mirrorReleaseProof, /timeout: 60000/)
  assert.match(mirrorReleaseProof, /requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)/)
  assert.match(mirrorReleaseRunner, /failed without eligible reconciliation/)
  assert.doesNotMatch(mirrorReleaseRunner, /reconciledCases|intentional mobile Orb suppression/)
})

test('Mirror replay reconciliation retries capture only after the original proof already reached canonical Replay', () => {
  assert.match(mirrorRealm, /<Link href=\{replayHref\}>Open Replay<\/Link>/)
  assert.match(mirrorReleaseRunner, /failure\?\.name !== 'transition-to-replay'/)
  assert.match(mirrorReleaseRunner, /failure\?\.device !== 'desktop'/)
  assert.match(mirrorReleaseRunner, /page\.screenshot: Timeout 60000ms exceeded/)
  assert.match(mirrorReleaseRunner, /pathname\(String\(failure\?\.finalUrl/)
  assert.match(mirrorReleaseRunner, /originalTransitionAlreadyReachedReplay: true/)
  assert.match(mirrorReleaseRunner, /const replayUrl = String\(failure\.finalUrl\)/)
  assert.match(mirrorReleaseRunner, /getByTestId\('urai-replay-surface'\)/)
  assert.match(mirrorReleaseRunner, /getByTestId\('urai-replay-timeline'\)/)
  assert.doesNotMatch(mirrorReleaseRunner, /getByRole\('link', \{ name: 'Open Replay'/)
  assert.doesNotMatch(mirrorReleaseRunner, /Replay this thread/)
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
