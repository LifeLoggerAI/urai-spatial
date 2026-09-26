import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(new URL('../src/spatial/layout/HomeWorldProductionV223.tsx', import.meta.url), 'utf8')
const home = source.slice(source.indexOf('export function HomeWorldProductionV223'))

test('Home renderer honors the same governed quality profile as its scene effects', () => {
  assert.match(home, /const quality = useAdaptiveSpatialQuality\(\)/)
  const canvas = home.slice(home.indexOf('<Canvas'), home.indexOf('<Scene'))
  assert.match(canvas, /shadows=\{quality\.shadows\}/)
  assert.match(canvas, /antialias: quality\.antialias/)
  // Preserve camera framing, material/light setup, and demand-render behavior.
  assert.match(canvas, /dpr=\{1\}/)
  assert.match(canvas, /frameloop=\{!sceneReady \? 'never' : reducedMotion \|\| softwareRenderer \? 'demand' : 'always'\}/)
  assert.match(canvas, /fov: 58, near: \.1, far: 125/)
  assert.match(canvas, /gl\.shadowMap\.type = THREE\.PCFSoftShadowMap/)
})

test('shader preparation reports success, exposes failure and suppresses completion after unmount', async () => {
  const ast = ts.createSourceFile('home.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const declaration = ast.statements.find((node) => node.name?.text === 'SceneAssetReadySignal').getText(ast)
  const compiled = ts.transpileModule(declaration + '\nmodule.exports = SceneAssetReadySignal', { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  for (const outcome of ['ready', 'failed', 'cancelled-ready', 'cancelled-failed']) {
    let resolve, reject, cleanup, ready = 0, failure = 0
    const compilation = new Promise((yes, no) => { resolve = yes; reject = no })
    const canvas = new EventTarget()
    canvas.addEventListener('urai:home-renderer-failed', (event) => { failure++; assert.equal(event.bubbles, true) })
    const scope = { module: { exports: {} }, Event, console: { error() {} },
      useThree: () => ({ gl: { compileAsync: () => compilation, domElement: canvas }, scene: {}, camera: {} }),
      useEffect: (effect) => { cleanup = effect() },
    }
    vm.runInNewContext(compiled, scope)
    scope.module.exports({ onReady: () => ready++ })
    if (outcome.startsWith('cancelled')) cleanup()
    if (outcome.endsWith('ready')) resolve(); else reject(new Error('synthetic shader failure'))
    await new Promise((done) => setImmediate(done))
    assert.equal(ready, outcome === 'ready' ? 1 : 0)
    assert.equal(failure, outcome === 'failed' ? 1 : 0)
    cleanup()
  }
  const runtime = fs.readFileSync(new URL('../src/app/HomeSpatialRuntimeLayer.tsx', import.meta.url), 'utf8')
  assert.match(runtime, /onRendererFailed = \(\) => commitRendererState\('failed'\)/)
  assert.match(runtime, /root\.addEventListener\('urai:home-renderer-failed', onRendererFailed\)/)
  assert.match(runtime, /root\.removeEventListener\('urai:home-renderer-failed', onRendererFailed\)/)
})
