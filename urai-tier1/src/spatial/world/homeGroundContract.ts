'use client'

import * as THREE from 'three'

export const HOME_GROUND_CONTRACT_VERSION = 'urai-home-ground-canon-1' as const
export const GROUND_ENTRY_SESSION_KEY = 'urai:ground-entry-checkpoint:v1'
export const HOME_RETURN_SESSION_KEY = 'urai:home-return-checkpoint:v1'
export const GROUND_SESSION_ORIGIN_KEY = 'urai:ground-origin:v1'
export const GROUND_UNWIND_EVENT = 'urai:ground-unwind'
export const HOME_AVATAR_INTERACTION_EVENT = 'urai:home-avatar-interaction'

export const HOME_GROUND_TIMING = {
  descentMs: 1800,
  descentReducedMs: 360,
  firstPersonTakeoverMs: 1620,
  firstPersonTakeoverReducedMs: 240,
  groundInputReadyMs: 1800,
  groundInputReadyReducedMs: 360,
  unwindMs: 1650,
  unwindReducedMs: 320,
  groundCameraReleaseMs: 740,
  groundCameraReleaseReducedMs: 100,
  homeAvatarRestoreMs: 1020,
  homeAvatarRestoreReducedMs: 280,
} as const

export const HOME_GROUND_BOUNDS = {
  minX: -13.5,
  maxX: 13.5,
  minZ: -26.2,
  maxZ: 6.4,
} as const

export const GROUND_PLAYABLE_BOUNDS = {
  minX: -28,
  maxX: 28,
  minZ: -48,
  maxZ: 16,
} as const

export type GroundEntryCheckpoint = {
  version: typeof HOME_GROUND_CONTRACT_VERSION
  transactionId: string
  origin: 'home'
  homePoint: [number, number, number]
  homeNormal: [number, number, number]
  homeYaw: number
  homePitch: number
  normalizedSurfaceUV: [number, number]
  groundSpawn: [number, number]
  groundHeading: number
  entryAnchorId: string
  createdAt: number
}

export type HomeReturnCheckpoint = {
  version: typeof HOME_GROUND_CONTRACT_VERSION
  yaw: number
  pitch: number
  cameraPosition?: [number, number, number]
  selectedGroundPoint?: [number, number, number]
  orbState?: string
  createdAt: number
}

export type GroundUnwindReason = 'escape' | 'return-control' | 'browser-back' | 'android-back' | 'controller-back' | 'accessible-control'

function clamp01(value: number) {
  return THREE.MathUtils.clamp(value, 0, 1)
}

function normalize(value: number, min: number, max: number) {
  if (max === min) return 0.5
  return clamp01((value - min) / (max - min))
}

function mapRange(value: number, sourceMin: number, sourceMax: number, targetMin: number, targetMax: number) {
  return THREE.MathUtils.lerp(targetMin, targetMax, normalize(value, sourceMin, sourceMax))
}

function finiteTuple3(value: unknown): value is [number, number, number] {
  return Array.isArray(value) && value.length === 3 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
}

function finiteTuple2(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))
}

export function createGroundEntryCheckpoint({
  point,
  normal,
  yaw,
  pitch,
}: {
  point: THREE.Vector3
  normal?: THREE.Vector3
  yaw: number
  pitch: number
}): GroundEntryCheckpoint {
  const u = normalize(point.x, HOME_GROUND_BOUNDS.minX, HOME_GROUND_BOUNDS.maxX)
  const v = normalize(point.z, HOME_GROUND_BOUNDS.minZ, HOME_GROUND_BOUNDS.maxZ)
  const groundX = mapRange(point.x, HOME_GROUND_BOUNDS.minX, HOME_GROUND_BOUNDS.maxX, GROUND_PLAYABLE_BOUNDS.minX + 2.2, GROUND_PLAYABLE_BOUNDS.maxX - 2.2)
  const groundZ = mapRange(point.z, HOME_GROUND_BOUNDS.minZ, HOME_GROUND_BOUNDS.maxZ, GROUND_PLAYABLE_BOUNDS.minZ + 4.2, GROUND_PLAYABLE_BOUNDS.maxZ - 4.2)
  const surfaceNormal = normal?.clone().normalize() ?? new THREE.Vector3(0, 1, 0)
  const transactionId = `${Date.now().toString(36)}-${Math.round((u * 1000) + (v * 1000)).toString(36)}`

  return {
    version: HOME_GROUND_CONTRACT_VERSION,
    transactionId,
    origin: 'home',
    homePoint: [point.x, point.y, point.z],
    homeNormal: [surfaceNormal.x, surfaceNormal.y, surfaceNormal.z],
    homeYaw: yaw,
    homePitch: pitch,
    normalizedSurfaceUV: [u, v],
    groundSpawn: [groundX, groundZ],
    groundHeading: yaw,
    entryAnchorId: `home-ground-${Math.round(u * 100)}-${Math.round(v * 100)}`,
    createdAt: Date.now(),
  }
}

export function writeGroundEntryCheckpoint(checkpoint: GroundEntryCheckpoint) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(GROUND_ENTRY_SESSION_KEY, JSON.stringify(checkpoint))
  window.sessionStorage.setItem(GROUND_SESSION_ORIGIN_KEY, 'home')
}

export function readGroundEntryCheckpoint(maxAgeMs = 30 * 60 * 1000): GroundEntryCheckpoint | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(GROUND_ENTRY_SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<GroundEntryCheckpoint>
    if (value.version !== HOME_GROUND_CONTRACT_VERSION || value.origin !== 'home') return null
    if (!finiteTuple3(value.homePoint) || !finiteTuple3(value.homeNormal) || !finiteTuple2(value.normalizedSurfaceUV) || !finiteTuple2(value.groundSpawn)) return null
    if (typeof value.homeYaw !== 'number' || !Number.isFinite(value.homeYaw)) return null
    if (typeof value.homePitch !== 'number' || !Number.isFinite(value.homePitch)) return null
    if (typeof value.groundHeading !== 'number' || !Number.isFinite(value.groundHeading)) return null
    if (typeof value.transactionId !== 'string' || typeof value.entryAnchorId !== 'string') return null
    if (typeof value.createdAt !== 'number' || Date.now() - value.createdAt > maxAgeMs) return null
    return value as GroundEntryCheckpoint
  } catch {
    return null
  }
}

export function writeHomeReturnCheckpoint(checkpoint: Omit<HomeReturnCheckpoint, 'version' | 'createdAt'>) {
  if (typeof window === 'undefined') return
  const value: HomeReturnCheckpoint = {
    version: HOME_GROUND_CONTRACT_VERSION,
    ...checkpoint,
    createdAt: Date.now(),
  }
  window.sessionStorage.setItem(HOME_RETURN_SESSION_KEY, JSON.stringify(value))
}

export function readHomeReturnCheckpoint(maxAgeMs = 30 * 60 * 1000): HomeReturnCheckpoint | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(HOME_RETURN_SESSION_KEY)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<HomeReturnCheckpoint>
    if (value.version !== HOME_GROUND_CONTRACT_VERSION) return null
    if (typeof value.yaw !== 'number' || !Number.isFinite(value.yaw)) return null
    if (typeof value.pitch !== 'number' || !Number.isFinite(value.pitch)) return null
    if (value.cameraPosition !== undefined && !finiteTuple3(value.cameraPosition)) return null
    if (value.selectedGroundPoint !== undefined && !finiteTuple3(value.selectedGroundPoint)) return null
    if (typeof value.createdAt !== 'number' || Date.now() - value.createdAt > maxAgeMs) return null
    return value as HomeReturnCheckpoint
  } catch {
    return null
  }
}

export function clearGroundEntryCheckpoint() {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(GROUND_ENTRY_SESSION_KEY)
}

export function groundWasEnteredFromHome() {
  if (typeof window === 'undefined') return false
  return window.sessionStorage.getItem(GROUND_SESSION_ORIGIN_KEY) === 'home' && Boolean(readGroundEntryCheckpoint())
}

export function requestGroundUnwind(reason: GroundUnwindReason = 'return-control') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GROUND_UNWIND_EVENT, { detail: { reason } }))
}

export function requestHomeAvatarInteraction(returnFocusTo?: HTMLElement) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(HOME_AVATAR_INTERACTION_EVENT, { detail: { returnFocusTo } }))
}

declare global {
  interface WindowEventMap {
    [GROUND_UNWIND_EVENT]: CustomEvent<{ reason: GroundUnwindReason }>
    [HOME_AVATAR_INTERACTION_EVENT]: CustomEvent<{ returnFocusTo?: HTMLElement }>
  }
}
