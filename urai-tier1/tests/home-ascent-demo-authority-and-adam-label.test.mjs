import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const controller = source('../src/spatial/world/WorldTransitionController.tsx')
const fallback = source('../src/spatial/world/worldEvents.ts')
const launcherStyles = source('../src/spatial/adam/AdamPresenceRuntime.module.css')

test('both Home ascent route paths retain only the exact disclosed public demo marker', () => {
  for (const [name, text] of [['client router', controller], ['hard fallback', fallback]]) {
    assert.match(text, /request\.destination === 'life-map'/, name)
    assert.match(text, /request\.entryPortal === 'home-sky'/, name)
    assert.match(text, /request\.cameraCheckpoint === 'home-sky-ascent-complete'/, name)
    assert.match(text, /current\.getAll\('demo'\)\.length === 1/, name)
    assert.match(text, /current\.get\('demo'\) === '1'/, name)
    assert.match(text, /!current\.has\('memoryId'\)/, name)
    assert.match(text, /!target\.searchParams\.has\('memoryId'\)/, name)
    assert.match(text, /if \(homeDemoAscent\) target\.searchParams\.set\('demo', '1'\)/, name)
    assert.match(text, /if \(!memoryDestination\) \{/, name)
  }
})

test('Adam inline launcher retains 48px target without clipping its visible label', () => {
  const block = launcherStyles.match(/\.inlineLauncher \{([\s\S]*?)\}/)
  assert.ok(block)
  assert.match(block[1], /box-sizing: border-box/)
  assert.match(block[1], /padding-inline: 10px !important/)
  assert.match(launcherStyles, /min-height: 48px !important/)
  assert.match(launcherStyles, /min-width: 64px !important/)
})
