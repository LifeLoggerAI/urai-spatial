import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V93 uses one opaque responsive Canvas for the same dimensional world on desktop and portrait', () => {
  assert.doesNotMatch(runtime, /backgroundImage:/)
  assert.match(runtime, /data-home-desktop-mobile-world="same-scene"/)
  assert.match(runtime, /alpha: false/)
  assert.match(runtime, /gl\.setClearColor\(0x080b0b, 1\)/)
  assert.match(runtime, /camera=\{\{ position: \[SPAWN\.x, 1\.60, SPAWN\.z\], fov: 42/)
  assert.match(runtime, /const fov = portrait \? 86 : 42/)
  assert.match(styles, /\.canvas/)
})

test('V98 removes the flat backdrop and retains open dimensional governed and PBR architecture', () => {
  assert.doesNotMatch(art, /SANCTUARY_BACKDROP|scene\.userData\.sanctuaryBackdrop/)
  assert.match(art, /home-v98-open-canyon-sanctuary-architecture/)
  assert.match(art, /<OpenAtmosphere \/>/)
  assert.match(art, /<TerracedGround textures=\{textures\.floor\}/)
  assert.match(art, /<VaultShell textures=\{textures\.shell\}/)
  assert.match(art, /<DeepApse textures=\{textures\.shell\}/)
  assert.match(art, /home-v98-distant-ridge/)
  assert.match(art, /home-v98-\$\{destination\}-single-connected-rock-cut-frame/)
  assert.match(art, /<primitive object=\{environment\}/)
  assert.match(art, /portraitCompositionRevision: 'v93-single-responsive-three-dimensional-scene'/)
})
