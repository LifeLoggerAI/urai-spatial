import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V105 uses one opaque responsive Canvas with balanced portrait hierarchy', () => {
  assert.doesNotMatch(runtime, /backgroundImage:/)
  assert.match(runtime, /data-home-desktop-mobile-world="same-scene"/)
  assert.match(runtime, /alpha: false/)
  assert.match(runtime, /gl\.setClearColor\(0x080b0b, 1\)/)
  assert.match(runtime, /camera=\{\{ position: \[SPAWN\.x, 1\.60, SPAWN\.z\], fov: 42/)
  assert.match(runtime, /const fov = portrait \? 58 : 42/)
  assert.doesNotMatch(runtime, /const fov = portrait \? 86 : 42/)
  assert.match(styles, /\.canvas/)
})

test('V105 retains open dimensional architecture without slab-shaped rear shoulders', () => {
  assert.doesNotMatch(art, /SANCTUARY_BACKDROP|scene\.userData\.sanctuaryBackdrop/)
  assert.match(art, /home-v98-open-canyon-sanctuary-architecture/)
  assert.match(art, /<OpenAtmosphere \/>/)
  assert.match(art, /<TerracedGround textures=\{textures\.floor\}/)
  const liveBackdrop = art.slice(art.indexOf('function SanctuaryBackdrop'), art.indexOf('function GovernedHomeEnvironment'))
  assert.match(liveBackdrop, /home-v122-retired-procedural-shells/)
  assert.match(liveBackdrop, /home-v101-port-apse-foundation/)
  assert.match(liveBackdrop, /home-v101-starboard-apse-foundation/)
  assert.doesNotMatch(liveBackdrop, /<VaultShell|<CantedWall|<DeepApse|<BearingRib/)
  assert.match(art, /successorVisualRepair: 'v122-remove-repetitive-procedural-shell-dominance'/)
  assert.match(art, /home-v101-distant-ridge/)
  assert.match(art, /home-v98-\$\{destination\}-single-connected-rock-cut-frame/)
  assert.match(art, /<primitive object=\{environment\}/)
  assert.match(art, /portraitCompositionRevision: 'v93-single-responsive-three-dimensional-scene'/)
  assert.match(art, /successorPortraitRepair: 'v105-balanced-58-degree-portrait-fov'/)
})
