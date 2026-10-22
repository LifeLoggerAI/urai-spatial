import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { currentFocusNode, eligibleFocusNeighbors, focusNeighborHref } from '../src/app/focus/focusNeighborContinuity.ts'

const node = (id, memoryId, authorizedMemory = true, position = [0, 0, 0]) => ({
  id, type: 'memory', title: id, position, intensity: 0.7,
  aura: '#8adfff', dateLabel: '', replayAvailable: true,
  connectedTo: [], privacyLevel: 'private', locked: false,
  memoryId, replayManifestId: 'manifest-' + memoryId, authorizedMemory,
})
const memory = {
  id: 'owned-a', demo: false, privacy: 'private',
  star: { id: 'star-a' }, replayManifest: { id: 'manifest-owned-a' },
}
const nodes = [
  node('star-a', 'owned-a'),
  node('star-b', 'owned-b', true, [3, 0, -2]),
  node('star-c', 'owned-c', true, [-4, 1, -5]),
  node('unverified', 'unknown', false, [1, 0, -1]),
  { ...node('hidden', 'hidden', true, [1, 0, -1]), privacyLevel: 'hidden' },
  { ...node('locked', 'locked', true, [1, 0, -1]), locked: true },
]

test('URL node hints cannot relabel another memory as the selected private star', () => {
  assert.equal(currentFocusNode(nodes, memory, 'star-b')?.id, 'star-a')
  assert.equal(currentFocusNode(nodes, { ...memory, id: 'other-owner' }, 'star-a'), null)
  assert.equal(currentFocusNode(nodes, { ...memory, privacy: 'hidden' }, 'star-a'), null)
})
test('disclosed demo URL hints cannot mismatch the selected photosphere and sample content', () => {
  const sample = { ...memory, demo: true, star: { id: 'star-a' } }
  assert.equal(currentFocusNode(nodes, sample, 'star-b')?.id, 'star-a')
  assert.equal(currentFocusNode(nodes, { ...sample, star: { id: 'unknown-sample' } }, 'star-b'), null)
})
test('neighbor choice only includes eligible and canonical authorized memories', () => {
  assert.deepEqual(eligibleFocusNeighbors(nodes, nodes[0], memory).map(n => n.id), ['star-b', 'star-c'])
  assert.deepEqual(eligibleFocusNeighbors(nodes, null, memory), [])
})
test('neighbor route binds exact manifest, never stale private media or owner data', () => {
  const route = focusNeighborHref(nodes[1], false)
  const url = new URL(route, 'https://example.invalid')
  assert.equal(url.pathname, '/focus')
  assert.equal(url.searchParams.get('memoryId'), 'owned-b')
  assert.equal(url.searchParams.get('manifestId'), 'manifest-owned-b')
  assert.equal(url.searchParams.get('node'), 'star-b')
  assert.equal(url.searchParams.has('movieId'), false)
  assert.equal(url.searchParams.has('ownerId'), false)
  assert.equal(focusNeighborHref(nodes[3], false), null)
  assert.equal(focusNeighborHref(nodes[4], false), null)
  assert.equal(focusNeighborHref(nodes[5], false), null)
})
test('explicit demo navigation is disclosed and cannot carry private manifest', () => {
  const url = new URL(focusNeighborHref(nodes[1], true), 'https://example.invalid')
  assert.equal(url.searchParams.get('demo'), '1')
  assert.equal(url.searchParams.get('memoryId'), 'star-b')
  assert.equal(url.searchParams.has('manifestId'), false)
})
test('Focus shares original galaxy and model with visible star choices', () => {
  const world = readFileSync(new URL('../src/components/lifemap/LifeMapProductionWorld.tsx', import.meta.url), 'utf8')
  const focus = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
  assert.match(world, /focus-shared-authored-galaxy/)
  assert.match(world, /<GalaxyDepth tier=/)
  assert.match(world, /<AuthoredMemoryStar aura=\{node.aura\}/)
  assert.match(focus, /useLifeMapEvents\(/)
  assert.match(focus, /<FocusLifeMapContext/)
  assert.match(focus, /data-focus-neighbors="authorized"/)
})

test('neighbor travel checkpoints the destination star rather than the departing star', () => {
  const focus = readFileSync(new URL('../src/app/focus/FocusChamberClient.tsx', import.meta.url), 'utf8')
  const start = focus.indexOf('const onSelectNeighbor = useCallback(')
  const end = focus.indexOf('const unwind = useCallback(', start)
  assert.ok(start >= 0 && end > start, 'neighbor selection callback missing')
  const selection = focus.slice(start, end)
  assert.match(selection, /cameraCheckpoint: `focus:\$\{node\.id\}`/)
  assert.doesNotMatch(selection, /cameraCheckpoint: `focus:\$\{memory\.star\.id\}`/)
  assert.match(selection, /const href = focusNeighborHref\(node, memory\.demo\)/)
})

test('non-replayable disclosed artifacts stay in Life Map, never appear as Focus memory neighbors', () => {
  const pattern = { ...node('recurring-pressure-loop', undefined, false, [1, 0, -1]), type: 'ritual', replayAvailable: false }
  const sample = { ...memory, demo: true }
  assert.deepEqual(eligibleFocusNeighbors([nodes[0], pattern, nodes[1]], nodes[0], sample).map(n => n.id), ['star-b'])
  assert.equal(focusNeighborHref(pattern, true), null)
  assert.equal(new URL(focusNeighborHref(nodes[1], true), 'https://example.invalid').searchParams.get('memoryId'), 'star-b')
})
