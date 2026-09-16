import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const appFile = (path) => fs.readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8')

test('app template loads the bounded Home composition correction', () => {
  const template = appFile('template.tsx')
  assert.match(template, /import '\.\/home-provider-preview-composition\.css'/)
})

test('cinematic Home does not mount the retired locomotion pad or parallax movement bridge', () => {
  const template = appFile('template.tsx')
  const runtime = appFile('HomeSpatialRuntimeLayer.tsx')
  assert.doesNotMatch(template, /HomeAccessibleMovementControls|HomeParallaxTelemetryBridge/)
  assert.match(template, /<HomeSpatialRuntimeLayer \/>/)
  assert.match(runtime, /aria-label="Accessible Home destinations"/)
  assert.match(runtime, /aria-label="Open Ground directly"/)
  assert.match(runtime, /aria-label="Open Life Map directly"/)
  assert.match(runtime, /aria-label="Open URAI Orb companion"/)
})

test('desktop composition retains covered canvas edges and a bounded viewport', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /width: 112% !important;/)
  assert.match(css, /height: 112% !important;/)
  assert.match(css, /left: -6% !important;/)
  assert.match(css, /top: -6% !important;/)
  assert.match(css, /transform: scale\(0\.9\);/)
  assert.match(css, /transform-origin: 50% 54%;/)
})

test('desktop provenance and unavailable ambience controls remain accessible but visually discreet', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /\.home-discreet-controls \{[\s\S]*opacity: 0\.22 !important;/)
  assert.match(css, /\.home-discreet-controls:hover,[\s\S]*\.home-discreet-controls:focus-within \{[\s\S]*opacity: 0\.84 !important;/)
  assert.doesNotMatch(css, /\.home-discreet-controls \{[\s\S]*display: none !important;/)
  assert.match(css, /cursor: not-allowed;/)
})

test('composition correction keeps reduced-motion transitions disabled', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /transition: none !important;/)
})
