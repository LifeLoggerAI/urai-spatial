'use client'

import { useEffect, useRef } from 'react'
import { resolveReadyUraiSensoryAssetPath } from '../assets/sensoryAssetManifest'
import type { SpatialAudioCue } from './audioTypes'

const SESSION_KEY = 'urai:spatial-audio-consent-v1'
const MUTE_KEY = 'urai:spatial-audio-muted-v1'
const PRODUCTION_AUDIO_READY = resolveReadyUraiSensoryAssetPath('ambientAudio') !== null

const CUES: Record<SpatialAudioCue, { src: string; position: [number, number, number]; gain: number }> = {
  transition: { src: '/assets/urai/generated/audio/portal-transition-v1.opus', position: [0, 1.2, -3.4], gain: 0.48 },
  'orb-confirm': { src: '/assets/urai/generated/audio/orb-confirm-v1.opus', position: [0, 1.5, 1.4], gain: 0.46 },
  error: { src: '/assets/urai/generated/audio/ui-error-v1.opus', position: [0, 1.1, -1.6], gain: 0.38 },
}

type AudioState = { context: AudioContext; reverb: ConvolverNode; cache: Map<string, AudioBuffer> }

function makeImpulse(context: AudioContext) {
  const duration = 0.42
  const length = Math.max(1, Math.floor(context.sampleRate * duration))
  const impulse = context.createBuffer(2, length, context.sampleRate)
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let index = 0; index < length; index += 1) {
      const decay = Math.pow(1 - index / length, 3.4)
      data[index] = (Math.random() * 2 - 1) * decay * 0.22
    }
  }
  return impulse
}

async function bufferFor(state: AudioState, src: string) {
  const cached = state.cache.get(src)
  if (cached) return cached
  const response = await fetch(src, { cache: 'force-cache', credentials: 'same-origin' })
  if (!response.ok) throw new Error('local positional cue unavailable')
  const decoded = await state.context.decodeAudioData(await response.arrayBuffer())
  state.cache.set(src, decoded)
  return decoded
}

async function playPositioned(state: AudioState, cue: SpatialAudioCue) {
  if (!PRODUCTION_AUDIO_READY) return
  const spec = CUES[cue]
  if (!spec) return
  if (state.context.state === 'suspended') await state.context.resume()
  const source = state.context.createBufferSource()
  const panner = new PannerNode(state.context, {
    panningModel: 'HRTF',
    distanceModel: 'inverse',
    positionX: spec.position[0],
    positionY: spec.position[1],
    positionZ: spec.position[2],
    refDistance: 1,
    maxDistance: 18,
    rolloffFactor: 1.15,
  })
  const dry = state.context.createGain()
  const wet = state.context.createGain()
  dry.gain.value = spec.gain
  wet.gain.value = spec.gain * 0.18
  source.buffer = await bufferFor(state, spec.src)
  source.connect(panner)
  panner.connect(dry).connect(state.context.destination)
  panner.connect(wet).connect(state.reverb).connect(state.context.destination)
  source.start()
}

export default function SpatialPositionedAudioRuntime() {
  const stateRef = useRef<AudioState | null>(null)
  const enabledRef = useRef(false)
  const mutedRef = useRef(true)

  useEffect(() => {
    try {
      enabledRef.current = sessionStorage.getItem(SESSION_KEY) === 'true'
      mutedRef.current = sessionStorage.getItem(MUTE_KEY) !== 'false'
    } catch {
      enabledRef.current = false
      mutedRef.current = true
    }

    const ensure = () => {
      if (stateRef.current) return stateRef.current
      const AudioContextCtor = window.AudioContext
      const context = new AudioContextCtor({ latencyHint: 'interactive' })
      const reverb = context.createConvolver()
      reverb.buffer = makeImpulse(context)
      stateRef.current = { context, reverb, cache: new Map() }
      return stateRef.current
    }

    const onConsent = (event: Event) => {
      enabledRef.current = Boolean((event as CustomEvent<{ enabled?: boolean }>).detail?.enabled)
      mutedRef.current = !enabledRef.current
      if (enabledRef.current) void ensure().context.resume().catch(() => undefined)
    }
    const onMute = (event: Event) => { mutedRef.current = Boolean((event as CustomEvent<{ muted?: boolean }>).detail?.muted) }
    const onCue = (event: Event) => {
      const cue = (event as CustomEvent<{ cue?: SpatialAudioCue }>).detail?.cue
      if (!cue || !enabledRef.current || mutedRef.current) return
      void playPositioned(ensure(), cue).catch(() => undefined)
    }

    window.addEventListener('urai:audio-consent', onConsent)
    window.addEventListener('urai:audio-mute', onMute)
    window.addEventListener('urai:audio-cue', onCue)
    return () => {
      window.removeEventListener('urai:audio-consent', onConsent)
      window.removeEventListener('urai:audio-mute', onMute)
      window.removeEventListener('urai:audio-cue', onCue)
      const state = stateRef.current
      stateRef.current = null
      if (state) void state.context.close().catch(() => undefined)
    }
  }, [])

  return <span className="sr-only" data-spatial-cue-renderer="webaudio-hrtf-v1">Spatial cues use local HRTF positioning with distance rolloff and restrained room response when audio permission is granted.</span>
}
