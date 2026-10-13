import assert from 'node:assert/strict'
import test from 'node:test'
import { isSoftwareWebGLRenderer, detectSoftwareWebGLRenderer } from '../src/spatial/performance/softwareWebGLRenderer.ts'
import fs from 'node:fs'

test('software WebGL requires a positively identified software renderer', () => {
  assert.equal(isSoftwareWebGLRenderer('Google Inc. (Google)', 'ANGLE (Google, Vulkan SwiftShader Device (Subzero))'), true)
  assert.equal(isSoftwareWebGLRenderer('Mesa', 'llvmpipe (LLVM 19, 256 bits)'), true)
  assert.equal(isSoftwareWebGLRenderer('Microsoft', 'Microsoft Basic Render Driver'), true)
  assert.equal(isSoftwareWebGLRenderer('Mesa', 'softpipe'), true)
  assert.equal(isSoftwareWebGLRenderer('NVIDIA Corporation', 'NVIDIA GeForce RTX 5080'), false)
  assert.equal(isSoftwareWebGLRenderer('Apple', 'Apple M4'), false)
  assert.equal(isSoftwareWebGLRenderer(null, null), false)
  assert.equal(isSoftwareWebGLRenderer('WebKit', 'WebKit WebGL'), false)
})

test('server-side quality probing does not require browser globals', () => {
  assert.equal(detectSoftwareWebGLRenderer(), false)
})

test('software fallback does not weaken existing hardware performance budgets', () => {
  const source=fs.readFileSync(new URL('../src/spatial/performance/useAdaptiveSpatialQuality.ts',import.meta.url),'utf8')
  assert.match(source,/const softwareWebGL = detectSoftwareWebGLRenderer\(\)/)
  assert.match(source,/softwareWebGL \? 'low' : deriveTier\(motion.matches\)/)
  assert.match(source,/low: \{ pixelRatioMax: 1, particleCount: 120, shadows: false, postprocessing: false, antialias: false/)
  const budgets=fs.readFileSync(new URL('./accessibility-performance-metrics.spec.ts',import.meta.url),'utf8')
  assert.match(budgets,/DESKTOP_FRAME_P95_BUDGET_MS = 20/)
  assert.match(budgets,/MOBILE_FRAME_P95_BUDGET_MS = 33\.3/)
})
