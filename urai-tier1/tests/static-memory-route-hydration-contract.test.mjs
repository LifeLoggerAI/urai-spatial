import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const focusPage = readFileSync(new URL('../src/app/focus/page.tsx', import.meta.url), 'utf8')
const focusClient = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
const replayPage = readFileSync(new URL('../src/app/replay/page.tsx', import.meta.url), 'utf8')
const replayClient = readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
const smoke = readFileSync(new URL('../../scripts/urai-release-control-smoke.mjs', import.meta.url), 'utf8')

// Static export must expose the real surfaces before client-side query hydration begins.
test('focus and replay render real static surfaces instead of Suspense loading shells', () => {
  assert.doesNotMatch(focusPage, /Suspense|Focus loading/)
  assert.match(focusPage, /return <FinalFocusChamber \/>/)
  assert.doesNotMatch(replayPage, /Suspense|Replay loading/)
  assert.match(replayPage, /<FinalReplayFilm \/>/)
})

test('memory routes hydrate exact query identity without useSearchParams', () => {
  for (const source of [focusClient, replayClient]) {
    assert.doesNotMatch(source, /useSearchParams/)
    assert.match(source, /new URLSearchParams\(window\.location\.search\)/)
    assert.match(source, /setIdentity\(\{ memoryId: nextMemoryId, manifestId: nextManifestId, node: nextNode \}\)/)
  }
})

test('strict smoke waits for an exact visible hydrated identity', () => {
  assert.match(smoke, /await page\.waitForFunction\(/)
  assert.match(smoke, /element\.getAttribute\('data-memory-id'\) === expected\.memoryId/)
  assert.match(smoke, /element\.getAttribute\('data-manifest-id'\) === expected\.manifestId/)
  assert.match(smoke, /element\.getAttribute\('data-node'\) === expected\.node/)
  assert.match(smoke, /page\.locator\(visibleSelector\)\.first\(\)/)
})
