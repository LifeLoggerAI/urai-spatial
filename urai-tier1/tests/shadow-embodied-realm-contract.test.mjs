import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const shadow = fs.readFileSync(new URL('../src/components/spatial/shadow-realm-portal.tsx', import.meta.url), 'utf8')

test('Shadow is an embodied bounded reflective realm rather than a portal card', () => {
  assert.match(shadow, /data-testid="urai-shadow-embodied-realm"/)
  assert.match(shadow, /<Canvas/)
  assert.match(shadow, /CAMERA_HEIGHT = 1\.68/)
  assert.match(shadow, /SHADOW_BOUNDS/)
  assert.match(shadow, /stepEmbodiedMotion/)
  assert.match(shadow, /MobileMovementPad/)
  assert.match(shadow, /MovementHelp/)
  assert.match(shadow, /shadow-stable-return-landmark/)
  assert.match(shadow, /data-shadow-horror="false"/)
})

test('Shadow preserves PTSD TBI-safe and truth-bounded presentation', () => {
  assert.match(shadow, /Uncertainty without threat\./)
  assert.match(shadow, /does not diagnose you, grade danger, or force a conclusion/i)
  assert.doesNotMatch(shadow, /Severity index/i)
  assert.doesNotMatch(shadow, /jump scare|monster|whisper/i)
  assert.match(shadow, /reduced-stimulation/)
  assert.match(shadow, /useReducedMotion/)
})

test('Shadow has reversible navigation and a semantic no-WebGL fallback', () => {
  assert.match(shadow, /requestUraiWorldReturn\(\)/)
  assert.match(shadow, /destination: 'life-map'/)
  assert.match(shadow, /data-testid="urai-shadow-semantic-fallback"/)
  assert.match(shadow, /Return to Life Map/)
  assert.match(shadow, /Return Home/)
})
