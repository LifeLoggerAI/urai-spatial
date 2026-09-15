import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const route = fs.readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const focusState = fs.readFileSync(new URL('../src/spatial/scene/focusState.ts', import.meta.url), 'utf8')
const focusRuntime = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const lifeMapWorld = fs.readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
const selectedMemory = fs.readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8')
const canon = fs.readFileSync(new URL('../../docs/FOCUS_CANONICAL_TERMINOLOGY_LOCK.md', import.meta.url), 'utf8')

test('public Focus route describes the selected-memory spatial experience rather than historical productivity Focus', () => {
  assert.match(route, /title: 'URAI Focus'/)
  assert.match(route, /close-range selected-memory experience/)
  assert.doesNotMatch(route, /Deep Work|Focus Session|mission cockpit|task timer|app blocking/i)
})

test('neutral Focus Observatory remains distinct from selected-memory Focus', () => {
  assert.match(focusRuntime, /directEntry \? 'Focus Observatory'/)
  assert.match(focusRuntime, /memory \? \(memory\.demo \? 'DEMO FIXTURE · NOT PERSONAL DATA'/)
  assert.match(canon, /Focus Observatory.*reserved for the safe neutral direct-entry state/s)
})

test('generic neighboring graph entities use Related Context language', () => {
  assert.match(focusState, /label: 'Related Context Preview'/)
  assert.match(focusState, /A related Life Map node is previewed/)
  assert.doesNotMatch(focusState, /label: 'Related Memory Preview'/)
})

test('existing Life Map and Focus state machines remain authoritative', () => {
  assert.match(lifeMapWorld, /LifeMapJourneyPhase = "overview" \| "departure" \| "travel" \| "approach" \| "arrival"/)
  for (const phase of ['entering_focus', 'loading_focus_data', 'focus_ready', 'focus_node_hovered', 'focus_node_selected', 'focus_detail_open', 'focus_recentering', 'exiting_focus', 'focus_empty', 'focus_error']) {
    assert.match(focusState, new RegExp(`'${phase}'`))
  }
})

test('Memory Star identity and Replay manifest remain part of selected-memory authority', () => {
  assert.match(selectedMemory, /export type SelectedMemoryStar/)
  assert.match(selectedMemory, /star: SelectedMemoryStar/)
  assert.match(selectedMemory, /replayManifest: SelectedMemoryReplayManifest/)
  assert.match(focusRuntime, /memoryId: memory\.id/)
  assert.match(focusRuntime, /manifestId: memory\.replayManifest\.id/)
  assert.match(focusRuntime, /node: memory\.star\.id/)
})

test('internal chamber and aperture names may remain while visible portal imagery stays retired', () => {
  assert.match(focusRuntime, /FOCUS_CHAMBER_MODEL = '\/assets\/urai\/generated\/models\/focus-memory-chamber-v1\.glb'/)
  assert.match(focusRuntime, /function MemoryAperture/)
  assert.match(focusRuntime, /entryPortal: 'focus-memory-aperture'/)
  assert.match(focusRuntime, />\{memory \? 'Enter Replay' : 'Awaiting a selected star'\}<\/button>/)
  assert.match(focusRuntime, /focus-tunnel-ring-/)
  assert.match(focusRuntime, /v249-no-focus-ring-cage-or-repeated-runes/)
})

test('historical productivity Focus language is explicitly non-governing', () => {
  assert.match(canon, /historical productivity-oriented Focus specification.*non-governing/s)
  assert.match(canon, /Deep Focus/)
  assert.match(canon, /Deep Work/)
  assert.match(canon, /Close Inspection/)
  assert.match(canon, /Enter Replay/)
})
