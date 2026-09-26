import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const home = source.slice(source.indexOf('export function HomeWorldProductionV223'))

test('Home renderer honors the same governed quality profile as its scene effects', () => {
  assert.match(home, /const quality = useAdaptiveSpatialQuality\(softwareRenderer\)/)
  const canvas = home.slice(home.indexOf('<Canvas'), home.indexOf('<Scene'))
  assert.match(canvas, /shadows=\{quality\.shadows\}/)
  assert.match(canvas, /antialias: quality\.antialias/)
  // Preserve camera framing, material/light setup, and demand-render behavior.
  assert.match(canvas, /dpr=\{1\}/)
  assert.match(canvas, /frameloop=\{!sceneReady \? 'never' : reducedMotion \|\| softwareRenderer \? 'demand' : 'always'\}/)
  assert.match(canvas, /fov: 58, near: \.1, far: 125/)
  assert.match(canvas, /gl\.shadowMap\.type = THREE\.PCFSoftShadowMap/)
})
