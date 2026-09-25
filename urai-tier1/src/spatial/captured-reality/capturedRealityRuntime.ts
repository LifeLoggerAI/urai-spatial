export type CapturedRealityDeviceTier = 'mobile' | 'desktop' | 'xr'

export type CapturedRealityQualityProfile = {
  tier: CapturedRealityDeviceTier
  maxRuntimeBytes: number
  targetFps: number
  chunkSize: number
  alphaHash: boolean
  reducedMotionCameraDriftAllowed: false
}

const MiB = 1024 * 1024

export const CAPTURED_REALITY_QUALITY_PROFILES: Record<CapturedRealityDeviceTier, CapturedRealityQualityProfile> = {
  mobile: {
    tier: 'mobile',
    maxRuntimeBytes: 64 * MiB,
    targetFps: 30,
    chunkSize: 16_000,
    alphaHash: true,
    reducedMotionCameraDriftAllowed: false,
  },
  desktop: {
    tier: 'desktop',
    maxRuntimeBytes: 160 * MiB,
    targetFps: 45,
    chunkSize: 25_000,
    alphaHash: true,
    reducedMotionCameraDriftAllowed: false,
  },
  xr: {
    tier: 'xr',
    maxRuntimeBytes: 96 * MiB,
    targetFps: 72,
    chunkSize: 16_000,
    alphaHash: true,
    reducedMotionCameraDriftAllowed: false,
  },
}

export type CapturedRealityPerformanceReceipt = {
  tier: CapturedRealityDeviceTier
  runtimeBytes: number
  sustainedFps: number
  sampleSeconds: number
  firstVisibleMs?: number
  peakGpuMemoryMb?: number
  peakCpuMemoryMb?: number
  deviceLabel: string
  measuredAt: string
}

export function capturedRealityDeviceTier(userAgent: string): 'mobile' | 'desktop' {
  return /Android|iPhone|iPad|Mobile/i.test(userAgent) ? 'mobile' : 'desktop'
}

export function validateCapturedRealityPerformanceReceipt(receipt: CapturedRealityPerformanceReceipt) {
  const errors: string[] = []
  const profile = CAPTURED_REALITY_QUALITY_PROFILES[receipt.tier]
  if (receipt.runtimeBytes <= 0) errors.push('RUNTIME_BYTES_REQUIRED')
  if (receipt.runtimeBytes > profile.maxRuntimeBytes) errors.push('RUNTIME_ASSET_OVER_BUDGET')
  if (receipt.sustainedFps < profile.targetFps) errors.push('SUSTAINED_FPS_BELOW_BUDGET')
  if (receipt.sampleSeconds < 30) errors.push('PERFORMANCE_SAMPLE_TOO_SHORT')
  if (!receipt.deviceLabel.trim()) errors.push('DEVICE_LABEL_REQUIRED')
  if (!Number.isFinite(Date.parse(receipt.measuredAt))) errors.push('MEASURED_AT_REQUIRED')
  return errors
}

export function capturedRealityBrowserCapability(args: {
  webgl2: boolean
  webWorker: boolean
  readableStream: boolean
  contentLengthAvailable: boolean
}) {
  const missing: string[] = []
  if (!args.webgl2) missing.push('WEBGL2_UNAVAILABLE')
  if (!args.webWorker) missing.push('WEB_WORKER_UNAVAILABLE')
  if (!args.readableStream) missing.push('READABLE_STREAM_UNAVAILABLE')
  if (!args.contentLengthAvailable) missing.push('CONTENT_LENGTH_REQUIRED_FOR_STREAMING_SPLAT')
  return { supported: missing.length === 0, missing }
}

export function capturedRealityLaunchCertification(args: {
  qaAccepted: boolean
  truthAndConsentPassed: boolean
  desktopReceipt?: CapturedRealityPerformanceReceipt
  mobileReceipt?: CapturedRealityPerformanceReceipt
  xrReceipt?: CapturedRealityPerformanceReceipt
}) {
  const desktopErrors = args.desktopReceipt ? validateCapturedRealityPerformanceReceipt(args.desktopReceipt) : ['DESKTOP_RECEIPT_MISSING']
  const mobileErrors = args.mobileReceipt ? validateCapturedRealityPerformanceReceipt(args.mobileReceipt) : ['MOBILE_RECEIPT_MISSING']
  const xrErrors = args.xrReceipt ? validateCapturedRealityPerformanceReceipt(args.xrReceipt) : ['XR_DEVICE_RECEIPT_MISSING']

  return {
    browserReady: args.qaAccepted && args.truthAndConsentPassed && desktopErrors.length === 0,
    mobileReady: args.qaAccepted && args.truthAndConsentPassed && mobileErrors.length === 0,
    xrReady: args.qaAccepted && args.truthAndConsentPassed && xrErrors.length === 0,
    desktopErrors,
    mobileErrors,
    xrErrors,
  }
}
