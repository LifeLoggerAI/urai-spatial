import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/app/v2-onboarding.css', import.meta.url), 'utf8')
const guide = readFileSync(new URL('../src/app/UraiV2OnboardingLayer.tsx', import.meta.url), 'utf8')
const geometry = readFileSync(new URL('../src/spatial/layout/HomeSanctuaryGeometry.ts', import.meta.url), 'utf8')

test('automatic small-screen Home guide has a compact, two-action accessible layout', () => {
  assert.match(guide, /data-first-run=\{automaticFirstRun \? "automatic" : "guided"\}/)
  assert.match(guide, /data-home-guide=\{card === homeCard \? "true" : undefined\}/)
  assert.match(guide, /onClick=\{dismiss\}>Skip<\/button>/)
  assert.match(css, /@media \(max-width: 400px\) \{ \.uraiV2OnboardingActions \{ grid-template-columns: minmax\(0, 1fr\)/)
  assert.match(css, /\.uraiV2OnboardingCard\[data-home-guide='true'\]\[data-first-run='automatic'\] \.uraiV2OnboardingActions \{/)
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) minmax\(80px, \.62fr\)/)
  assert.match(css, /min-height: 48px/)
  assert.match(css, /html\[dir='rtl'\] \.uraiV2OnboardingCard\[data-home-guide='true'\]\[data-first-run='automatic'\]/)
})

test('Home keeps its original accessible full guided onboarding', () => {
  assert.match(guide, /aria-label=\{\x60\$\{card\.label\} first-run guide\x60\}/)
  assert.match(guide, /if \(dismissed \|\| !shouldShow \|\| !card\) return null/)
  assert.match(css, /\.uraiV2OnboardingCard a:focus-visible/)
  assert.match(css, /\.uraiV2OnboardingCard button:focus-visible/)
})

test('Home horizon retains three-dimensional meshes and varies its deterministic crest', () => {
  assert.match(geometry, /new THREE\.PlaneGeometry\(width, 18, segments, 12\)/)
  assert.match(geometry, /Math\.sin\(x \* \.051 \+ salt \* 1\.73\)/)
  assert.match(geometry, /Math\.cos\(x \* \.103 - salt \* \.81\)/)
  assert.match(geometry, /Math\.sin\(x \* \.201 \+ salt \* 2\.3\)/)
  assert.match(geometry, /position\.setY\(index, -\.85 \+ \(peak \+ erosion\) \* slope\)/)
  assert.match(geometry, /geometry\.computeVertexNormals\(\)/)
})
