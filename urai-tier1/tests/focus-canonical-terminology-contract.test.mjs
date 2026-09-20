import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const route = fs.readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const compatibilityRoute = fs.readFileSync(new URL('../src/app/focus/session/[sessionId]/page.tsx', import.meta.url), 'utf8')
const focusState = fs.readFileSync(new URL('../src/spatial/scene/focusState.ts', import.meta.url), 'utf8')
const focusRuntime = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const focusPolish = fs.readFileSync(new URL('../src/app/focus/focus-launch-visual-polish.css', import.meta.url), 'utf8')
const explicitDemoMemory = fs.readFileSync(new URL('../src/spatial/memory/explicitDemoMemory.ts', import.meta.url), 'utf8')
const selectedMemory = fs.readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8')
const worldTransition = fs.readFileSync(new URL('../src/spatial/world/WorldTransitionController.tsx', import.meta.url), 'utf8')
const worldNavigation = fs.readFileSync(new URL('../src/spatial/world/worldNavigation.css', import.meta.url), 'utf8')
const canon = fs.readFileSync(new URL('../../docs/FOCUS_CANONICAL_TERMINOLOGY_LOCK.md', import.meta.url), 'utf8')

test('public Focus route describes selected-memory Focus rather than productivity Focus', () => {
  assert.match(route, /title: 'URAI Focus'/)
  assert.match(route, /close-range selected-memory experience/)
  assert.doesNotMatch(route, /Deep Work|Focus Session|mission cockpit|task timer|app blocking/i)
})

test('legacy session-shaped compatibility route redirects valid stars and uses canonical unavailable copy', () => {
  assert.match(compatibilityRoute, /Selected memory unavailable/)
  assert.match(compatibilityRoute, /This memory cannot be opened in Focus/)
  assert.match(compatibilityRoute, /redirect\(resolution\.star\.focusHref\)/)
  assert.doesNotMatch(compatibilityRoute, />Focus session unavailable</i)
  assert.doesNotMatch(compatibilityRoute, />This focus session/i)
})

test('generic neighboring entities use Related Context semantics without renaming state ids', () => {
  assert.match(focusState, /label: 'Related Context Preview'/)
  assert.match(focusState, /Related context is previewed while the selected memory remains anchored/)
  assert.doesNotMatch(focusState, /label: 'Related Memory Preview'/)
  assert.match(focusState, /'focus_node_hovered'/)
})

test('neutral Focus Observatory remains distinct from selected-memory Focus', () => {
  assert.match(focusRuntime, /directEntry \? 'Focus Observatory'/)
  assert.match(focusRuntime, /memory\?\.title \?\? \(directEntry \? 'Focus Observatory'/)
  assert.match(canon, /Focus Observatory/)
})

test('selected-memory identity and Replay manifest remain bound into Focus travel', () => {
  assert.match(selectedMemory, /export type SelectedMemoryStar/)
  assert.match(selectedMemory, /star: SelectedMemoryStar/)
  assert.match(selectedMemory, /replayManifest: SelectedMemoryReplayManifest/)
  assert.match(focusRuntime, /memoryId: memory\.id/)
  assert.match(focusRuntime, /manifestId: memory\.replayManifest\.id/)
  assert.match(focusRuntime, /node: memory\.star\.id/)
})

test('internal replay portal id remains while the visible Focus object is the selected Memory Star', () => {
  assert.match(focusRuntime, /entryPortal: 'focus-memory-aperture'/)
  assert.match(focusRuntime, /name="focus-selected-memory-star"/)
  assert.match(focusRuntime, /data-focus-composition="selected-memory-star-with-contained-memory"/)
  assert.match(focusRuntime, /data-focus-terrain-owner="false"/)
  assert.match(focusRuntime, /'Enter Replay for ' \+ memory\.title/)
  assert.match(focusRuntime, />\{committed \? 'Opening…' : 'Enter Replay'\}<\/button>/)
  assert.doesNotMatch(focusRuntime, /FOCUS_CHAMBER_MODEL|function MemoryAperture|AuthoredFocusChamber/)
})

test('public Focus runtime does not regress to chamber-era product copy', () => {
  for (const blocked of [
    'Preparing spatial chamber',
    'Memory chamber resting',
    'Chamber threshold',
    'Focus chamber controls',
    'Spatial chamber ready',
    'Open Replay for',
    'The chamber remains accessible through the controls and memory details.',
    'Held in context. Nothing leaves this chamber.',
  ]) assert.equal(focusRuntime.includes(blocked), false, blocked)
  assert.match(focusRuntime, /Preparing Focus/)
  assert.match(focusRuntime, /aria-label="Focus controls"/)
  assert.match(focusRuntime, /Focus ready/)
})

test('live selected Memory Star is the Focus pixel authority', () => {
  assert.match(focusRuntime, /Locked product authority; V341 is the current literal-pixel implementation/)
  assert.match(focusRuntime, /name="focus-selected-memory-star"/)
  assert.match(focusRuntime, /name="focus-memory-star-glass-shell"/)
  assert.match(focusRuntime, /<MemoryVisualContent memory=\{memory\} \/>/)
  assert.match(focusRuntime, /data-focus-memory-visual=\{memoryVisual\}/)
  assert.doesNotMatch(focusRuntime, /FocusSanctuaryGround|focus-v251-grounded-living-memory-manifestation|focus-authored-fractured-stratum-/)
  assert.doesNotMatch(focusRuntime, /FOCUS_CHAMBER_MODEL|focus-retired-procedural-vault/)
  assert.doesNotMatch(focusPolish, /background-image:[\s\S]*var\(--focus-asset\)/)
})

test('Focus and Replay crossings are destination-aware and cannot render the shared portal tunnel', () => {
  assert.match(worldTransition, /pendingTravel/)
  assert.match(worldTransition, /data-to=\{pendingTravel\?\.destination \?\? world\.destination\}/)
  assert.match(worldNavigation, /data-to='focus'[\s\S]*\.urai-world-transition__aperture[\s\S]*display: none/)
  assert.match(worldNavigation, /data-to='replay'[\s\S]*\.urai-world-transition__aperture[\s\S]*display: none/)
  assert.match(worldNavigation, /data-from='focus'\]\[data-to='life-map'[\s\S]*\.urai-world-transition__aperture[\s\S]*display: none/)
  assert.match(worldNavigation, /urai-memory-depth-crossing/)
  const memoryCrossing = worldNavigation.slice(worldNavigation.indexOf("data-to='focus'"))
  assert.doesNotMatch(memoryCrossing, /repeating-radial-gradient[^}]*urai-memory-depth-crossing/)
})

test('explicit demo narration stays canonical and does not reintroduce chamber product copy', () => {
  assert.match(explicitDemoMemory, /narratorLine: 'Return to Focus\.'/)
  assert.match(explicitDemoMemory, /focus: 'Selected memory\. The quiet reset is ready as an explicit demonstration\.'/)
  assert.doesNotMatch(explicitDemoMemory, /Focus chamber|Selected memory chamber/)
})

test('historical productivity terminology remains explicitly non-governing', () => {
  assert.match(canon, /productivity-session concept is explicitly non-governing/)
  assert.match(canon, /Deep Focus/)
  assert.match(canon, /Deep Work/)
  assert.match(canon, /Close Inspection/)
  assert.match(canon, /Enter Replay/)
})
