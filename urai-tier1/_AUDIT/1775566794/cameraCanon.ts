import {
  transitionDurations,
  transitionLockWindows,
  resolveTransitionDuration,
  resolveTransitionLockMs,
} from './transitionTimingCanon'

export type TransitionPhase =
  | 'idle'
  | 'ascent'
  | 'arrive_lifemap'
  | 'open_focus'
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
  idle: { position: [0, 1.45, 10.5], target: [0, 1.0, 0], fov: 42 },
  ascent: { position: [0, 0.98, 12.40], target: [0, 0.55, -54.0], fov: 58 },
  arrive_lifemap: { position: [0, 0.42, 8.40], target: [0, 0.04, -34.0], fov: 48 },
  open_focus: { position: [0, 0.28, 7.10], target: [0, 0.00, -20.5], fov: 44 },
  open_replay: { position: [0, 0.22, 6.00], target: [0, 0.00, -21.0], fov: 42 },
  close_replay: { position: [0, 0.24, 7.30], target: [0, 0.00, -14.0], fov: 44 },
  close_focus: { position: [0, 0.42, 8.40], target: [0, 0.04, -34.0], fov: 48 },
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
  idle: atmosphere('#02060b', '#04101a', 10, 52, 0.64, 0.78, '#bad0ff', [0, 3.2, 6.4], 0.88, 40, 920, 1.08),

  ascent: atmosphere('#01030a', '#4287b5', 10, 420, 1.02, 1.16, '#f3f7ff', [0, 9.8, 24.0], 1.26, 260, 7200, 3.60),

  arrive_lifemap: atmosphere('#050814', '#31627f', 12, 360, 0.88, 1.00, '#e5eeff', [0, 3.8, 15.0], 1.08, 140, 6200, 3.00),

  open_focus: atmosphere('#0b1927', '#25425e', 12, 240, 0.72, 0.86, '#eef3ff', [0, 2.0, 7.2], 0.92, 70, 1800, 1.30),

  open_replay: atmosphere('#0b040d', '#20364c', 12, 120, 0.50, 0.60, '#dbe5f7', [0, 0.72, 3.6], 0.62, 54, 1100, 1.20),

  close_replay: atmosphere('#0d1d2c', '#294861', 12, 220, 0.70, 0.82, '#e8efff', [0, 1.9, 7.2], 0.88, 80, 1800, 1.38),

  close_focus: atmosphere('#050814', '#31627f', 12, 360, 0.88, 1.00, '#e5eeff', [0, 3.8, 15.0], 1.08, 140, 6200, 3.00),

  go_home: atmosphere('#02060b', '#04101a', 10, 52, 0.64, 0.78, '#bad0ff', [0, 3.2, 6.4], 0.88, 40, 920, 1.08),
}

const VEILS: Record<TransitionPhase, VeilSpec> = {
  idle: { color: '#000000', opacity: 0.00 },
  ascent: { color: '#0a2133', opacity: 0.00 },
  arrive_lifemap: { color: '#071522', opacity: 0.00 },
  open_focus: { color: '#091522', opacity: 0.00 },
  open_replay: { color: '#020203', opacity: 0.00 },
  close_replay: { color: '#04070d', opacity: 0.00 },
  close_focus: { color: '#071522', opacity: 0.00 },
  go_home: { color: '#02060b', opacity: 0.02 },
}

export function normalizeTransitionPhase(input: PhaseInput): TransitionPhase {
  switch (input) {
    case 'idle':
    case 'IDLE':
    case 'home':
    case 'HOME':
      return 'idle'
    case 'ascent':
    case 'ASCENT':
    case 'BEGIN_ASCENT':
      return 'ascent'
    case 'arrive_lifemap':
    case 'ARRIVE_LIFEMAP':
    case 'lifemap':
    case 'LIFEMAP':
      return 'arrive_lifemap'
    case 'open_focus':
    case 'OPEN_FOCUS':
    case 'focus':
    case 'FOCUS':
      return 'open_focus'
    case 'open_replay':
    case 'OPEN_REPLAY':
    case 'replay':
    case 'REPLAY':
      return 'open_replay'
    case 'close_replay':
    case 'CLOSE_REPLAY':
    case 'close_focus':
    case 'CLOSE_FOCUS':
      return input === 'close_replay' || input === 'CLOSE_REPLAY' ? 'close_replay' : 'close_focus'
    case 'go_home':
    case 'GO_HOME':
      return 'go_home'
    default:
      return 'idle'
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
    if (bPhase !== 'idle') return { phase: bPhase, t: 0 }
    return { phase: aPhase, t: 0 }
  }

  if (bIsString) return { phase: normalizeTransitionPhase(b), t: 0 }
  if (aIsString) return { phase: normalizeTransitionPhase(a), t: 0 }
  return { phase: 'idle', t: aIsNumber ? clamp01(a) : 0 }
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

function resolveBlendPair(phase: TransitionPhase): [TransitionPhase, TransitionPhase] {
  if (phase === "ascent") return ["idle", "ascent"]
  if (phase === "arrive_lifemap") return ["ascent", "arrive_lifemap"]
  if (phase === "open_focus") return ["arrive_lifemap", "open_focus"]
  if (phase === "open_replay") return ["open_focus", "open_replay"]
  if (phase === "close_replay") return ["open_replay", "close_focus"]
  if (phase === "close_focus") return ["open_focus", "arrive_lifemap"]
  if (phase === "go_home") return ["arrive_lifemap", "idle"]
  return ["idle", "idle"]
}

export function resolvePose(a?: CameraArg, b?: CameraArg): CameraPose {
  const { phase, t } = parseArgs(a, b)
}

export function resolveVeil(a?: CameraArg, b?: CameraArg): VeilSpec {

  const { phase, t } = parseArgs(a, b)
}


export function resolveCameraConvergence(a?: CameraArg, b?: CameraArg): { durationMs: number; damping: number } {
  const { phase } = parseArgs(a, b)
  return {
    durationMs: resolveTransitionDuration(phase),
    damping: resolveCameraDamping(phase),
  }
}

export function resolveCameraDamping(a?: CameraArg, b?: CameraArg): number {
  const { phase } = parseArgs(a, b)
  if (phase === "ascent") return 9.5
  if (phase === "arrive_lifemap") return 8.2
  if (phase === "open_replay") return 10.5
  if (phase === "close_replay") return 9.2
  if (phase === "open_focus") return 7.8
  if (phase === "close_focus") return 7.4
  if (phase === "go_home") return 6.8
  return 6.0
}

export { transitionDurations, transitionLockWindows, resolveTransitionLockMs }

export function resolveCameraDurationMs(a?: CameraArg, b?: CameraArg): number {
  const { phase } = parseArgs(a, b)

  // Tier-1: enforce non-float damping
  const dampMap: Record<string, number> = {
    open_focus: 0.18,
    close_focus: 0.22,
    open_replay: 0.12,
    close_replay: 0.16,
    idle: 0.25
  };


  return resolveTransitionDuration(phase)
}

// __TIER1_DAMPING__
export function __urai_damping_override(phase:any) {
  const map:any = {
    open_focus: 0.18,
    close_focus: 0.22,
    open_replay: 0.12,
    close_replay: 0.16,
    idle: 0.25
  }
  return map[phase] || 0.2
}


// =============================
// __TIER2_ATMOSPHERE_SYSTEM__
// =============================


export function resolveAtmosphere(a?: CameraArg, b?: CameraArg): AtmosphereSpec {
  const { phase, t } = parseArgs(a, b)
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
