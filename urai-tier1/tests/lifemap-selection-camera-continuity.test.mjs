import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const selectStart = source.indexOf('const selectNode = useCallback(')
const overviewStart = source.indexOf('const overview = useCallback(', selectStart)
assert.ok(selectStart >= 0 && overviewStart > selectStart)
const selection = source.slice(selectStart, overviewStart)

test('an in-world memory star selection never rewrites the Life Map URL mid-flight', () => {
  assert.match(selection, /setSelectedId\(node\.id\)/)
  assert.match(selection, /setPhase\("departure"\)/)
  assert.doesNotMatch(selection, /router\.(?:replace|push)\(/)
  assert.doesNotMatch(selection, /window\.history\.(?:replaceState|pushState)\(/)
})

test('a stale deep-link identity cannot replace a newer locally selected star', () => {
  assert.match(source, /localSelectionId\.current && localSelectionId\.current !== queryNode\) return/)
  assert.match(source, /if \(localSelectionId\.current === node\.id\)/)
})

test('Focus and Replay keep independently authorized selected memory navigation', () => {
  assert.match(source, /const destinationHref = useCallback/)
  assert.match(source, /next\.set\("node", selected\.id\)/)
  assert.match(source, /selected\.authorizedMemory && selected\.memoryId/)
  assert.match(source, /forwardPrivateMovieRouteSelection\(next, params/)
  assert.match(source, /router\.push\(destinationHref\("focus"\)\)/)
  assert.match(source, /router\.push\(destinationHref\("replay"\)\)/)
})

test('explicit overview remains a real route transition with a return action', () => {
  const overview = source.slice(overviewStart, source.indexOf('const destinationHref = useCallback(', overviewStart))
  assert.match(overview, /setPhase\("overview"\)/)
  assert.match(overview, /next\.set\("overview", "1"\)/)
  assert.match(overview, /router\.replace\(/)
})
