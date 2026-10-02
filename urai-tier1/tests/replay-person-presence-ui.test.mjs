import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const component=fs.readFileSync(new URL('../src/app/replay/ReplayPersonPresence.tsx',import.meta.url),'utf8')
const replay=fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx',import.meta.url),'utf8')

test('Replay mounts Person Presence only behind canonical Life Model authority',()=>{
  assert.match(replay,/lifeModelAuthority\.available \? <ReplayPersonPresence/)
  assert.match(replay,/people=\{lifeModelAuthority\.people\}/)
})

test('Person Presence requires explicit interaction start and external AI processing consent',()=>{
  assert.match(component,/preparePersonPresenceSession/)
  assert.match(component,/Allow this conversation to use the configured AI provider/)
  assert.match(component,/!aiConsent/)
})

test('Person Presence keeps simulation truth visible and supports immediate stop\/close',()=>{
  assert.match(component,/Simulation — generated replies are not historical speech or testimony/)
  assert.match(component,/const stop=/)
  assert.match(component,/aborter\.current\?\.abort/)
  assert.match(component,/closePersonPresenceSession/)
})

test('Person Presence is keyboard\/accessibility reachable',()=>{
  assert.match(component,/aria-label="People in this memory"/)
  assert.match(component,/aria-live="polite"/)
  assert.match(component,/role="status"/)
  assert.match(component,/:focus-visible/)
  assert.match(component,/prefers-reduced-motion/)
})
