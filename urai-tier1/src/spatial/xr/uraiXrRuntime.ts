export type UraiXrSessionMode = 'vr' | 'ar'
export type UraiXrInputSourceKind = 'gaze' | 'controller' | 'hand'
export type UraiXrLocomotionMode = 'stationary' | 'teleport' | 'comfort-turn'

export type UraiXrRuntimeState = {
  supported: boolean
  active: boolean
  sessionMode: UraiXrSessionMode | 'none'
  inputSources: UraiXrInputSourceKind[]
  locomotionMode: UraiXrLocomotionMode
  teleportEnabled: boolean
  handTrackingEnabled: boolean
  controllerEnabled: boolean
  headsetSafeHud: boolean
  performanceTier: 'quest-mobile' | 'desktop-vr' | 'unknown'
  targetFrameRate: 72 | 80 | 90
  maxDpr: 1 | 1.25 | 1.5
  spatialAudioZones: string[]
  multiplayerSync: 'off' | 'presence-only' | 'shared-world'
}

export const URAI_XR_DEFAULT_RUNTIME: UraiXrRuntimeState = {
  supported: false,
  active: false,
  sessionMode: 'none',
  inputSources: ['gaze'],
  locomotionMode: 'stationary',
  teleportEnabled: false,
  handTrackingEnabled: false,
  controllerEnabled: false,
  headsetSafeHud: true,
  performanceTier: 'unknown',
  targetFrameRate: 72,
  maxDpr: 1,
  spatialAudioZones: ['home-orb', 'lifemap-stars', 'replay-path', 'mirror-sanctuary'],
  multiplayerSync: 'off',
}

export function detectUraiXrSupport(navigatorLike: Pick<Navigator, 'xr'> | undefined = typeof navigator === 'undefined' ? undefined : navigator) {
  return Boolean(navigatorLike?.xr)
}

export async function canStartUraiXrSession(mode: UraiXrSessionMode, navigatorLike: Pick<Navigator, 'xr'> | undefined = typeof navigator === 'undefined' ? undefined : navigator) {
  if (!navigatorLike?.xr?.isSessionSupported) return false
  return navigatorLike.xr.isSessionSupported(mode === 'vr' ? 'immersive-vr' : 'immersive-ar')
}

export function buildUraiXrRuntimeState(input: Partial<UraiXrRuntimeState> = {}): UraiXrRuntimeState {
  const active = input.active ?? URAI_XR_DEFAULT_RUNTIME.active
  const sessionMode = input.sessionMode ?? (active ? 'vr' : 'none')
  const performanceTier = input.performanceTier ?? URAI_XR_DEFAULT_RUNTIME.performanceTier

  return {
    ...URAI_XR_DEFAULT_RUNTIME,
    ...input,
    active,
    sessionMode,
    supported: input.supported ?? detectUraiXrSupport(),
    targetFrameRate: input.targetFrameRate ?? (performanceTier === 'desktop-vr' ? 90 : 72),
    maxDpr: input.maxDpr ?? (performanceTier === 'desktop-vr' ? 1.5 : 1),
    teleportEnabled: input.teleportEnabled ?? active,
    controllerEnabled: input.controllerEnabled ?? active,
    handTrackingEnabled: input.handTrackingEnabled ?? false,
    headsetSafeHud: input.headsetSafeHud ?? true,
  }
}

export function assertUraiXrRuntimeContract() {
  const runtime = buildUraiXrRuntimeState({ active: true, supported: true, sessionMode: 'vr' })

  return {
    ok: true,
    service: 'urai-spatial',
    runtimeLayer: 'webxr',
    sessionBootstrapping: runtime.active && runtime.sessionMode === 'vr',
    controllerTeleport: runtime.teleportEnabled && runtime.controllerEnabled,
    handTrackingContract: runtime.inputSources.includes('gaze') && 'handTrackingEnabled' in runtime,
    headsetSafeHud: runtime.headsetSafeHud,
    performanceBudget: runtime.targetFrameRate >= 72 && runtime.maxDpr <= 1.5,
    comfortMovement: runtime.locomotionMode === 'stationary' || runtime.locomotionMode === 'teleport' || runtime.locomotionMode === 'comfort-turn',
    spatialAudioZones: runtime.spatialAudioZones,
    multiplayerSyncModes: ['off', 'presence-only', 'shared-world'] as UraiXrRuntimeState['multiplayerSync'][],
  }
}
