import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const home = source.slice(source.indexOf('export function HomeWorldProductionV223'))

test('Home renderer honors the same governed quality profile as its scene effects', () => {
  assert.match(home, /const quality = useAdaptiveSpatialQuality\(\)/)
  const canvas = home.slice(home.indexOf('<Canvas'), home.indexOf('<Scene'))
  const shadowExpression = canvas.match(/shadows=\{([^}]+)\}/)?.[1]
  const dprExpression = canvas.match(/dpr=\{([^}]+)\}/)?.[1]
  assert.ok(shadowExpression)
  assert.ok(dprExpression)
  for (const softwareRenderer of [false, true]) {
    for (const shadows of [false, true]) {
      const context = { quality: { shadows }, softwareRenderer, softwareDpr: 0.5 }
      assert.equal(vm.runInNewContext(shadowExpression, context), shadows && !softwareRenderer)
      assert.equal(vm.runInNewContext(dprExpression, context), softwareRenderer ? 0.5 : 1)
    }
  }
  assert.match(canvas, /antialias: quality\.antialias/)
  // Preserve camera framing, material/light setup, and demand-render behavior.
  // CPU fallback resolution is separately checked across actual viewport sizes.
  assert.match(canvas, /frameloop=\{!sceneReady \? 'never' : reducedMotion \|\| softwareRenderer \? 'demand' : 'always'\}/)
  assert.match(canvas, /fov: 58, near: \.1, far: 125/)
  assert.match(canvas, /gl\.shadowMap\.type = THREE\.PCFSoftShadowMap/)
})
