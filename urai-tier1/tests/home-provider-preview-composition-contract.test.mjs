import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const appFile = (path) => fs.readFileSync(new URL(`../src/app/${path}`, import.meta.url), 'utf8')

test('app template loads the bounded Home composition correction', () => {
  const template = appFile('template.tsx')
  assert.match(template, /import '\.\/home-provider-preview-composition\.css'/)
})

test('fine-pointer desktop omits mobile and permanent proof controls', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /@media \(min-width: 901px\) and \(pointer: fine\)/)
  assert.match(css, /> \.home-movement-prompt,[\s\S]*\.urai-mobile-movement \{[\s\S]*display: none !important;/)
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

test('desktop provenance controls are non-dominant and unavailable ambience is absent', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /\.home-discreet-controls \{[\s\S]*opacity: 0\.22 !important;/)
  assert.match(css, /\.home-audio:disabled \{[\s\S]*display: none !important;/)
})

test('composition correction keeps reduced-motion transitions disabled', () => {
  const css = appFile('home-provider-preview-composition.css')
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/)
  assert.match(css, /transition: none !important;/)
})
