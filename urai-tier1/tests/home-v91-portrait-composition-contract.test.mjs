import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const runtime = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV70.tsx', import.meta.url), 'utf8')
const art = readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV76.tsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../src/spatial/layout/HomeWorldProduction.module.css', import.meta.url), 'utf8')

test('V91 uses one aspect-correct sanctuary plate behind a transparent single Canvas', () => {
  assert.match(runtime, /backgroundImage: "url\('\/assets\/urai\/ground\/ground-world-main\.webp'\)"/)
  assert.match(runtime, /backgroundSize: 'cover'/)
  assert.match(runtime, /backgroundPosition: 'center'/)
  assert.match(runtime, /alpha: true/)
  assert.match(runtime, /gl\.setClearColor\(0x000000, 0\)/)
  assert.match(styles, /\.canvas[\s\S]*background: transparent/)
})

test('V91 prevents WebGL texture stretching while retaining the governed backdrop binding', () => {
  assert.match(art, /useTexture\(SANCTUARY_BACKDROP\)/)
  assert.match(art, /scene\.background = null/)
  assert.match(art, /scene\.userData\.sanctuaryBackdrop = SANCTUARY_BACKDROP/)
  assert.match(art, /portraitCompositionRevision: 'v91-aspect-correct-cover'/)
})
