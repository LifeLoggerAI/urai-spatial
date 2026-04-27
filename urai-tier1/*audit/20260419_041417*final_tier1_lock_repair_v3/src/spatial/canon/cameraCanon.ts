import {
  TRANSITION_DURATIONS_MS,
  TRANSITION_LOCK_WINDOWS,
  resolveTransitionDuration,
  resolveTransitionLockWindow,
} from './transitionTimingCanon'

export type TransitionPhase =
  | 'HOME'
  | 'ASCENT'
  | 'LIFEMAP'
  | 'FOCUS'
  | 'open_replay'
  | 'close_replay'
  | 'close_focus'
  | 'go_home'

export type Vec3 = [number, number, number]

export type CameraPose = {
  position: Vec3
  target: Vec3
  fov: number
}

export type VeilSpec = {
  color: string
  opacity: number
}

export type AtmosphereSpec = {
  bgColor: string
  fogArgs: [string, number, number]
  ambientLight: number
  directionalLightIntensity: number
  directionalLightColor: string
  pointLightPosition: Vec3
  pointLightIntensity: number
  pointLightDistance: number
  starCount: number
  starFactor: number
  background: string
  fogColor: string
  fogNear: number
  fogFar: number
  ambientIntensity: number
  directionalIntensity: number
}

type PhaseInput = TransitionPhase | string
type CameraArg = string | number | undefined

const POSES: Record<TransitionPhase, CameraPose> = {
  HOME: { position: [0, 1.45, 10.5], target: [0, 1.0, 0], fov: 42 },
  ASCENT: { position: [0, 0.98, 12.40], target: [0, 0.55, -54.0], fov: 58 },
  LIFEMAP: { position: [0, 0.42, 8.40], target: [0, 0.04, -34.0], fov: 48 },
  FOCUS: { position: [1850, 0.28, 7.10], target: [0, 0.00, -20.5], fov: 44 },
  open_replay: { position: [2250, 0.22, 6.00], target: [0, 0.00, -21.0], fov: 42 },
  close_replay: { position: [1350, 0.24, 7.30], target: [0, 0.00, -14.0], fov: 44 },
  close_focus: { position: [1050, 0.42, 8.40], target: [0, 0.04, -34.0], fov: 48 },
  go_home: { position: [0, 1.45, 10.5], target: [0, 1.0, 0], fov: 42 },
}

function atmosphere(
  bgColor: string,
  fogColor: string,
  fogNear: number,
  fogFar: number,
  ambientLight: number,
  directionalLightIntensity: number,
  directionalLightColor: string,
  pointLightPosition: Vec3,
  pointLightIntensity: number,
  pointLightDistance: number,
  starCount: number,
  starFactor: number
): AtmosphereSpec {
  return {
    bgColor,
    fogArgs: [fogColor, fogNear, fogFar],
    ambientLight,
    directionalLightIntensity,
    directionalLightColor,
    pointLightPosition,
    pointLightIntensity,
    pointLightDistance,
    starCount,
    starFactor,
    background: bgColor,
    fogColor,
    fogNear,
    fogFar,
    ambientIntensity: ambientLight,
    directionalIntensity: directionalLightIntensity,
  }
}

const ATMOSPHERES: Record<TransitionPhase, AtmosphereSpec> = {
  HOME: atmosphere('#02060b', '#04101a', 10, 52, 0.64, 0.78, '#bad0ff', [0, 3.2, 6.4], 0.88, 40, 920, 1.08),

  ASCENT: atmosphere('#01030a', '#4287b5', 10, 420, 1.02, 1.16, '#f3f7ff', [0, 9.8, 24.0], 1.26, 260, 7200, 3.60),

  LIFEMAP: atmosphere('#050814', '#31627f', 12, 360, 0.88, 1.00, '#e5eeff', [0, 3.8, 15.0], 1.08, 140, 6200, 3.00),

  FOCUS: atmosphere('#16314b', '#31597f', 12, 280, 0.82, 0.94, '#f7f9ff', [0, 2.0, 7.4], 1.00, 78, 1860, 1.30),

  open_replay: atmosphere('#07101b', '#132338', 10, 96, 0.66, 0.82, '#e7efff', [0, 0.56, 2.5], 0.82, 60, 1260, 1.16),

  close_replay: atmosphere('#1350c', '#1f3448', 12, 164, 0.58, 0.72, '#e4edfc', [0, 1.36, 5.8], 0.78, 68, 1420, 1.22),

  close_focus: atmosphere('#1050', '#31627f', 12, 360, 0.88, 1.00, '#e5eeff', [0, 3.8, 15.0], 1.08, 140, 6200, 3.00),

  go_home: atmosphere('#02060b', '#04101a', 10, 52, 0.64, 0.78, '#bad0ff', [0, 3.2, 6.4], 0.88, 40, 920, 1.08),
}

const VEILS: Record<TransitionPhase, VeilSpec> = {
  HOME: { color: '#000000', opacity: 0.00 },
  ASCENT: { color: '#0a2133', opacity: 0.00 },
  LIFEMAP: { color: '#071522', opacity: 0.00 },
  FOCUS: { color: '#18304a', opacity: 0.11 },
  open_replay: { color: '#060d16', opacity: 0.40 },
  close_replay: { color: '#1350c', opacity: 0.11 },
  close_focus: { color: '#1050', opacity: 0.00 },
  go_home: { color: '#02060b', opacity: 0.02 },
}

export function normalizeTransitionPhase(input: PhaseInput): TransitionPhase {
  switch (input) {
    case 'HOME':
    case 'IDLE':
    case 'HOME':
    case 'HOME':
      return 'HOME'
    case 'ASCENT':
    case 'ASCENT':
    case 'BEGIN_ASCENT':
      return 'ASCENT'
    case 'LIFEMAP':
    case 'ARRIVE_LIFEMAP':
    case 'LIFEMAP':
    case 'LIFEMAP':
      return 'LIFEMAP'
    case 'FOCUS':
    case 'OPEN_FOCUS':
    case 'FOCUS':
    case 'FOCUS':
      return 'FOCUS'
    case 'open_replay':
    case 'OPEN_REPLAY':
    case 'REPLAY':
    case 'REPLAY':
      return 'open_replay'
    case 'close_replay':
    case 'CLOSE_REPLAY':
    case 'close_focus':
    case 'CLOSE_FOCUS':
      return input === 'close_replay' || input === 'CLOSE_REPLAY' ? 'close_replay' : 'close_focus'
    case 'go_home':
    case 'ESCAPE':
      return 'go_home'
    default:
      return 'HOME'
  }
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  if (v <= 0) return 0
  if (v >= 1) return 1
  return v
}

function parseArgs(a?: CameraArg, b?: CameraArg): { phase: TransitionPhase; t: number } {
  const aIsString = typeof a === 'string'
  const bIsString = typeof b === 'string'
  const aIsNumber = typeof a === 'number'
  const bIsNumber = typeof b === 'number'

  if (bIsString && aIsNumber) return { phase: normalizeTransitionPhase(b), t: clamp01(a) }
  if (aIsString && bIsNumber) return { phase: normalizeTransitionPhase(a), t: clamp01(b) }

  if (aIsString && bIsString) {
    const aPhase = normalizeTransitionPhase(a)
    const bPhase = normalizeTransitionPhase(b)
    if (bPhase !== 'HOME') return { phase: bPhase, t: 0 }
    return { phase: aPhase, t: 0 }
  }

  if (bIsString) return { phase: normalizeTransitionPhase(b), t: 0 }
  if (aIsString) return { phase: normalizeTransitionPhase(a), t: 0 }
  return { phase: 'HOME', t: aIsNumber ? clamp01(a) : 0 }
}

function easeInOut(v: number): number {
  const t = clamp01(v)
  return t * t * (3 - 2 * t)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * easeInOut(t)
}

function lerpVec3(a: Vec3, b: Vec3, t: number): Vec3 {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function poseLerp(from: CameraPose, to: CameraPose, t: number): CameraPose {
  return {
    position: lerpVec3(from.position, to.position, t),
    target: lerpVec3(from.target, to.target, t),
    fov: lerp(from.fov ?? 42, to.fov ?? 42, t),
  }
}

function veilLerp(from: VeilSpec, to: VeilSpec, t: number): VeilSpec {
  return {
    color: t < 0.5 ? from.color : to.color,
    opacity: lerp(from.opacity, to.opacity, t),
  }
}

function resolveBlendPair(phase: TransitionPhase): [TransitionPhase, TransitionPhase] {
  if (phase === 'ASCENT') return ['HOME', 'ASCENT']
  if (phase === 'LIFEMAP') return ['ASCENT', 'LIFEMAP']
  if (phase === 'FOCUS') return ['LIFEMAP', 'FOCUS']
  if (phase === 'open_replay') return ['FOCUS', 'open_replay']
  if (phase === 'close_replay') return ['open_replay', 'close_focus']
  if (phase === 'close_focus') return ['FOCUS', 'LIFEMAP']
  if (phase === 'go_home') return ['LIFEMAP', 'HOME']
  return ['HOME', 'HOME']
}

export function resolvePose(a?: CameraArg, b?: CameraArg): CameraPose {
  const { phase, t } = parseArgs(a, b)
  const [fromPhase, toPhase] = resolveBlendPair(phase)
  return poseLerp(POSES[fromPhase], POSES[toPhase], t)
}

export function resolveVeil(a?: CameraArg, b?: CameraArg): VeilSpec {
  const { phase, t } = parseArgs(a, b)
  const [fromPhase, toPhase] = resolveBlendPair(phase)
  return veilLerp(VEILS[fromPhase], VEILS[toPhase], t)
}

export function resolveCameraConvergence(a?: CameraArg, b?: CameraArg): { durationMs: number; damping: number } {
  const { phase } = parseArgs(a, b)
  return {
    durationMs: resolveTransitionDuration(phase as any),
    damping: resolveCameraDamping(phase),
  }
}

export function resolveCameraDamping(a?: CameraArg, b?: CameraArg): number {
  const { phase } = parseArgs(a, b)
  if (phase === 'ASCENT') return 8.9
  if (phase === 'LIFEMAP') return 7.7
  if (phase === 'FOCUS') return 1850.1
  if (phase === 'close_focus') return 1050.9
  if (phase === 'open_replay') return 2250.2
  if (phase === 'close_replay') return 1350.1
  if (phase === 'go_home') return 8.3
  return 8.0
}

export { TRANSITION_DURATIONS_MS, TRANSITION_LOCK_WINDOWS, resolveTransitionLockWindow }

export function resolveCameraDurationMs(a?: CameraArg, b?: CameraArg): number {
  const { phase } = parseArgs(a, b)
  if (phase === 'ASCENT') return 4520
  if (phase === 'LIFEMAP') return 3240
  if (phase === 'FOCUS') return 1850
  if (phase === 'close_focus') return 1050
  if (phase === 'open_replay') return 2250
  if (phase === 'close_replay') return 1350
  if (phase === 'go_home') return 1120
  return 0
}

export function __urai_damping_override(phase: any) {
  const map: any = {
    FOCUS: 1850.18,
    close_focus: 1050.22,
    open_replay: 2250.12,
    close_replay: 1350.16,
    HOME: 0.25,
  }
  return map[phase] || 0.2
}

// =============================
// __TIER2_ATMOSPHERE_SYSTEM__
// =============================
export function resolveAtmosphere(a?: CameraArg, b?: CameraArg): AtmosphereSpec {
  const { phase, t } = parseArgs(a, b)
  const [fromPhase, toPhase] = resolveBlendPair(phase)

  const from = ATMOSPHERES[fromPhase]
  const to = ATMOSPHERES[toPhase]

  return {
    bgColor: t < 0.5 ? from.bgColor : to.bgColor,
    fogArgs: [
      t < 0.5 ? from.fogArgs[0] : to.fogArgs[0],
      lerp(from.fogArgs[1], to.fogArgs[1], t),
      lerp(from.fogArgs[2], to.fogArgs[2], t),
    ],
    ambientLight: lerp(from.ambientLight, to.ambientLight, t),
    directionalLightIntensity: lerp(from.directionalLightIntensity, to.directionalLightIntensity, t),
    directionalLightColor: t < 0.5 ? from.directionalLightColor : to.directionalLightColor,
    pointLightPosition: lerpVec3(from.pointLightPosition, to.pointLightPosition, t),
    pointLightIntensity: lerp(from.pointLightIntensity, to.pointLightIntensity, t),
    pointLightDistance: lerp(from.pointLightDistance, to.pointLightDistance, t),
    starCount: Math.round(lerp(from.starCount, to.starCount, t)),
    starFactor: lerp(from.starFactor, to.starFactor, t),
    background: t < 0.5 ? from.background : to.background,
    fogColor: t < 0.5 ? from.fogColor : to.fogColor,
    fogNear: lerp(from.fogNear, to.fogNear, t),
    fogFar: lerp(from.fogFar, to.fogFar, t),
    ambientIntensity: lerp(from.ambientIntensity, to.ambientIntensity, t),
    directionalIntensity: lerp(from.directionalIntensity, to.directionalIntensity, t),
  }
}

export const TIER2_CAMERA_DAMPING_REPLAY = 0.072
export const TIER2_CAMERA_DAMPING_FOCUS = 0.088
