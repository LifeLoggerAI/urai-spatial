export type XrBetaGateInput = {
  flagEnabled: boolean
  secureContext: boolean
  hasNavigatorXr: boolean
  immersiveArSupported?: boolean
  immersiveVrSupported?: boolean
  consentGranted: boolean
  betaEntitled?: boolean
}

export type XrBetaGateStatus = 'disabled' | 'unsupported' | 'consent-required' | 'entitlement-required' | 'beta-ready'

export type XrBetaGateResult = {
  status: XrBetaGateStatus
  canRequestSession: boolean
  fallbackMode: 'spatial-web'
  reason: string
}

export function resolveXrFlag(env: Record<string, string | undefined> = process.env) {
  return env.NEXT_PUBLIC_SPATIAL_XR_ENABLED === 'true'
}

export function evaluateXrBetaGate(input: XrBetaGateInput): XrBetaGateResult {
  if (!input.flagEnabled) {
    return {
      status: 'disabled',
      canRequestSession: false,
      fallbackMode: 'spatial-web',
      reason: 'NEXT_PUBLIC_SPATIAL_XR_ENABLED is not enabled.',
    }
  }

  if (!input.secureContext) {
    return {
      status: 'unsupported',
      canRequestSession: false,
      fallbackMode: 'spatial-web',
      reason: 'XR requires a secure browser context.',
    }
  }

  if (!input.hasNavigatorXr || (!input.immersiveArSupported && !input.immersiveVrSupported)) {
    return {
      status: 'unsupported',
      canRequestSession: false,
      fallbackMode: 'spatial-web',
      reason: 'This browser or device does not expose a supported immersive XR session.',
    }
  }

  if (!input.consentGranted) {
    return {
      status: 'consent-required',
      canRequestSession: false,
      fallbackMode: 'spatial-web',
      reason: 'XR requires explicit session consent before requesting device capabilities.',
    }
  }

  if (input.betaEntitled === false) {
    return {
      status: 'entitlement-required',
      canRequestSession: false,
      fallbackMode: 'spatial-web',
      reason: 'XR is limited to the private beta entitlement group.',
    }
  }

  return {
    status: 'beta-ready',
    canRequestSession: true,
    fallbackMode: 'spatial-web',
    reason: 'XR beta gate is satisfied for this browser context.',
  }
}

export async function detectBrowserXrSupport(nav: Navigator | undefined = typeof navigator === 'undefined' ? undefined : navigator) {
  const xr = nav && 'xr' in nav ? (nav as Navigator & { xr?: { isSessionSupported?: (mode: 'immersive-ar' | 'immersive-vr') => Promise<boolean> } }).xr : undefined
  if (!xr?.isSessionSupported) {
    return { hasNavigatorXr: false, immersiveArSupported: false, immersiveVrSupported: false }
  }

  const [immersiveArSupported, immersiveVrSupported] = await Promise.all([
    xr.isSessionSupported('immersive-ar').catch(() => false),
    xr.isSessionSupported('immersive-vr').catch(() => false),
  ])

  return { hasNavigatorXr: true, immersiveArSupported, immersiveVrSupported }
}
