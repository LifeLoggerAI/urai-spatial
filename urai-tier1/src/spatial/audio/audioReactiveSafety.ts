export type AudioReactiveMode = 'off' | 'meter-only' | 'reactive-private'

export interface AudioReactivePlan {
  mode: AudioReactiveMode
  requiresUserGesture: boolean
  startsMuted: boolean
  storesRawAudio: false
  usesMicrophone: boolean
  visualParameters: string[]
  safetyCopy: string
}

export function buildAudioReactivePlan({
  requested,
  userGesture,
  microphoneConsent,
}: {
  requested: boolean
  userGesture: boolean
  microphoneConsent: boolean
}): AudioReactivePlan {
  if (!requested) {
    return {
      mode: 'off',
      requiresUserGesture: true,
      startsMuted: true,
      storesRawAudio: false,
      usesMicrophone: false,
      visualParameters: [],
      safetyCopy: 'Audio-reactive behavior is off by default.',
    }
  }

  if (!userGesture || !microphoneConsent) {
    return {
      mode: 'meter-only',
      requiresUserGesture: true,
      startsMuted: true,
      storesRawAudio: false,
      usesMicrophone: false,
      visualParameters: ['captionPulse', 'narratorBreath', 'ambientGlow'],
      safetyCopy: 'Audio visuals can preview from narrator timing without opening the microphone.',
    }
  }

  return {
    mode: 'reactive-private',
    requiresUserGesture: true,
    startsMuted: false,
    storesRawAudio: false,
    usesMicrophone: true,
    visualParameters: ['orbPulse', 'particleAmplitude', 'auraBloom', 'pathBrightness'],
    safetyCopy: 'Microphone-reactive visuals run only after explicit consent and do not store raw audio.',
  }
}

export function assertNoAutostartAudio(plan: AudioReactivePlan) {
  return plan.requiresUserGesture && plan.storesRawAudio === false && (plan.mode === 'off' || plan.startsMuted || plan.usesMicrophone)
}
