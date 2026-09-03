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
  assert.match(runtime, /camera=\{\{ position: \[SPAWN\.x, 1\.60, SPAWN\.z\], fov: 44/)
  assert.match(styles, /\.canvas/)
})

test('V93 removes the flat backdrop and retains dimensional governed and PBR architecture', () => {
  assert.doesNotMatch(art, /SANCTUARY_BACKDROP|scene\.userData\.sanctuaryBackdrop/)
  assert.match(art, /home-v93-dimensional-sanctuary-architecture/)
  assert.match(art, /<VaultShell textures=\{textures\.shell\}/)
  assert.match(art, /<DeepApse textures=\{textures\.shell\}/)
  assert.match(art, /<primitive object=\{environment\}/)
  assert.match(art, /portraitCompositionRevision: 'v93-single-responsive-three-dimensional-scene'/)
})
