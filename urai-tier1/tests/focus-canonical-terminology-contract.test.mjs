import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const route = fs.readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const compatibilityRoute = fs.readFileSync(new URL('../src/app/focus/session/[sessionId]/page.tsx', import.meta.url), 'utf8')
const focusState = fs.readFileSync(new URL('../src/spatial/scene/focusState.ts', import.meta.url), 'utf8')
const focusRuntime = fs.readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const selectedMemory = fs.readFileSync(new URL('../src/spatial/memory/selectedMemoryContract.ts', import.meta.url), 'utf8')
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

test('internal chamber and aperture names may remain while the visible Replay action stays Enter Replay', () => {
  assert.match(focusRuntime, /FOCUS_CHAMBER_MODEL = '\/assets\/urai\/generated\/models\/focus-memory-chamber-v1\.glb'/)
  assert.match(focusRuntime, /function MemoryAperture/)
  assert.match(focusRuntime, /entryPortal: 'focus-memory-aperture'/)
  assert.match(focusRuntime, /Enter Replay/)
})

test('historical productivity terminology remains explicitly non-governing', () => {
  assert.match(canon, /productivity-session concept is explicitly non-governing/)
  assert.match(canon, /Deep Focus/)
  assert.match(canon, /Deep Work/)
  assert.match(canon, /Close Inspection/)
  assert.match(canon, /Enter Replay/)
})
