import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const appFile = (path) => fs.readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8')

test('app template loads the bounded Home composition correction', () => {
  const template = appFile('template.tsx')
  assert.match(template, /import '\.\/home-provider-preview-composition\.css'/)
})

test('fine-pointer desktop omits the touch-only pad while mounting functional accessible keyboard controls', () => {
  const css = appFile('home-provider-preview-composition.css')
  const template = appFile('template.tsx')
  const controls = appFile('HomeAccessibleMovementControls.tsx')
  assert.match(css, /@media \(min-width: 901px\) and \(pointer: fine\)/)
  assert.match(css, /> \.home-movement-prompt,[\s\S]*\.urai-mobile-movement \{[\s\S]*display: none !important;/)
  assert.match(template, /<HomeAccessibleMovementControls \/>/)
  assert.match(controls, /aria-label="Home movement controls"/)
  assert.match(controls, /aria-label="Move forward"/)
  assert.match(controls, /aria-label="Move left"/)
  assert.match(controls, /aria-label="Move backward"/)
  assert.match(controls, /aria-label="Move right"/)
  assert.match(controls, /onKeyDown/)
  assert.match(controls, /onKeyUp/)
  assert.match(controls, /event\.key !== 'Enter' && event\.key !== ' '/)
  assert.match(controls, /window\.addEventListener\('blur', releaseActive\)/)
  assert.match(controls, /document\.addEventListener\('visibilitychange', releaseWhenHidden\)/)
})

test('desktop composition expands then scales the canvas without leaving uncovered edges', () => {
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
  assert.match(css, /\.home-audio:disabled \{[\s\S]*display: inline-flex !important;/)
  assert.match(css, /cursor: not-allowed;/)
})

test('composition correction keeps reduced-motion transitions disabled', () => {
  const css = appFile('home-provider-preview-composition.css')
  const controls = appFile('HomeAccessibleMovementControls.tsx')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /transition: none !important;/)
  assert.match(controls, /@media\(prefers-reduced-motion:reduce\)/)
})
