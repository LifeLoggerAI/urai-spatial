import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import {
  CAPTURED_REALITY_QUALITY_PROFILES,
  capturedRealityBrowserCapability,
  capturedRealityLaunchCertification,
  validateCapturedRealityPerformanceReceipt,
} from '../src/spatial/captured-reality/capturedRealityRuntime.ts'

const shell = fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealityPrivateScene.tsx', import.meta.url), 'utf8')
const adapter = fs.readFileSync(new URL('../src/spatial/captured-reality/CapturedRealitySplat.tsx', import.meta.url), 'utf8')

test('browser launch budgets are explicit and mobile is more constrained than desktop', () => {
  assert.equal(CAPTURED_REALITY_QUALITY_PROFILES.mobile.targetFps, 30)
  assert.equal(CAPTURED_REALITY_QUALITY_PROFILES.desktop.targetFps, 45)
  assert.ok(CAPTURED_REALITY_QUALITY_PROFILES.mobile.maxRuntimeBytes < CAPTURED_REALITY_QUALITY_PROFILES.desktop.maxRuntimeBytes)
})

test('performance receipts need sustained sample duration and stay under byte/fps budgets', () => {
  const errors = validateCapturedRealityPerformanceReceipt({
    tier: 'mobile',
    runtimeBytes: CAPTURED_REALITY_QUALITY_PROFILES.mobile.maxRuntimeBytes + 1,
    sustainedFps: 20,
    sampleSeconds: 5,
    deviceLabel: 'representative-mobile',
    measuredAt: '2026-09-25T00:00:00Z',
  })
  assert.ok(errors.includes('RUNTIME_ASSET_OVER_BUDGET'))
  assert.ok(errors.includes('SUSTAINED_FPS_BELOW_BUDGET'))
  assert.ok(errors.includes('PERFORMANCE_SAMPLE_TOO_SHORT'))
})

test('Drei streaming prerequisites fail closed when Content-Length or WebGL2 is unavailable', () => {
  const capability = capturedRealityBrowserCapability({
    webgl2: false,
    webWorker: true,
    readableStream: true,
    contentLengthAvailable: false,
  })
  assert.equal(capability.supported, false)
  assert.ok(capability.missing.includes('WEBGL2_UNAVAILABLE'))
  assert.ok(capability.missing.includes('CONTENT_LENGTH_REQUIRED_FOR_STREAMING_SPLAT'))
})

test('untrusted receipt tiers and optional measurements fail closed', () => {
  const receipt = { tier: 'desktop', runtimeBytes: 32, sustainedFps: 60, sampleSeconds: 60, deviceLabel: 'unit fixture', measuredAt: '2026-09-25T00:00:00Z' }
  for (const tier of ['constructor', 'toString', '__proto__', 'unknown']) assert.deepEqual(validateCapturedRealityPerformanceReceipt({ ...receipt, tier }), ['DEVICE_TIER_INVALID'])
  assert.deepEqual(validateCapturedRealityPerformanceReceipt(null), ['DEVICE_TIER_INVALID'])
  for (const field of ['firstVisibleMs', 'peakGpuMemoryMb', 'peakCpuMemoryMb']) {
    for (const value of [NaN, Infinity, -1]) assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, [field]: value }).includes('OPTIONAL_MEASUREMENT_INVALID'))
  }
})

test('XR never inherits browser readiness without a physical-device receipt', () => {
  const desktop = {
    tier: 'desktop',
    runtimeBytes: 32 * 1024 * 1024,
    sustainedFps: 60,
    sampleSeconds: 60,
    deviceLabel: 'desktop-proof',
    measuredAt: '2026-09-25T00:00:00Z',
  }
  const result = capturedRealityLaunchCertification({ qaAccepted: true, truthAndConsentPassed: true, desktopReceipt: desktop })
  assert.equal(result.browserReady, true)
  assert.equal(result.mobileReady, false)
  assert.equal(result.xrReady, false)
  assert.ok(result.xrErrors.includes('XR_DEVICE_RECEIPT_MISSING'))
})

test('private scene always exposes exit, truth, provenance and non-spatial accessibility copy', () => {
  assert.match(shell, /Exit captured place/)
  assert.match(shell, /View source and provenance/)
  assert.match(shell, /decision\.truthLabel/)
  assert.match(shell, /non-spatial memory surfaces/)
  assert.match(shell, /UrAi will not invent missing autobiographical geometry/)
})

test('renderer adapter accepts only authorized decision URL and bounded stream tuning', () => {
  assert.match(adapter, /decision\.mode !== 'gaussian-splat'/)
  assert.match(adapter, /chunkSize/)
  assert.match(adapter, /alphaHash/)
  assert.match(adapter, /<OwnedCapturedRealitySplat src=\{decision\.assetUrl\}/)
})
