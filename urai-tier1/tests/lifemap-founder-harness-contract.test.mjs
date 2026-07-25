import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const runner = await readFile(new URL('../../scripts/run-lifemap-founder-proof-fixed.mjs', import.meta.url), 'utf8')
const capture = await readFile(new URL('../../scripts/capture-lifemap-founder-proof.mjs', import.meta.url), 'utf8')
const scene = await readFile(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const navigator = await readFile(new URL('../src/components/lifemap/LifeMapSemanticNavigator.tsx', import.meta.url), 'utf8')

test('Founder harness owns stable semantic interaction surfaces without literal journey matching', () => {
  assert.doesNotMatch(runner, /journeyPattern|deterministic phase block not found|source\.replace\(\s*\/.*selectQuietReset/s)
  for (const owner of ['openPage', 'selectQuietReset', 'clickRouteAction', 'canvasSignal', 'desktopJourney', 'mobileAndReduced', 'assertVisualSanity']) {
    assert.match(runner, new RegExp(`replaceFunction\\('${owner}'`))
    assert.match(capture, new RegExp(`(?:async )?function ${owner}\\(`))
  }
  assert.match(runner, /\[data-life-map-navigator\]/)
  assert.match(runner, /role="listitem"/)
  assert.match(runner, /selectedAction\(page, 'Overview'\)/)
  assert.match(runner, /page\.keyboard\.press\('Enter'\)/)
  assert.match(runner, /result\.tap\(\)/)
})

test('Founder harness preserves the exact distributed WebGL acceptance method', () => {
  assert.match(runner, /const columns = 24/)
  assert.match(runner, /const rows = 16/)
  assert.match(runner, /const block = 3/)
  assert.match(runner, /sampleCount !== 3456/)
  assert.match(runner, /variance < 8/)
  assert.match(runner, /distributed-grid-24x16-3x3/)
})

test('Founder proof exercises the real production state machine and no production proof backdoor exists', () => {
  assert.match(scene, /setPhase\("departure"\)/)
  assert.match(scene, /setPhase\("travel"\)/)
  assert.match(scene, /setPhase\("approach"\)/)
  assert.match(scene, /setPhase\("arrival"\)/)
  assert.match(scene, /data-life-map-phase=\{phase\}/)
  assert.match(navigator, /data-life-map-navigator/)
  assert.match(navigator, /role="listitem"/)
  assert.doesNotMatch(scene, /URAI_FOUNDER|founderProof|proofPhase|__uraiFounderPhase/)
  assert.doesNotMatch(navigator, /URAI_FOUNDER|founderProof|proofPhase|__uraiFounderPhase/)
})
