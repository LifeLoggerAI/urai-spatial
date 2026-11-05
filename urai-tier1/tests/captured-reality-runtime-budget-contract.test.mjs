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
  assert.equal(CAPTURED_REALITY_QUALITY_PROFILES.desktop.targetFps, 50)
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
    sustainedFps: 60, firstInteractiveMs: 1000, minimumFps: 50,
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

test('first interactive timing and the desktop route lower bound are required for certification', () => {
  const receipt = {
    tier: 'desktop', runtimeBytes: 32, sustainedFps: 60, sampleSeconds: 60,
    deviceLabel: 'synthetic control receipt', measuredAt: '2026-10-08T00:00:00Z',
    firstInteractiveMs: 12_000, minimumFps: 40,
  }
  assert.deepEqual(validateCapturedRealityPerformanceReceipt(receipt), [])
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, firstInteractiveMs: undefined }).includes('FIRST_INTERACTIVE_MEASUREMENT_REQUIRED'))
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, firstInteractiveMs: 12_001 }).includes('FIRST_INTERACTIVE_OVER_BUDGET'))
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, minimumFps: 39.99 }).includes('PRIMARY_ROUTE_MINIMUM_FPS_BELOW_BUDGET'))
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, minimumFps: undefined }).includes('PRIMARY_ROUTE_MINIMUM_FPS_BELOW_BUDGET'))
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, sustainedFps: 49.99 }).includes('SUSTAINED_FPS_BELOW_BUDGET'))
  assert.deepEqual(validateCapturedRealityPerformanceReceipt({ ...receipt, tier: 'mobile', sustainedFps: 30, firstInteractiveMs: 18_000 }), [])
  assert.ok(validateCapturedRealityPerformanceReceipt({ ...receipt, tier: 'mobile', firstInteractiveMs: 18_001 }).includes('FIRST_INTERACTIVE_OVER_BUDGET'))
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
