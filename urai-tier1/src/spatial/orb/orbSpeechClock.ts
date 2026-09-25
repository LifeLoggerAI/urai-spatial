export type OrbSpeechSource = 'natural' | 'device' | 'text'

export type OrbSpeechClockPhase = 'anticipation' | 'start' | 'boundary' | 'frame' | 'end' | 'cancel'

export type OrbSpeechClockDetail = {
  readonly phase: OrbSpeechClockPhase
  readonly source: OrbSpeechSource
  readonly elapsedMs?: number
  readonly durationMs?: number
  readonly charIndex?: number
  /** Actual local playback RMS when available. Never synthesized for text/device fallback. */
  readonly amplitude?: number
}

export const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'
export const ORB_RESPONSE_ANTICIPATION_MS = 380

export function emitOrbSpeechClock(detail: OrbSpeechClockDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OrbSpeechClockDetail>(ORB_SPEECH_CLOCK_EVENT, { detail }))
}
