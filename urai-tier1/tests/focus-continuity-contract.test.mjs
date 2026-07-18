import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  buildNamedExplicitDemoMemory,
  isKnownExplicitDemoMemoryId,
} from '../src/spatial/memory/explicitDemoMemory.ts'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const hook = read('src/spatial/memory/useSelectedMemory.ts')
const explicitDemo = read('src/spatial/memory/explicitDemoMemory.ts')
const focus = read('src/app/focus/FocusChamberClient.tsx')
const worldState = read('src/spatial/world/WorldStateProvider.tsx')
const worldTransition = read('src/spatial/world/WorldTransitionController.tsx')


test('known Life Map sample identities resolve to disclosed canonical demo memories', () => {
  assert.equal(isKnownExplicitDemoMemoryId('memory-thread'), true)
  assert.equal(isKnownExplicitDemoMemoryId('demo:memory-thread'), true)
  assert.equal(isKnownExplicitDemoMemoryId('private-user-memory'), false)

  const memory = buildNamedExplicitDemoMemory('memory-thread')
  assert.equal(memory.id, 'demo:memory-thread')
  assert.equal(memory.star.id, 'memory-thread')
  assert.equal(memory.replayManifest.id, 'replay-recovery-thread')
  assert.equal(memory.title, 'Memory Thread')
  assert.equal(memory.demo, true)
  assert.equal(memory.ownerId, 'explicit-demo')
})

test('the canonical Quiet Reset fixture keeps exact Focus and Replay identity', () => {
  const memory = buildNamedExplicitDemoMemory('demo:quiet-reset')
  assert.equal(memory.id, 'demo:quiet-reset')
  assert.equal(memory.star.id, 'quiet-reset')
  assert.equal(memory.replayManifest.id, 'replay-recovery-thread')
  assert.equal(memory.title, 'The Quiet Reset')
  assert.equal(memory.replayManifest.segments.length, 4)
})

test('Focus resolves only disclosed demo requests, known demo prefixes, or an enabled sample constellation', () => {
  assert.match(hook, /isExplicitDemoRequest\(params\)/)
  assert.match(hook, /params\.get\('demo'\) === '1' && isKnownExplicitDemoMemoryId\(memoryId\)/)
  assert.match(hook, /memoryId\.startsWith\('demo:'\)/)
  assert.match(hook, /explicitDemoModeEnabled\(\) && isKnownExplicitDemoMemoryId\(memoryId\)/)
  assert.match(hook, /getDoc\(doc\(getFirebaseDb\(\), 'users', user\.uid, 'memories', memoryId\)\)/)
})

test('Focus subscribes to direct, history, and same-path world-location identity changes', () => {
  assert.match(hook, /const \[search, setSearch\] = useState\(\(\) => typeof window === 'undefined' \? '' : window\.location\.search\)/)
  assert.match(hook, /const currentParams = new URLSearchParams\(search\)/)
  assert.match(hook, /window\.addEventListener\('popstate', syncFromWindow\)/)
  assert.match(hook, /window\.addEventListener\('pageshow', syncFromWindow\)/)
  assert.match(hook, /window\.addEventListener\(URAI_WORLD_LOCATION_EVENT, syncFromWorldTravel\)/)
  assert.match(hook, /setSearch\(new URL\(event\.detail\.href, window\.location\.origin\)\.search\)/)
  assert.doesNotMatch(hook, /useMemo/)
  assert.doesNotMatch(hook, /\[manifestId, memoryId, params, rawMemoryId\]/)
})

test('same-path Focus travel normalizes static-export slashes and returns the world phase to idle without destroying return history', () => {
  assert.match(worldState, /const destinationChanged = state\.world\.destination !== action\.request\.destination/)
  assert.match(worldState, /previousDestination: destinationChanged \? state\.world\.destination : state\.world\.previousDestination/)
  assert.match(worldTransition, /const \{ world, phase, beginTravel, cancelTransition \} = useUraiWorldState\(\)/)
  assert.match(worldTransition, /const cancelTransitionRef = useRef\(cancelTransition\)/)
  assert.match(worldTransition, /function normalizePathname\(pathname: string\)/)
  assert.match(worldTransition, /pathname\.replace\(\/\\\/\+\$\/, ''\)/)
  assert.match(worldTransition, /const targetPathname = new URL\(href, window\.location\.origin\)\.pathname/)
  assert.match(worldTransition, /normalizePathname\(targetPathname\) === normalizePathname\(window\.location\.pathname\)/)
  assert.match(worldTransition, /if \(samePath\) cancelTransitionRef\.current\(\)/)
})

test('demo-mode storage is best effort and cannot crash private Focus resolution', () => {
  assert.match(explicitDemo, /try \{/)
  assert.match(explicitDemo, /window\.localStorage\.getItem\('urai:lifeMapDemoMode'\)/)
  assert.match(explicitDemo, /catch \{\s*return false\s*\}/s)
})

test('Focus carries exact identity into Replay and raw star identity back to Life Map', () => {
  assert.match(focus, /memoryId: memory\.id/)
  assert.match(focus, /manifestId: memory\.replayManifest\.id/)
  assert.match(focus, /node: memory\.star\.id/)
  assert.match(focus, /new URLSearchParams\(\{ node: memory\.star\.id, from: 'focus-return' \}\)/)
  assert.match(focus, /destination: 'life-map'/)
  assert.match(focus, /context: \{\s*memoryId: memory\.star\.id,/s)
  assert.match(focus, /destination: 'replay'/)
})

test('Focus tolerates older records with omitted media, people, fog, or reflection fields', () => {
  assert.match(focus, /memory\?\.sourceMedia\?\.find/)
  assert.match(focus, /memory\.people\?\.filter\(Boolean\)/)
  assert.match(focus, /memory\.visuals\.fog \?\? 0/)
  assert.match(focus, /memory\.visuals\.reflection \?\? 0/)
})
