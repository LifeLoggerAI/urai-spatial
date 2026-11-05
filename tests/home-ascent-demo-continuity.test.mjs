import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { preserveExplicitHomeAscentDemo } from '../urai-tier1/src/spatial/world/homeAscentDemoContinuity.mjs'

const travel = { destination: 'life-map', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' }
function apply(starting, options = {}) {
  const request = { ...travel, ...(options.request || {}) }
  const target = new URL(options.target || 'https://urai.app/life-map/?from=home-sky')
  preserveExplicitHomeAscentDemo(target, request, starting)
  return target
}
test('only explicit singular Home demo=1 survives physical Ascent', () => {
  for (const start of ['https://urai.app/home?demo=1', 'https://urai.app/home/?demo=1', 'https://urai.app/?demo=1']) {
    const result = apply(start)
    assert.deepEqual(result.searchParams.getAll('demo'), ['1'])
    assert.deepEqual([...result.searchParams.keys()].sort(), ['demo', 'from'])
  }
})
test('missing, duplicated or invalid demo disclosure cannot be elevated', () => {
  for (const suffix of ['', '?demo=0', '?demo=true', '?demo=1&demo=1', '?demo=0&demo=1', '?demO=1'])
    assert.deepEqual(apply('https://urai.app/home/' + suffix).searchParams.getAll('demo'), [])
})
test('foreign or unrelated routes never carry demo', () => {
  for (const start of ['https://urai.app/focus?demo=1', 'https://urai.app/replay?demo=1', 'https://urai.app/ground?demo=1'])
    assert.deepEqual(apply(start).searchParams.getAll('demo'), [])
  for (const target of ['https://urai.app/focus', 'https://urai.app/ground', 'https://evil.example/life-map'])
    assert.deepEqual(apply('https://urai.app/home?demo=1', { target }).searchParams.getAll('demo'), [])
})
test('only exact canonical Home-sky completion is allowed', () => {
  for (const request of [
    { destination: 'focus' }, { entryPortal: 'home-ground' },
    { cameraCheckpoint: 'home-sky-ascent' }, { cameraCheckpoint: null },
  ]) assert.deepEqual(apply('https://urai.app/home?demo=1', { request }).searchParams.getAll('demo'), [])
})
test('target declaration is never overridden or duplicated', () => {
  const result = apply('https://urai.app/home?demo=1', { target: 'https://urai.app/life-map/?demo=0' })
  assert.deepEqual(result.searchParams.getAll('demo'), ['0'])
  assert.deepEqual(apply('https://urai.app/home?demo=1').searchParams.getAll('demo'), ['1'])
})
test('client and fallback navigation both apply the identical narrow demo continuity boundary', () => {
  const paths = [
    '../urai-tier1/src/spatial/world/WorldTransitionController.tsx',
    '../urai-tier1/src/spatial/world/worldEvents.ts',
  ]
  for (const path of paths) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8')
    assert.match(source, /preserveExplicitHomeAscentDemo\(target, request, window\.location\.href\)/)
  }
})

test('Adam inline launcher gives its text sufficient content width without changing floating launchers', () => {
  const css = readFileSync(new URL('../urai-tier1/src/spatial/adam/AdamPresenceRuntime.module.css', import.meta.url), 'utf8')
  const start = css.indexOf('.inlineLauncher {')
  const end = css.indexOf('\n}', start)
  assert.ok(start >= 0 && end > start, 'inline launcher CSS rule must exist')
  const rule = css.slice(start, end)
  assert.match(rule, /box-sizing:\s*border-box/)
  assert.match(rule, /width:\s*100%/)
  assert.match(rule, /padding-inline:\s*8px !important/)
  const minimumContentWidth = 64 - 2 * 8 - 2
  assert.ok(minimumContentWidth >= 42, '64px launcher must leave room for Adam text and font metrics')
})

test('private memory identifiers never become public demo authority', () => {
  for (const key of ['memoryId', 'node', 'manifestId', 'movieId', 'chapterId']) {
    const from = apply(`https://urai.app/home?demo=1&${key}=private-id`)
    assert.deepEqual(from.searchParams.getAll('demo'), [], 'source ' + key)
    const to = apply('https://urai.app/home?demo=1', { target: `https://urai.app/life-map/?${key}=private-id` })
    assert.deepEqual(to.searchParams.getAll('demo'), [], 'target ' + key)
  }
  for (const context of [{ memoryId: 'private-id' }, { replayManifestId: 'private-id' }]) {
    assert.deepEqual(apply('https://urai.app/home?demo=1', { request: { context } }).searchParams.getAll('demo'), [])
  }
})
