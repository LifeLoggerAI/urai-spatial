import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const client = fs.readFileSync(new URL('../src/app/rituals/RitualsClient.tsx', import.meta.url), 'utf8')
const page = fs.readFileSync(new URL('../src/app/rituals/page.tsx', import.meta.url), 'utf8')

test('Rituals exposes the existing physical platform through the governed post-launch gate', () => {
  assert.match(page, /postLaunchSpatialRealmsEnabled/)
  assert.match(client, /<RitualPlatform/)
  assert.match(client, /data-testid="urai-ritual-world"/)
  assert.match(client, /data-ritual-authority="urai-ref-ritual-001"/)
})

test('Small Map ritual is user-started, cancelable, quiet and non-fabricating', () => {
  assert.match(client, /Nothing has been inferred about you/)
  assert.match(client, /data-voice-allowed="false"/)
  assert.match(client, /data-visual-bloom-allowed="false"/)
  assert.match(client, /Cancel ritual/)
  assert.match(client, /requestUraiWorldReturn/)
  assert.match(client, /sacredUXDisclosure/)
})

test('Rituals preserves silence windows and reduced sensory behavior', () => {
  assert.match(client, /silenceBeforeMs: 2600/)
  assert.match(client, /silenceAfterMs: 2200/)
  assert.match(client, /useReducedMotion/)
  assert.match(client, /Reduced stimulation/)
  assert.match(client, /reflectionMode=\{reducedStimulation \? 'off' : 'faked'\}/)
})
