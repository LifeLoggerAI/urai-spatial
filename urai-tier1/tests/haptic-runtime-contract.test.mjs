import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const runtime = fs.readFileSync('src/spatial/haptics/HapticRuntime.tsx', 'utf8')
const registry = fs.readFileSync('src/spatial/haptics/hapticCueRegistry.ts', 'utf8')
const shell = fs.readFileSync('src/spatial/world/UraiWorldShell.tsx', 'utf8')

test('persistent world mounts one governed haptic runtime', () => {
  assert.match(shell, /import HapticRuntime from '@\/spatial\/haptics\/HapticRuntime'/)
  assert.equal((shell.match(/<HapticRuntime \/>/g) || []).length, 1)
})

test('runtime executes registry patterns through capability-gated local devices', () => {
  assert.match(runtime, /getHapticCue\(cueId\)/)
  assert.match(runtime, /navigator\.vibrate\(cue\.patternMs\)/)
  assert.match(runtime, /navigator\.getGamepads\(\)/)
  assert.match(runtime, /playEffect\('dual-rumble'/)
  assert.match(runtime, /pulse\(0\.3, duration\)/)
  assert.doesNotMatch(runtime, /fetch\(/)
})

test('runtime has one event contract and a user-controlled hard off switch', () => {
  assert.match(runtime, /URAI_HAPTIC_CUE_EVENT = 'urai:haptic-cue'/)
  assert.match(runtime, /URAI_HAPTICS_STORAGE_KEY = 'urai:haptics:enabled-v1'/)
  assert.match(runtime, /export function requestHapticCue/)
  assert.match(runtime, /export function setHapticsEnabled/)
  assert.match(runtime, /navigator\.vibrate\(0\)/)
})

test('world travel and return map to the governed tactile vocabulary', () => {
  assert.match(runtime, /URAI_WORLD_TRAVEL_EVENT/)
  assert.match(runtime, /executeHapticCue\('portal-open'\)/)
  assert.match(runtime, /URAI_WORLD_RETURN_EVENT/)
  assert.match(runtime, /executeHapticCue\('return-home'\)/)
  for (const cue of ['portal-open', 'return-home']) assert.ok(registry.includes(`'${cue}'`))
})
