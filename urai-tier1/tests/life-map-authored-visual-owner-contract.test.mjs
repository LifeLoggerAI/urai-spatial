import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const canonical = fs.readFileSync('src/spatial/lifemap/SpatialLifeMapCanonical.tsx', 'utf8')
const selected = fs.readFileSync('src/spatial/lifemap/LifeMapDeepLinkControls.tsx', 'utf8')
const globalProofCss = fs.readFileSync('src/app/continuous-spatial-proof-defects.css', 'utf8')

test('Life Map active owner is an authored memory universe rather than a black debug canvas', () => {
  for (const marker of [
    'data-life-map-active-visual="authored-memory-universe"',
    'data-life-map-visual-owner="authored-deep-field"',
    'LifeMapVisualSpine',
    'life-map-memory-window',
    'life-map-visual-spine__river',
    'assetCssStack(lifeMapAssets.primary)',
    'var(--life-map-authored-world)',
    'mix-blend-mode:screen',
    'background:transparent!important',
  ]) assert.ok(canonical.includes(marker), `missing authored Life Map visual marker: ${marker}`)

  assert.match(canonical, /VISUAL_MEMORIES[\s\S]*Relationship[\s\S]*Place[\s\S]*Turning point[\s\S]*Ritual[\s\S]*Recovery[\s\S]*Deep time/)
  assert.match(canonical, /@media\(max-width:760px\)/)
  assert.match(canonical, /@media\(prefers-reduced-motion:reduce\)/)
  assert.doesNotMatch(canonical, /zIndex:\s*60[\s\S]*opacity:\s*\.08/)
})

test('global proof CSS cannot cover the authored Life Map with the retired opaque owner', () => {
  const scopedOwner = /\[data-testid="urai-r3f-canonical-lifemap"\]\[data-life-map-active-visual="authored-memory-universe"\][\s\S]*?\[data-testid="urai-true-3d-life-map"\][\s\S]*?background:\s*transparent\s*!important/
  assert.match(globalProofCss, scopedOwner)
  assert.match(globalProofCss, /\[data-life-map-active-visual="authored-memory-universe"\][\s\S]*?> div:has\(> canvas\)[\s\S]*?mix-blend-mode:\s*screen\s*!important/)
  assert.match(globalProofCss, /\[data-life-map-active-visual="authored-memory-universe"\][\s\S]*?canvas[\s\S]*?background:\s*transparent\s*!important[\s\S]*?mix-blend-mode:\s*screen\s*!important/)
  assert.match(globalProofCss, /\.life-map-visual-spine[\s\S]*?opacity:\s*1\s*!important[\s\S]*?visibility:\s*visible\s*!important/)
  assert.match(globalProofCss, /\.urai-lifemap-selected-visual[\s\S]*?z-index:\s*72\s*!important[\s\S]*?visibility:\s*visible\s*!important/)
})

test('selected memory becomes a visible cinematic surface without leaving controls open', () => {
  for (const marker of [
    'data-life-map-selected-visual="authored-memory-surface"',
    'data-selected-memory-panel="diegetic"',
    'urai-lifemap-selected-visual__frame',
    'Memory in focus',
    'Private cinematic surface · identity preserved',
    "document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')",
    "controls?.removeAttribute('open')",
  ]) assert.ok(selected.includes(marker), `missing selected-memory visual marker: ${marker}`)

  assert.match(selected, /Enter Focus/)
  assert.match(selected, /Replay/)
  assert.doesNotMatch(selected, /Orb companion|PersistentWorldCompanion|home orb/i)
})
