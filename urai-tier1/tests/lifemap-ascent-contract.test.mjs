import assert from 'node:assert/strict'
import { test } from 'node:test'
import fs from 'node:fs'

const gateSource = fs.readFileSync(new URL('../src/spatial/components/world/LifeMapAscentGate.tsx', import.meta.url), 'utf8')
const overlaySource = fs.readFileSync(new URL('../src/spatial/components/world/AscentOverlay.tsx', import.meta.url), 'utf8')
const pageSource = fs.readFileSync(new URL('../src/app/life-map/page.tsx', import.meta.url), 'utf8')
const compactGate = gateSource.replace(/\s+/g, '')


test('life map route is gated by the Ascent contract wrapper', () => {
  assert.match(pageSource, /LifeMapAscentGate/)
  assert.match(gateSource, /TierOneExperience/)
  assert.match(gateSource, /<TierOneExperience mode="life-map" \/>/)
  assert.match(gateSource, /<AscentOverlay/)
})

test('Ascent visual phase and data readiness are separate observables', () => {
  assert.match(overlaySource, /export type AscentPhase/)
  assert.match(overlaySource, /waitingForLifeMap/)
  assert.match(overlaySource, /export type LifeMapDataStatus/)
  assert.match(compactGate, /data-ascent-phase=\{ascentPhase\}/)
  assert.match(compactGate, /data-lifemap-data-status=\{lifeMapDataStatus\}/)
  assert.match(compactGate, /data-lifemap-interactive=\{lifeMapInteractive\?'true':'false'\}/)
})

test('Ascent copy avoids duplicate debug-style loading surfaces', () => {
  assert.doesNotMatch(overlaySource, /ASCENT ACTIVE/)
  assert.doesNotMatch(overlaySource, /Preparing your memory map/)
  assert.doesNotMatch(overlaySource, /home view/)
  assert.match(overlaySource, /Opening your Life Map\./)
  assert.match(overlaySource, /Memories are becoming constellations/)
})

test('Life Map is only interactive after visual phase and data readiness agree', () => {
  assert.match(compactGate, /ascentPhase==='lifemapReady'/)
  assert.match(compactGate, /dataIsReady\(lifeMapDataStatus\)/)
  assert.match(compactGate, /aria-busy=\{lifeMapInteractive\?'false':'true'\}/)
})

test('Ascent overlay has cinematic visual polish without changing state truth', () => {
  assert.match(overlaySource, /PHASE_INTENSITY/)
  assert.match(overlaySource, /buildParticles/)
  assert.match(overlaySource, /viewBox="0 0 100 100"/)
  assert.match(overlaySource, /radial-gradient\(circle at 35% 28%/)
  assert.match(overlaySource, /reducedMotion \? 0\.94 : 1/)
})
