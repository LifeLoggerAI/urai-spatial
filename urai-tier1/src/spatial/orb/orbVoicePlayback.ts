export type OrbVoicePhase = 'idle' | 'preparing' | 'queued' | 'speaking'
export type OrbVoiceNotice = 'preparing' | 'external-playing' | 'device-playing' | 'external-unavailable' | 'unavailable' | 'finished'

type VoiceEnvironment = {
  speech: SpeechSynthesis | null
  createUtterance: (text: string) => SpeechSynthesisUtterance
  createAudio: (url: string) => HTMLAudioElement
  createObjectURL: (blob: Blob) => string
  revokeObjectURL: (url: string) => void
  language: string
}

type VoiceOptions = {
  requestExternalAudio: (text: string, signal: AbortSignal) => Promise<Blob | null>
  onPhase: (phase: OrbVoicePhase) => void
  onNotice: (notice: OrbVoiceNotice) => void
  environment?: VoiceEnvironment
  voiceAvailabilityTimeoutMs?: number
}

function browserVoiceEnvironment(): VoiceEnvironment {
  return {
    speech: typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null,
    createUtterance: (text) => new SpeechSynthesisUtterance(text),
    createAudio: (url) => new Audio(url),
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
  }
}

/** One cancellable playback owner; only media start events report speaking. */
export class OrbVoicePlayback {
  private readonly environment: VoiceEnvironment
  private generation = 0
  private aborter: AbortController | null = null
  private audio: HTMLAudioElement | null = null
  private objectUrl: string | null = null
  private utterance: SpeechSynthesisUtterance | null = null

  constructor(private readonly options: VoiceOptions) {
    this.environment = options.environment ?? browserVoiceEnvironment()
  }

  stop() {
    this.generation += 1
    this.aborter?.abort()
    this.aborter = null
    this.clearAudio()
    this.clearUtterance(true)
    this.options.onPhase('idle')
  }

  async play(text: string, externalProcessingConsent: boolean) {
    this.stop()
    if (!text.trim()) return
    const generation = this.generation
    const controller = new AbortController()
    this.aborter = controller

    if (externalProcessingConsent) {
      this.options.onPhase('preparing')
      this.options.onNotice('preparing')
      let blob: Blob | null = null
      try {
        blob = await this.options.requestExternalAudio(text, controller.signal)
      } catch {
        // Voice failure retains the readable response and may use a local voice.
      }
      if (!this.owns(generation, controller)) return
      if (blob?.size) {
        let audio: HTMLAudioElement | null = null
        try {
          const url = this.environment.createObjectURL(blob)
          this.objectUrl = url
          audio = this.environment.createAudio(url)
          this.audio = audio
          const ownsAudio = () => this.owns(generation, controller) && this.audio === audio
          audio.onplaying = () => {
            if (!ownsAudio()) return
            this.options.onPhase('speaking')
            this.options.onNotice('external-playing')
          }
          audio.onwaiting = () => {
            if (!ownsAudio()) return
            this.options.onPhase('preparing')
            this.options.onNotice('preparing')
          }
          audio.onended = () => {
            if (!ownsAudio()) return
            this.clearAudio()
            this.finish(generation, controller)
          }
          audio.onerror = () => {
            if (!ownsAudio()) return
            this.clearAudio()
            this.options.onNotice('external-unavailable')
            void this.playDevice(text, generation, controller)
          }
          await audio.play()
          // A resolved play promise is insufficient evidence of audible playback.
          return
        } catch {
          if (!this.owns(generation, controller)) return
          // An error event may already have transferred ownership to device voice.
          if (audio && this.audio !== audio) return
          this.clearAudio()
        }
      }
      this.options.onNotice('external-unavailable')
    }

    await this.playDevice(text, generation, controller)
  }

  private owns(generation: number, controller: AbortController) {
    return this.generation === generation && this.aborter === controller && !controller.signal.aborted
  }

  private clearAudio() {
    const audio = this.audio
    this.audio = null
    if (audio) {
      audio.onplaying = null
      audio.onwaiting = null
      audio.onended = null
      audio.onerror = null
      audio.pause()
      audio.src = ''
    }
    if (this.objectUrl) this.environment.revokeObjectURL(this.objectUrl)
    this.objectUrl = null
  }

  private clearUtterance(cancel: boolean) {
    const utterance = this.utterance
    this.utterance = null
    if (!utterance) return
    utterance.onstart = null
    utterance.onend = null
    utterance.onerror = null
    if (cancel) this.environment.speech?.cancel()
  }

  private localVoice() {
    const voices = this.environment.speech?.getVoices().filter((voice) => voice.localService) ?? []
    const language = this.environment.language.toLowerCase()
    return voices.find((voice) => voice.lang.toLowerCase() === language)
      ?? voices.find((voice) => voice.lang.toLowerCase().split('-')[0] === language.split('-')[0])
      ?? voices[0]
      ?? null
  }

  private async waitForLocalVoice(signal: AbortSignal) {
    const available = this.localVoice()
    if (available || !this.environment.speech || signal.aborted) return available
    const speech = this.environment.speech
    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const finish = (voice: SpeechSynthesisVoice | null) => {
        clearTimeout(timer)
        speech.removeEventListener('voiceschanged', onVoices)
        signal.removeEventListener('abort', onAbort)
        resolve(voice)
      }
      const onVoices = () => {
        const voice = this.localVoice()
        if (voice) finish(voice)
      }
      const onAbort = () => finish(null)
      const timer = setTimeout(() => finish(null), this.options.voiceAvailabilityTimeoutMs ?? 1500)
      speech.addEventListener('voiceschanged', onVoices)
      signal.addEventListener('abort', onAbort, { once: true })
      // Voice discovery can complete between the initial read and subscription.
      onVoices()
      if (signal.aborted) finish(null)
    })
  }

  private async playDevice(text: string, generation: number, controller: AbortController) {
    if (!this.owns(generation, controller)) return
    this.options.onPhase('queued')
    let voice: SpeechSynthesisVoice | null = null
    try {
      voice = await this.waitForLocalVoice(controller.signal)
    } catch {
      this.finish(generation, controller, 'unavailable')
      return
    }
    if (!this.owns(generation, controller)) return
    if (!voice || !this.environment.speech) {
      this.finish(generation, controller, 'unavailable')
      return
    }
    try {
      const utterance = this.environment.createUtterance(text)
      this.utterance = utterance
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.rate = 0.9
      utterance.pitch = 0.96
      const ownsUtterance = () => this.owns(generation, controller) && this.utterance === utterance
      utterance.onstart = () => {
        if (!ownsUtterance()) return
        this.options.onPhase('speaking')
        this.options.onNotice('device-playing')
      }
      utterance.onend = () => {
        if (!ownsUtterance()) return
        this.clearUtterance(false)
        this.finish(generation, controller)
      }
      utterance.onerror = () => {
        if (!ownsUtterance()) return
        this.clearUtterance(false)
        this.finish(generation, controller, 'unavailable')
      }
      this.environment.speech.speak(utterance)
    } catch {
      this.clearUtterance(true)
      this.finish(generation, controller, 'unavailable')
    }
  }

  private finish(generation: number, controller: AbortController, notice: OrbVoiceNotice = 'finished') {
    if (!this.owns(generation, controller)) return
    this.aborter = null
    this.options.onPhase('idle')
    this.options.onNotice(notice)
  }
}
