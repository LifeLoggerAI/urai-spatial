'use client'

import { useEffect } from 'react'
import { getHapticCue, type SpatialHapticCueId } from './hapticCueRegistry'
import { URAI_WORLD_RETURN_EVENT, URAI_WORLD_TRAVEL_EVENT } from '@/spatial/world/worldEvents'

export const URAI_HAPTIC_CUE_EVENT = 'urai:haptic-cue'
export const URAI_HAPTICS_ENABLED_EVENT = 'urai:haptics-enabled'
export const URAI_HAPTICS_STORAGE_KEY = 'urai:haptics:enabled-v1'

type HapticCueDetail = { cue: SpatialHapticCueId; source?: string }
type HapticsEnabledDetail = { enabled: boolean }

type RumbleActuator = {
  playEffect?: (type: string, params: { duration: number; strongMagnitude: number; weakMagnitude: number }) => Promise<unknown> | unknown
  pulse?: (value: number, duration: number) => Promise<unknown> | unknown
}

type HapticGamepad = Gamepad & {
  vibrationActuator?: RumbleActuator
  hapticActuators?: RumbleActuator[]
}

function hapticsEnabled() {
  if (typeof window === 'undefined') return false
  try {
    const stored = window.localStorage.getItem(URAI_HAPTICS_STORAGE_KEY)
    return stored !== 'false'
  } catch {
    return true
  }
}

function totalPatternDuration(patternMs: number[]) {
  return patternMs.reduce((total, value) => total + Math.max(0, value), 0)
}

async function pulseGamepads(patternMs: number[]) {
  if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return false
  const duration = Math.max(12, totalPatternDuration(patternMs))
  const gamepads = Array.from(navigator.getGamepads()).filter(Boolean) as HapticGamepad[]
  let attempted = false

  await Promise.all(gamepads.map(async (gamepad) => {
    const actuators = [gamepad.vibrationActuator, ...(gamepad.hapticActuators ?? [])].filter(Boolean) as RumbleActuator[]
    for (const actuator of actuators) {
      attempted = true
      try {
        if (actuator.playEffect) {
          await actuator.playEffect('dual-rumble', { duration, strongMagnitude: 0.32, weakMagnitude: 0.2 })
        } else if (actuator.pulse) {
          await actuator.pulse(0.3, duration)
        }
      } catch {
      }
    }
  }))

  return attempted
}

export async function executeHapticCue(cueId: SpatialHapticCueId) {
  if (!hapticsEnabled()) return false
  const cue = getHapticCue(cueId)
  let executed = false

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      executed = navigator.vibrate(cue.patternMs) || executed
    } catch {
    }
  }

  const gamepadExecuted = await pulseGamepads(cue.patternMs)
  return executed || gamepadExecuted
}

export function requestHapticCue(cue: SpatialHapticCueId, source = 'system') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<HapticCueDetail>(URAI_HAPTIC_CUE_EVENT, { detail: { cue, source } }))
}

export function setHapticsEnabled(enabled: boolean) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(URAI_HAPTICS_STORAGE_KEY, enabled ? 'true' : 'false')
  } catch {
  }
  if (!enabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(0)
  window.dispatchEvent(new CustomEvent<HapticsEnabledDetail>(URAI_HAPTICS_ENABLED_EVENT, { detail: { enabled } }))
}

export function HapticRuntime() {
  useEffect(() => {
    let runtimeEnabled = hapticsEnabled()

    const onCue = (event: Event) => {
      if (!runtimeEnabled) return
      const detail = (event as CustomEvent<HapticCueDetail>).detail
      if (!detail?.cue) return
      void executeHapticCue(detail.cue)
    }
    const onWorldTravel = () => { if (runtimeEnabled) void executeHapticCue('portal-open') }
    const onWorldReturn = () => { if (runtimeEnabled) void executeHapticCue('return-home') }
    const onEnabled = (event: Event) => {
      runtimeEnabled = (event as CustomEvent<HapticsEnabledDetail>).detail?.enabled === true
    }

    window.addEventListener(URAI_HAPTIC_CUE_EVENT, onCue)
    window.addEventListener(URAI_WORLD_TRAVEL_EVENT, onWorldTravel)
    window.addEventListener(URAI_WORLD_RETURN_EVENT, onWorldReturn)
    window.addEventListener(URAI_HAPTICS_ENABLED_EVENT, onEnabled)
    return () => {
      window.removeEventListener(URAI_HAPTIC_CUE_EVENT, onCue)
      window.removeEventListener(URAI_WORLD_TRAVEL_EVENT, onWorldTravel)
      window.removeEventListener(URAI_WORLD_RETURN_EVENT, onWorldReturn)
      window.removeEventListener(URAI_HAPTICS_ENABLED_EVENT, onEnabled)
    }
  }, [])

  return null
}

export default HapticRuntime

declare global {
  interface WindowEventMap {
    [URAI_HAPTIC_CUE_EVENT]: CustomEvent<HapticCueDetail>
    [URAI_HAPTICS_ENABLED_EVENT]: CustomEvent<HapticsEnabledDetail>
  }
}
