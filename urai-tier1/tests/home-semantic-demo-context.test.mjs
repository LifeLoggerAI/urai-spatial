import assert from 'node:assert/strict'
import test from 'node:test'
import { homeSemanticHref } from '../src/spatial/home/homeSemanticHref.ts'

const lifeMap = '/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete'
const ground = '/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent'

test('native Home links preserve explicit demo context and destination continuity', () => {
  for (const destination of [lifeMap, ground]) {
    const result = new URL(homeSemanticHref(destination, '?demo=1'), 'https://urai.app')
    const original = new URL(destination, 'https://urai.app')
    assert.equal(result.pathname, original.pathname)
    assert.equal(result.searchParams.get('demo'), '1')
    for (const [key, value] of original.searchParams) assert.equal(result.searchParams.get(key), value)
  }
})
test('normal and non-explicit modes never acquire demo context', () => {
  for (const search of ['', '?demo=0', '?demo=true', '?other=1']) assert.equal(homeSemanticHref(lifeMap, search), lifeMap)
})
test('Home navigation does not forward unrelated or sensitive parameters', () => {
  const result = new URL(homeSemanticHref(lifeMap, '?demo=1&memoryId=private-memory&token=private-token&redirect=https://example.com'), 'https://urai.app')
  assert.deepEqual([...result.searchParams.keys()].sort(), ['cameraCheckpoint', 'demo', 'entryPortal', 'from'].sort())
})
