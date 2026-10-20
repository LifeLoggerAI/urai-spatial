import assert from 'node:assert/strict'
import test from 'node:test'
import { isSoftwareWebGLRenderer, detectSoftwareWebGLRenderer, softwareWebGLPixelRatioForViewport } from '../src/spatial/performance/softwareWebGLRenderer.ts'
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


test('CPU-only Replay raster workload is bounded at 2560 by 1440 while normal viewports remain unchanged', () => {
  assert.equal(softwareWebGLPixelRatioForViewport(1440, 900), 1)
  assert.equal(softwareWebGLPixelRatioForViewport(390, 844), 1)
  const wide = softwareWebGLPixelRatioForViewport(2560, 1440)
  assert.ok(wide > 0.59 && wide < 0.60)
  assert.ok(2560 * 1440 * wide * wide <= 1440 * 900 + 1)
  assert.equal(softwareWebGLPixelRatioForViewport(0, 1440), 1)
  assert.equal(softwareWebGLPixelRatioForViewport(Infinity, 900), 1)
  const quality = fs.readFileSync(new URL('../src/spatial/performance/useAdaptiveSpatialQuality.ts', import.meta.url), 'utf8')
  const replay = fs.readFileSync(new URL('../src/app/replay/CinematicReplayClient.tsx', import.meta.url), 'utf8')
  assert.match(quality, /softwareRenderer\s*\? softwareWebGLPixelRatioForViewport/)
  assert.equal(replay.split('dpr={[Math.min(1, quality.pixelRatioMax), quality.pixelRatioMax]}').length - 1, 2)
})
