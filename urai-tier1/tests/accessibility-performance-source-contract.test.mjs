import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const finalHome = await readFile(new URL('../src/app/FinalHomeWorld.tsx', import.meta.url), 'utf8')
const runtime = await readFile(new URL('../src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')
const parallaxBridge = await readFile(new URL('../src/app/HomeParallaxTelemetryBridge.tsx', import.meta.url), 'utf8')
const embodiedEvidence = await readFile(new URL('./accessibility-performance-embodied-exploration.spec.ts', import.meta.url), 'utf8')

test('canonical Home physical owners remain on their actual rendered interactive groups', () => {
  assert.match(finalHome, /data-testid="urai-home-webgl-orb"[\s\S]*name="home-final-orb-physical-anchor"/)
  assert.doesNotMatch(finalHome, /name="home-authored-orb"/)
  assert.match(finalHome, /data-testid="urai-home-walkable-surface"/)
  assert.match(finalHome, /data-testid="urai-home-embodied-avatar"/)
})

test('Home parallax remains derived from real movement telemetry without observing its own style writes', () => {
  assert.match(parallaxBridge, /const playerX = Number\.parseFloat\(home\.dataset\.homePlayerX/)
  assert.match(parallaxBridge, /const playerZ = Number\.parseFloat\(home\.dataset\.homePlayerZ/)
  assert.match(parallaxBridge, /const distance = Number\.parseFloat\(home\.dataset\.homeDistance/)
  assert.match(parallaxBridge, /home\.style\.setProperty\('--home-parallax-y', parallaxY\)/)
  assert.match(parallaxBridge, /attributeFilter: \['data-home-player-x', 'data-home-player-z', 'data-home-distance'\]/)
  assert.doesNotMatch(parallaxBridge, /attributeFilter:[^\n]*style/)
  assert.match(runtime, /<HomeParallaxTelemetryBridge \/>/)
})

test('accessibility evidence proves numeric nonzero parallax from the real telemetry owner', () => {
  assert.match(embodiedEvidence, /element\.style\.getPropertyValue\('--home-parallax-y'\)/)
  assert.match(embodiedEvidence, /Math\.abs\(Number\.parseFloat\(value\)\)/)
  assert.match(embodiedEvidence, /toBeGreaterThan\(0\.1\)/)
  assert.doesNotMatch(embodiedEvidence, /\.not\.toBe\('0\.0px'\)/)
})
