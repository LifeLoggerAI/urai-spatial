'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'
import { useAudioController } from './useAudioController'
import type { SpatialAudioCue, SpatialAudioPhase } from './audioTypes'

const SESSION_KEY = 'urai:spatial-audio-consent-v1'
const MUTE_KEY = 'urai:spatial-audio-muted-v1'

const AMBIENT_CAPTIONS: Record<SpatialAudioPhase, string> = {
  HOME: 'A soft filtered-noise bed with low sustained sanctuary tones.',
  GROUND: 'A low filtered environmental bed with restrained sustained tones.',
  ASCENT: 'A spacious filtered-noise field with layered harmonic tones.',
  LIFEMAP: 'A spacious filtered-noise field with layered harmonic tones.',
  FOCUS: 'A close, steady filtered-noise bed with stable low tones.',
  REPLAY: 'A restrained filtered-noise cinematic bed with slow harmonic tones.',
}

const CUE_CAPTIONS: Record<SpatialAudioCue, string> = {
  transition: 'Realm transition.',
  'orb-confirm': 'Orb confirmed.',
  error: 'Action could not be completed.',
}

function phaseForDestination(destination: string, transition: string): SpatialAudioPhase | null {
  if (transition === 'ascending' || transition === 'travelling') return 'ASCENT'
  if (destination === 'home') return 'HOME'
  if (destination === 'infrastructure-hub') return 'GROUND'
  if (destination === 'life-map') return 'LIFEMAP'
  if (destination === 'focus') return 'FOCUS'
  if (destination === 'replay') return 'REPLAY'
  return null
}

export function SpatialAmbientRuntime() {
  const { world, phase } = useUraiWorldState()
  const audio = useAudioController()
  const [consented, setConsented] = useState(false)
  const [muted, setMuted] = useState(true)
  const [liveCaption, setLiveCaption] = useState('')
  const previousTransition = useRef(phase)
  const spatialPhase = useMemo(() => phaseForDestination(world.destination, phase), [phase, world.destination])

  useEffect(() => {
    try {
      setConsented(sessionStorage.getItem(SESSION_KEY) === 'true')
      setMuted(sessionStorage.getItem(MUTE_KEY) !== 'false')
    } catch {
      setConsented(false)
      setMuted(true)
    }
  }, [])

  useEffect(() => {
    const handleConsent = (event: Event) => {
      const enabled = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled)
      setConsented(enabled)
      setMuted(!enabled)
      try {
        sessionStorage.setItem(SESSION_KEY, enabled ? 'true' : 'false')
        sessionStorage.setItem(MUTE_KEY, enabled ? 'false' : 'true')
      } catch { /* session storage is optional */ }
      if (!enabled) {
        audio.stopAllAudio()
        return
      }
      if (spatialPhase) {
        setLiveCaption(AMBIENT_CAPTIONS[spatialPhase])
        audio.setAmbientPhase(spatialPhase)
      }
    }
    const handleMute = (event: Event) => {
      const nextMuted = Boolean((event as CustomEvent<{ muted?: boolean }>).detail?.muted)
      setMuted(nextMuted)
      try { sessionStorage.setItem(MUTE_KEY, nextMuted ? 'true' : 'false') } catch { /* optional */ }
      if (nextMuted) {
        audio.stopAmbient()
        return
      }
      if (consented && spatialPhase) audio.setAmbientPhase(spatialPhase)
    }
    const handleCue = (event: Event) => {
      const cue = (event as CustomEvent<{ cue?: SpatialAudioCue }>).detail?.cue
      if (!cue || !(cue in CUE_CAPTIONS)) return
      setLiveCaption(CUE_CAPTIONS[cue])
      if (consented && !muted) audio.playCue(cue)
    }
    window.addEventListener('urai:audio-consent', handleConsent)
    window.addEventListener('urai:audio-mute', handleMute)
    window.addEventListener('urai:audio-cue', handleCue)
    return () => {
      window.removeEventListener('urai:audio-consent', handleConsent)
      window.removeEventListener('urai:audio-mute', handleMute)
      window.removeEventListener('urai:audio-cue', handleCue)
    }
  }, [audio, consented, muted, spatialPhase])

  useEffect(() => {
    if (!spatialPhase) {
      audio.stopAmbient()
      return
    }
    setLiveCaption(AMBIENT_CAPTIONS[spatialPhase])
    if (consented && !muted) audio.setAmbientPhase(spatialPhase)
    else audio.stopAmbient()
  }, [audio, consented, muted, spatialPhase])

  useEffect(() => {
    if (phase !== 'idle' && previousTransition.current === 'idle') {
      setLiveCaption(CUE_CAPTIONS.transition)
      if (consented && !muted) audio.playCue('transition')
    }
    previousTransition.current = phase
  }, [audio, consented, muted, phase])

  return (
    <span
      className="sr-only"
      role="status"
      aria-live="polite"
      data-urai-spatial-audio-runtime="production-opus-v1"
      data-audio-consent={consented ? 'granted' : 'not-granted'}
      data-audio-muted={muted ? 'true' : 'false'}
      data-audio-phase={spatialPhase ?? 'none'}
    >
      {liveCaption}
    </span>
  )
}

export default SpatialAmbientRuntime
