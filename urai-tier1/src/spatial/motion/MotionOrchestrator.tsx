'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'
import {
  URAI_MOTION_COMPLETE_EVENT,
  URAI_MOTION_CUE_EVENT,
  URAI_MOTION_MANIFEST,
  URAI_MOTION_NARRATION_READY_EVENT,
  motionDuration,
  type UraiMotionCueEventDetail,
  type UraiMotionCueId,
} from './motionManifest'
import './motionOrchestration.css'

const BOOT_SESSION_KEY = 'urai:motion:app-boot-intro-v1'

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function MotionOrchestrator() {
  const { world, phase, pendingTravel } = useUraiWorldState()
  const [activeCue, setActiveCue] = useState<UraiMotionCueId | null>(null)
  const completionTimer = useRef<number | null>(null)
  const narrationTimer = useRef<number | null>(null)
  const activeSource = useRef('system')

  const clearTimers = useCallback(() => {
    if (completionTimer.current !== null) window.clearTimeout(completionTimer.current)
    if (narrationTimer.current !== null) window.clearTimeout(narrationTimer.current)
    completionTimer.current = null
    narrationTimer.current = null
  }, [])

  const activate = useCallback((cue: UraiMotionCueId, source = 'system') => {
    const definition = URAI_MOTION_MANIFEST[cue]
    const durationMs = motionDuration(cue, prefersReducedMotion())
    clearTimers()
    activeSource.current = source
    setActiveCue(cue)

    if (definition.narrationPolicy === 'motion-leads' && definition.narrationLeadMs > 0) {
      narrationTimer.current = window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent(URAI_MOTION_NARRATION_READY_EVENT, {
          detail: { cue, source, durationMs },
        }))
        narrationTimer.current = null
      }, Math.min(definition.narrationLeadMs, durationMs))
    }

    completionTimer.current = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent(URAI_MOTION_COMPLETE_EVENT, {
        detail: { cue, source, durationMs },
      }))
      setActiveCue((current) => current === cue ? null : current)
      completionTimer.current = null
    }, durationMs)
  }, [clearTimers])

  useEffect(() => {
    const onCue = (event: Event) => {
      const detail = (event as CustomEvent<UraiMotionCueEventDetail>).detail
      if (!detail?.cue || !(detail.cue in URAI_MOTION_MANIFEST)) return
      activate(detail.cue, detail.source ?? 'system')
    }
    const onNarratorSilence = () => activate('silence_hold_frame', 'narrator')

    window.addEventListener(URAI_MOTION_CUE_EVENT, onCue)
    window.addEventListener('urai:narrator-silence', onNarratorSilence)
    return () => {
      window.removeEventListener(URAI_MOTION_CUE_EVENT, onCue)
      window.removeEventListener('urai:narrator-silence', onNarratorSilence)
      clearTimers()
    }
  }, [activate, clearTimers])

  useEffect(() => {
    if (world.destination !== 'home') return
    try {
      if (window.sessionStorage.getItem(BOOT_SESSION_KEY) === 'done') return
      window.sessionStorage.setItem(BOOT_SESSION_KEY, 'done')
    } catch {
      // Session storage is optional. The cue remains non-blocking if unavailable.
    }
    activate('app_boot_intro', 'home')
  }, [activate, world.destination])

  useEffect(() => {
    if (phase === 'idle' || !pendingTravel) return

    if (world.destination === 'home' && pendingTravel.destination === 'life-map') {
      activate('map_enter_zoom', 'world-transition')
      return
    }
    if (pendingTravel.destination === 'replay') {
      activate('replay_enter_curtain', 'world-transition')
      return
    }
    if (phase === 'descending') {
      activate('body_thin_fade', 'world-transition')
      return
    }
    if (phase === 'travelling') activate('timeline_warp', 'world-transition')
  }, [activate, pendingTravel, phase, world.destination])

  const definition = activeCue ? URAI_MOTION_MANIFEST[activeCue] : null

  return (
    <div
      className="urai-motion-orchestrator"
      data-testid="urai-motion-orchestrator"
      data-motion-cue={activeCue ?? 'idle'}
      data-authoring-intent={definition?.authoringIntent ?? 'none'}
      data-runtime-authority={definition?.runtimeAuthority ?? 'none'}
      data-audio-policy={definition?.audioPolicy ?? 'none'}
      data-narration-policy={definition?.narrationPolicy ?? 'none'}
      data-motion-source={activeCue ? activeSource.current : 'none'}
      aria-hidden="true"
    >
      <span className="urai-motion-orchestrator__pressure" />
      <span className="urai-motion-orchestrator__field" />
      <span className="urai-motion-orchestrator__fracture" />
      <span className="urai-motion-orchestrator__curtain" />
      <span className="urai-motion-orchestrator__mark" />
    </div>
  )
}

export default MotionOrchestrator
