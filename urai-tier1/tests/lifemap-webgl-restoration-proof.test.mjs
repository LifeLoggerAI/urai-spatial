import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Source-bound recovery lifecycle assertions. Real browser/WebGL pixel proof
// remains mandatory; these must not be counted as rendered visual acceptance.
const scene = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const start = scene.indexOf('function WebGLRecoveryBridge(')
const end = scene.indexOf('function isSoftwareWebGLRenderer(', start)
assert.ok(start > 0 && end > start)
const recovery = scene.slice(start, end)

test('restored context stays in recovery until actual authored frame readiness', () => {
  const restore = recovery.slice(recovery.indexOf('const restored = () =>'), recovery.indexOf('canvas.addEventListener("webglcontextlost"'))
  assert.match(restore, /onStateChange\("recovering"\)/)
  assert.match(restore, /owner\.dataset\.lifeMapRenderReady = "false"/)
  assert.match(restore, /owner\.dataset\.lifeMapRenderReady !== "true"/)
  assert.match(restore, /gl\.getContext\(\)\.isContextLost\(\)/)
  assert.match(restore, /new MutationObserver\(acceptFreshFrame\)/)
  assert.match(restore, /attributeFilter: \["data-life-map-render-ready"\]/)
  assert.ok(restore.indexOf('onStateChange("ready")') > restore.indexOf('owner.dataset.lifeMapRenderReady !== "true"'))
})

test('repeated loss and unmount disconnect stale frame observers', () => {
  assert.match(recovery, /const clearFrameProofObserver = \(\) =>/)
  assert.match(recovery, /frameProofObserver\?\.disconnect\(\)/)
  const lost = recovery.slice(recovery.indexOf('const lost ='), recovery.indexOf('const restored ='))
  assert.match(lost, /clearFrameProofObserver\(\)/)
  const cleanup = recovery.slice(recovery.indexOf('return () => {', recovery.indexOf('canvas.addEventListener')))
  assert.match(cleanup, /clearFrameProofObserver\(\)/)
  assert.match(cleanup, /canvas\.removeEventListener\("webglcontextlost"/)
  assert.match(cleanup, /canvas\.removeEventListener\("webglcontextrestored"/)
})

test('signed-out identity and semantic recovery remain unchanged', () => {
  assert.match(scene, /data-webgl-state=\{webglState\}/)
  assert.match(scene, /const recovery = webglState !== "ready"/)
  assert.match(scene, /\{recovery \? <section className="life-map-recovery"/)
  assert.match(scene, /<button onClick=\{overview\}>Open semantic overview<\/button>/)
  assert.match(scene, /<button onClick=\{returnHome\}>Return Home<\/button>/)
})
