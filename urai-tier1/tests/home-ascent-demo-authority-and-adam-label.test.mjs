import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const controller = source('../src/spatial/world/WorldTransitionController.tsx')
const fallback = source('../src/spatial/world/worldEvents.ts')
const launcherStyles = source('../src/spatial/adam/AdamPresenceRuntime.module.css')

test('both Home ascent route paths delegate to shared disclosed public demo authority', () => {
  for (const [name, text] of [['client router', controller], ['hard fallback', fallback]]) {
    assert.match(text, /retainDisclosedHomeAscentDemo\(window\.location\.pathname, window\.location\.search, request, target\)/, name)
    assert.doesNotMatch(text, /const homeDemoAscent =/, 'do not fork authorization rules')
  }
  const helper = source('../src/spatial/navigation/homeSkyInteraction.ts')
  assert.match(helper, /export function retainDisclosedHomeAscentDemo/)
  assert.match(helper, /flags\.length !== 1/)
  assert.match(helper, /source\.has\('memoryId'\)/)
  assert.match(helper, /target\.searchParams\.has\('memoryId'\)/)
  assert.match(helper, /target\.searchParams\.set\('demo', '1'\)/)
})

test('Adam inline launcher retains 48px target without clipping its visible label', () => {
  const block = launcherStyles.match(/\.inlineLauncher \{([\s\S]*?)\}/)
  assert.ok(block)
  assert.match(block[1], /box-sizing: border-box/)
  assert.match(block[1], /padding-inline: 10px !important/)
  assert.match(launcherStyles, /min-height: 48px !important/)
  assert.match(launcherStyles, /min-width: 64px !important/)
})
