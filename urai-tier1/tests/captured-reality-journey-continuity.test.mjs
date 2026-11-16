import assert from 'node:assert/strict'
import test from 'node:test'
import { capturedRealityJourneyEntryHref, capturedRealityJourneyReturnHref } from '../src/spatial/captured-reality/capturedRealityJourney.ts'

test('Captured Reality deep links and reloads retain the selected memory through Replay and Focus', () => {
  for (const memoryId of ['memory-1', 'memory:source-2', 'private_memory.3']) {
    const entry = new URL(capturedRealityJourneyEntryHref('crp_2026_001', memoryId), 'https://example.invalid')
    assert.equal(entry.searchParams.get('memoryId'), memoryId)
    assert.equal(entry.searchParams.get('assetId'), 'crp_2026_001')
    const returned = new URL(capturedRealityJourneyReturnHref(entry.searchParams.get('memoryId')), 'https://example.invalid')
    assert.equal(returned.pathname, '/replay')
    assert.equal(returned.searchParams.get('memoryId'), memoryId)
  }
})

test('invalid or absent journey identities return to Life Map without invented selection or external history', () => {
  for (const id of [null, '', '/home', '../place', 'https://foreign.invalid', 'x'.repeat(121), 'private address']) {
    assert.equal(capturedRealityJourneyReturnHref(id), '/life-map')
    assert.equal(capturedRealityJourneyEntryHref('crp_2026_001', id ?? ''), null)
  }
  assert.equal(capturedRealityJourneyEntryHref('private/source', 'memory-1'), null)
})
