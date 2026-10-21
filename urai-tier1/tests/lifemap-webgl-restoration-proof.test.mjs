import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// Contract-level safety test. This does NOT replace browser/WebGL pixel proof.
const scene = readFileSync(new URL('../src/components/lifemap/ComposedLifeMapScene.tsx', import.meta.url), 'utf8')
const start = scene.indexOf('function WebGLRecoveryBridge(')
const end = scene.indexOf('function isSoftwareWebGLRenderer(', start)
assert.ok(start > 0 && end > start)
const recovery = scene.slice(start, end)

test('initial mount and restored contexts share a real world-frame acceptance path', () => {
  assert.match(recovery, /const watchForWorldFrame = \(invalidatePreviousProof: boolean\) =>/)
  assert.match(recovery, /onStateChange\("recovering"\)/)
  assert.match(recovery, /const restored = \(\) => watchForWorldFrame\(true\)/)
  assert.match(recovery, /watchForWorldFrame\(true\)/)
  assert.doesNotMatch(recovery, /canvas\.addEventListener\("webglcontextrestored", restored, false\);\s*onStateChange\("ready"\)/)
})

test('lost context denies readiness and restored context invalidates stale frames', () => {
  assert.match(recovery, /clearFrameProofObserver\(\);\s*onStateChange\("lost"\)/)
  assert.match(recovery, /if \(invalidatePreviousProof\) owner\.dataset\.lifeMapRenderReady = "false"/)
  assert.match(recovery, /gl\.getContext\(\)\.isContextLost\(\)/)
  assert.match(recovery, /owner\.dataset\.lifeMapRenderReady !== "true"/)
})

test('observer installs before rechecking first-mount proof and cleans up', () => {
  assert.match(recovery, /new MutationObserver\(acceptFreshFrame\)/)
  assert.match(recovery, /attributeFilter: \["data-life-map-render-ready"\]/)
  assert.match(recovery, /frameProofObserver\.observe\(owner,[^;]+;\s*\/\/ On first mount,[\s\S]*?acceptFreshFrame\(\)/)
  assert.match(recovery, /frameProofObserver\?\.disconnect\(\)/)
  assert.match(recovery, /canvas\.removeEventListener\("webglcontextlost", lost, false\)/)
  assert.match(recovery, /canvas\.removeEventListener\("webglcontextrestored", restored, false\)/)
})

test('semantic recovery actions remain available without changing owner boundaries', () => {
  assert.match(scene, /const recovery = webglState !== "ready"/)
  assert.match(scene, /<button onClick=\{overview\}>Open semantic overview<\/button>/)
  assert.match(scene, /<button onClick=\{returnHome\}>Return Home<\/button>/)
})

test('initial mount invalidates stale inherited world-frame proof', () => {
  assert.doesNotMatch(recovery, /watchForWorldFrame\(false\)/)
  assert.match(recovery, /watchForWorldFrame\(true\)/)
})

test('newly mounted Life Map starts safely in recovery rather than displaying an unproven canvas', () => {
  assert.match(scene, /const \\[webglState, setWebglState\\] = useState<WebGLState>\\("recovering"\\)/)
})
