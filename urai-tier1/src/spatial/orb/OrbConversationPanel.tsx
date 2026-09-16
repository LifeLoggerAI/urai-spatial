'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { publishOrbState } from '@/app/home/orbStateController'
import { requestExternalVoiceAudio } from '@/spatial/narrator/elevenlabsClient'
import { URAI_VOICE_CONFIG } from '@/spatial/narrator/narratorCopy'
import { narratorPlayback } from '@/spatial/narrator/narratorPlayback'
import styles from './OrbConversationPanel.module.css'
import {
  emitOrbSpeechClock,
  ORB_RESPONSE_ANTICIPATION_MS,
  type OrbSpeechSource,
} from './orbSpeechClock'
import {
  attemptedExternalOrbFallback,
  deterministicOrbFallback,
  OrbProviderAttemptError,
  OrbProviderAttemptUncertainError,
  requestOpenAIOrb,
  uncertainExternalOrbFallback,
  type OrbConversationMessage,
  type OrbProviderResult,
} from './openaiClient'

const VAD_THRESHOLD = 0.035
const BARGE_IN_HOLD_MS = 70

function textResponseDurationMs(text: string) {
  return Math.min(8000, Math.max(1400, Math.round(text.length * 34)))
}

function speakWithDeviceVoice(
  text: string,
  handlers: {
    readonly onStart: () => void
    readonly onBoundary: (charIndex: number) => void
    readonly onDone: () => void
  },
) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    handlers.onDone()
    return
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.9
  utterance.pitch = 0.96
  utterance.lang = 'en-US'
  utterance.onstart = () => handlers.onStart()
  utterance.onboundary = (event) => handlers.onBoundary(event.charIndex)
  utterance.onend = () => handlers.onDone()
  utterance.onerror = () => handlers.onDone()
  window.speechSynthesis.speak(utterance)
}

function emitAudioCue(cue: 'orb-confirm' | 'error') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue } }))
}

export default function OrbConversationPanel() {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<OrbConversationMessage[]>([])
  const [result, setResult] = useState<OrbProviderResult | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [status, setStatus] = useState('Orb conversation is idle.')
  const [busy, setBusy] = useState(false)
  const [aiConsent, setAiConsent] = useState(false)
  const [externalVoiceConsent, setExternalVoiceConsent] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voicePlaying, setVoicePlaying] = useState(false)
  const [micActive, setMicActive] = useState(false)
  const aborter = useRef<AbortController | null>(null)
  const voiceAborter = useRef<AbortController | null>(null)
  const voiceAudio = useRef<HTMLAudioElement | null>(null)
  const voiceObjectUrl = useRef<string | null>(null)
  const voiceContext = useRef<AudioContext | null>(null)
  const voiceSource = useRef<MediaElementAudioSourceNode | null>(null)
  const voiceAnalyser = useRef<AnalyserNode | null>(null)
  const voiceFrame = useRef<number | null>(null)
  const voiceGeneration = useRef(0)
  const stateResetTimer = useRef<number | null>(null)
  const consentStateTimer = useRef<number | null>(null)
  const speechStartedAt = useRef<number | null>(null)
  const micActiveRef = useRef(false)
  const micStream = useRef<MediaStream | null>(null)
  const micContext = useRef<AudioContext | null>(null)
  const micAnalyser = useRef<AnalyserNode | null>(null)
  const micFrame = useRef<number | null>(null)
  const speechDetectedAt = useRef<number | null>(null)
  const bargeInCommitted = useRef(false)

  const cancelDeferredConsentState = () => {
    if (consentStateTimer.current === null) return
    window.clearTimeout(consentStateTimer.current)
    consentStateTimer.current = null
  }

  const publishConversationState = (state: 'idle' | 'attention' | 'listening' | 'thinking' | 'speaking' | 'privacy' | 'warning', resetAfterMs?: number) => {
    if (stateResetTimer.current !== null) {
      window.clearTimeout(stateResetTimer.current)
      stateResetTimer.current = null
    }
    publishOrbState(state, 'conversation')
    if (resetAfterMs) {
      stateResetTimer.current = window.setTimeout(() => {
        stateResetTimer.current = null
        publishOrbState(micActiveRef.current ? 'listening' : 'idle', 'conversation')
      }, resetAfterMs)
    }
  }

  const beginSpeakingClock = (source: Exclude<OrbSpeechSource, 'text'>) => {
    speechStartedAt.current = performance.now()
    setVoicePlaying(true)
    publishConversationState('speaking')
    emitOrbSpeechClock({ phase: 'start', source, elapsedMs: 0 })
  }

  const endSpeakingClock = (source: Exclude<OrbSpeechSource, 'text'>, phase: 'end' | 'cancel' = 'end') => {
    const started = speechStartedAt.current
    const elapsedMs = started === null ? undefined : Math.max(0, performance.now() - started)
    speechStartedAt.current = null
    setVoicePlaying(false)
    emitOrbSpeechClock({ phase, source, elapsedMs })
    publishConversationState(micActiveRef.current ? 'listening' : 'idle')
  }

  const stopNaturalVoiceAnalysis = () => {
    if (voiceFrame.current !== null) {
      window.cancelAnimationFrame(voiceFrame.current)
      voiceFrame.current = null
    }
    try { voiceSource.current?.disconnect() } catch { /* browser cleanup only */ }
    try { voiceAnalyser.current?.disconnect() } catch { /* browser cleanup only */ }
    voiceSource.current = null
    voiceAnalyser.current = null
    const context = voiceContext.current
    voiceContext.current = null
    if (context && context.state !== 'closed') void context.close().catch(() => undefined)
  }

  const startNaturalVoiceAnalysis = async (audio: HTMLAudioElement) => {
    if (typeof window === 'undefined' || voiceAudio.current !== audio) return false
    try {
      const context = new AudioContext()
      voiceContext.current = context
      await context.resume()
      if (context.state !== 'running' || voiceAudio.current !== audio) {
        stopNaturalVoiceAnalysis()
        return false
      }
      const source = context.createMediaElementSource(audio)
      const analyser = context.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.42
      source.connect(analyser)
      analyser.connect(context.destination)
      voiceSource.current = source
      voiceAnalyser.current = analyser
      const samples = new Float32Array(analyser.fftSize)
      let lastEmission = 0
      const sample = (now: number) => {
        if (voiceAudio.current !== audio || voiceAnalyser.current !== analyser) return
        analyser.getFloatTimeDomainData(samples)
        if (now - lastEmission >= 32) {
          let energy = 0
          for (const value of samples) energy += value * value
          const rms = Math.min(1, Math.sqrt(energy / Math.max(1, samples.length)))
          emitOrbSpeechClock({
            phase: 'frame',
            source: 'natural',
            elapsedMs: Math.max(0, audio.currentTime * 1000),
            durationMs: Number.isFinite(audio.duration) ? Math.max(0, audio.duration * 1000) : undefined,
            amplitude: rms,
          })
          lastEmission = now
        }
        voiceFrame.current = window.requestAnimationFrame(sample)
      }
      voiceFrame.current = window.requestAnimationFrame(sample)
      return true
    } catch {
      stopNaturalVoiceAnalysis()
      return false
    }
  }

  const waitForResponseAnticipation = async (source: OrbSpeechSource, generation: number, signal?: AbortSignal) => {
    emitOrbSpeechClock({ phase: 'anticipation', source, elapsedMs: 0, durationMs: ORB_RESPONSE_ANTICIPATION_MS })
    if (source === 'text') publishConversationState(micActiveRef.current ? 'listening' : 'attention')
    else publishConversationState('thinking')
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        signal?.removeEventListener('abort', finish)
        resolve()
      }
      const timer = window.setTimeout(finish, ORB_RESPONSE_ANTICIPATION_MS)
      if (signal) signal.addEventListener('abort', () => { window.clearTimeout(timer); finish() }, { once: true })
    })
    return voiceGeneration.current === generation && !signal?.aborted
  }

  const stopVoice = (publishIdle = false) => {
    voiceGeneration.current += 1
    const hadNaturalVoice = Boolean(voiceAudio.current)
    const hadDeviceVoice = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking

    voiceAborter.current?.abort()
    voiceAborter.current = null
    stopNaturalVoiceAnalysis()

    const activeAudio = voiceAudio.current
    if (activeAudio) {
      activeAudio.onended = null
      activeAudio.onerror = null
      activeAudio.ontimeupdate = null
      activeAudio.pause()
      activeAudio.currentTime = 0
      activeAudio.src = ''
      voiceAudio.current = null
    }

    if (voiceObjectUrl.current) {
      URL.revokeObjectURL(voiceObjectUrl.current)
      voiceObjectUrl.current = null
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    setVoicePlaying(false)

    if (hadNaturalVoice || hadDeviceVoice || speechStartedAt.current !== null) {
      const started = speechStartedAt.current
      const elapsedMs = started === null ? undefined : Math.max(0, performance.now() - started)
      speechStartedAt.current = null
      emitOrbSpeechClock({ phase: 'cancel', source: hadNaturalVoice ? 'natural' : 'device', elapsedMs })
    }

    if (publishIdle) publishConversationState(micActiveRef.current ? 'listening' : 'idle')
  }

  const stopMicrophone = async (publishState = true) => {
    if (micFrame.current !== null) {
      window.cancelAnimationFrame(micFrame.current)
      micFrame.current = null
    }
    speechDetectedAt.current = null
    bargeInCommitted.current = false
    micStream.current?.getTracks().forEach((track) => track.stop())
    micStream.current = null
    const context = micContext.current
    micContext.current = null
    micAnalyser.current = null
    if (context && context.state !== 'closed') {
      try { await context.close() } catch { /* browser cleanup only */ }
    }
    micActiveRef.current = false
    setMicActive(false)
    if (publishState && speechStartedAt.current === null && !busy) publishConversationState('idle')
  }

  const runVadLoop = () => {
    const analyser = micAnalyser.current
    if (!analyser || !micActiveRef.current) return
    const samples = new Float32Array(analyser.fftSize)
    analyser.getFloatTimeDomainData(samples)
    let energy = 0
    for (const sample of samples) energy += sample * sample
    const rms = Math.sqrt(energy / Math.max(1, samples.length))
    const now = performance.now()

    if (rms >= VAD_THRESHOLD) {
      if (speechDetectedAt.current === null) speechDetectedAt.current = now
      const heldMs = now - speechDetectedAt.current
      if (heldMs >= BARGE_IN_HOLD_MS && !bargeInCommitted.current) {
        bargeInCommitted.current = true
        const wasSpeaking = speechStartedAt.current !== null || voiceAudio.current !== null || (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking)
        if (wasSpeaking) {
          stopVoice(false)
          setStatus('Orb yielded to your voice. Listening locally for voice activity; this control does not upload or transcribe microphone audio.')
        }
        publishConversationState('listening')
      }
    } else {
      speechDetectedAt.current = null
      bargeInCommitted.current = false
    }

    micFrame.current = window.requestAnimationFrame(runVadLoop)
  }

  const startMicrophone = async () => {
    if (typeof window === 'undefined') return
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('Microphone activity detection is not available in this browser. Text conversation remains available.')
      publishConversationState('warning', 2200)
      return
    }

    await stopMicrophone(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
      micStream.current = stream
      const context = new AudioContext()
      micContext.current = context
      await context.resume()
      const source = context.createMediaStreamSource(stream)
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      analyser.smoothingTimeConstant = 0.35
      source.connect(analyser)
      micAnalyser.current = analyser
      micActiveRef.current = true
      setMicActive(true)
      setStatus('Listening locally for voice activity. Microphone audio is not uploaded or transcribed by this control.')
      if (speechStartedAt.current === null) publishConversationState('listening')
      runVadLoop()
    } catch {
      await stopMicrophone(false)
      setStatus('Microphone permission is unavailable. Text conversation remains available.')
      publishConversationState('privacy', 2200)
    }
  }

  const playTextOnlyResponse = async (text: string) => {
    const generation = ++voiceGeneration.current
    if (!await waitForResponseAnticipation('text', generation)) return
    const duration = textResponseDurationMs(text)
    emitOrbSpeechClock({ phase: 'frame', source: 'text', elapsedMs: 0, durationMs: duration })
    publishConversationState(micActiveRef.current ? 'listening' : 'attention')
    stateResetTimer.current = window.setTimeout(() => {
      stateResetTimer.current = null
      if (voiceGeneration.current !== generation) return
      emitOrbSpeechClock({ phase: 'end', source: 'text', elapsedMs: duration, durationMs: duration })
      publishConversationState(micActiveRef.current ? 'listening' : 'idle')
    }, duration)
  }

  const playDeviceVoice = async (text: string) => {
    if (voiceMuted) {
      void playTextOnlyResponse(text)
      return
    }

    const generation = ++voiceGeneration.current
    if (!await waitForResponseAnticipation('device', generation)) return
    speakWithDeviceVoice(text, {
      onStart: () => {
        if (voiceGeneration.current !== generation) return
        beginSpeakingClock('device')
      },
      onBoundary: (charIndex) => {
        if (voiceGeneration.current !== generation) return
        const started = speechStartedAt.current
        emitOrbSpeechClock({
          phase: 'boundary',
          source: 'device',
          elapsedMs: started === null ? undefined : Math.max(0, performance.now() - started),
          charIndex,
        })
      },
      onDone: () => {
        if (voiceGeneration.current !== generation) return
        endSpeakingClock('device')
      },
    })
  }

  const speakOrbResponse = async (text: string) => {
    if (typeof window === 'undefined') return
    stopVoice(false)

    if (voiceMuted) {
      void playTextOnlyResponse(text)
      return
    }

    if (externalVoiceConsent) {
      const controller = new AbortController()
      voiceAborter.current = controller
      setStatus('Orb is preparing the natural voice.')

      const blob = await requestExternalVoiceAudio(
        { text, voiceId: URAI_VOICE_CONFIG.neutral.voiceId, tone: 'neutral' },
        controller.signal,
        true,
      )
      if (controller.signal.aborted) return

      if (blob) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        const generation = ++voiceGeneration.current
        voiceObjectUrl.current = url
        voiceAudio.current = audio

        const release = (finishSpeech: boolean) => {
          stopNaturalVoiceAnalysis()
          if (voiceAudio.current === audio) voiceAudio.current = null
          if (voiceObjectUrl.current === url) {
            URL.revokeObjectURL(url)
            voiceObjectUrl.current = null
          }
          if (voiceAborter.current === controller) voiceAborter.current = null
          audio.onended = null
          audio.onerror = null
          audio.ontimeupdate = null
          if (speechStartedAt.current !== null) endSpeakingClock('natural', finishSpeech ? 'end' : 'cancel')
        }

        audio.onended = () => release(true)
        audio.onerror = () => {
          const canFallback = !controller.signal.aborted && voiceGeneration.current === generation
          release(false)
          if (canFallback) void playDeviceVoice(text)
        }
        audio.ontimeupdate = () => {
          if (voiceAnalyser.current) return
          emitOrbSpeechClock({
            phase: 'frame',
            source: 'natural',
            elapsedMs: Math.max(0, audio.currentTime * 1000),
            durationMs: Number.isFinite(audio.duration) ? Math.max(0, audio.duration * 1000) : undefined,
          })
        }

        if (!await waitForResponseAnticipation('natural', generation, controller.signal)) {
          release(false)
          return
        }

        try {
          await audio.play()
          if (voiceGeneration.current !== generation || controller.signal.aborted || voiceAudio.current !== audio) {
            release(false)
            return
          }
          beginSpeakingClock('natural')
          void startNaturalVoiceAnalysis(audio)
          setStatus('Live Orb response ready. Natural voice is playing.')
          return
        } catch {
          const canFallback = !controller.signal.aborted && voiceGeneration.current === generation
          audio.pause()
          release(false)
          if (canFallback) {
            setStatus('Live Orb response ready. Natural voice playback is unavailable, so the device voice is being used.')
            void playDeviceVoice(text)
            return
          }
        }
      }

      if (voiceAborter.current === controller) voiceAborter.current = null
      setStatus('Live Orb response ready. Natural voice is unavailable, so the device voice is being used.')
    }

    void playDeviceVoice(text)
  }

  useEffect(() => {
    narratorPlayback.setExternalVoiceConsent(externalVoiceConsent)
    return () => narratorPlayback.setExternalVoiceConsent(false)
  }, [externalVoiceConsent])

  useEffect(() => () => {
    voiceGeneration.current += 1
    aborter.current?.abort()
    voiceAborter.current?.abort()
    stopNaturalVoiceAnalysis()
    if (micFrame.current !== null) window.cancelAnimationFrame(micFrame.current)
    micStream.current?.getTracks().forEach((track) => track.stop())
    const context = micContext.current
    if (context && context.state !== 'closed') void context.close()
    const activeAudio = voiceAudio.current
    if (activeAudio) {
      activeAudio.onended = null
      activeAudio.onerror = null
      activeAudio.ontimeupdate = null
      activeAudio.pause()
      activeAudio.src = ''
    }
    if (voiceObjectUrl.current) URL.revokeObjectURL(voiceObjectUrl.current)
    if (stateResetTimer.current !== null) window.clearTimeout(stateResetTimer.current)
    if (consentStateTimer.current !== null) window.clearTimeout(consentStateTimer.current)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
    publishOrbState('idle', 'conversation')
  }, [])

  const stop = () => {
    cancelDeferredConsentState()
    aborter.current?.abort()
    aborter.current = null
    stopVoice(true)
    setBusy(false)
    setStatus('Orb response stopped.')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || busy) return
    if (!aiConsent) {
      setStatus('Turn on OpenAI processing consent before sending.')
      publishConversationState('privacy', 1800)
      return
    }

    cancelDeferredConsentState()
    aborter.current?.abort()
    stopVoice(false)
    const controller = new AbortController()
    aborter.current = controller
    setBusy(true)
    setResult(null)
    setStreamedText('')
    setStatus('Orb is responding through the live provider.')
    publishConversationState('thinking')

    try {
      const liveResult = await requestOpenAIOrb({
        message: trimmed,
        context: history,
        aiProcessingConsent: true,
        signal: controller.signal,
        onEvent: (providerEvent) => {
          if (providerEvent.type === 'delta') {
            setStreamedText((current) => current + providerEvent.text)
          } else if (providerEvent.type === 'status') {
            publishConversationState('thinking')
            setStatus('Orb is preparing a response.')
          }
        },
      })
      if (controller.signal.aborted) return

      const resolved = liveResult ?? deterministicOrbFallback(trimmed)
      setResult(resolved)
      setStreamedText(resolved.message)
      if (liveResult) {
        setHistory((current) => [
          ...current.slice(-6),
          { role: 'user', content: trimmed },
          { role: 'assistant', content: liveResult.message },
        ])
      }
      setMessage('')
      setStatus(resolved.provider === 'openai' ? 'Live Orb response ready.' : 'Local fallback response ready.')
      emitAudioCue('orb-confirm')
      if (resolved.provider === 'openai') void speakOrbResponse(resolved.message)
      else void playDeviceVoice(resolved.message)
    } catch (error) {
      if (controller.signal.aborted) return
      const fallback = error instanceof OrbProviderAttemptError
        ? attemptedExternalOrbFallback(trimmed)
        : error instanceof OrbProviderAttemptUncertainError
          ? uncertainExternalOrbFallback(trimmed)
          : deterministicOrbFallback(trimmed)
      setResult(fallback)
      setStreamedText(fallback.message)
      setStatus(error instanceof OrbProviderAttemptError
        ? 'External provider attempt did not return an answer; truthful local fallback ready.'
        : error instanceof OrbProviderAttemptUncertainError
          ? 'External processing state could not be confirmed; cautious local fallback ready.'
          : 'Live provider unavailable before external processing; local fallback response ready.')
      publishConversationState('warning', 2400)
      emitAudioCue('error')
      if (!voiceMuted) void playDeviceVoice(fallback.message)
    } finally {
      if (aborter.current === controller) aborter.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <details className={styles.panel}>
      <summary>Talk with Orb</summary>
      <div className={styles.body}>
        <p className={styles.disclosure}>
          OpenAI processing and natural external voice processing are separate, optional permissions. The device voice remains local.
        </p>
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="urai-orb-message">Message for Orb</label>
          <textarea
            id="urai-orb-message"
            value={message}
            maxLength={2000}
            rows={3}
            disabled={busy}
            onFocus={() => {
              if (voicePlaying) stopVoice(false)
              publishConversationState(micActiveRef.current ? 'listening' : 'attention')
            }}
            onBlur={() => { if (!busy && !voicePlaying) publishConversationState(micActiveRef.current ? 'listening' : 'idle') }}
            onChange={(event) => setMessage(event.target.value)}
          />
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={aiConsent}
              disabled={busy}
              onChange={(event) => {
                const checked = event.target.checked
                setAiConsent(checked)
                cancelDeferredConsentState()
                consentStateTimer.current = window.setTimeout(() => {
                  consentStateTimer.current = null
                  publishConversationState(checked ? (micActiveRef.current ? 'listening' : 'attention') : 'privacy')
                }, 0)
              }}
            />
            Allow this message and bounded recent context to be processed by OpenAI.
          </label>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={externalVoiceConsent}
              onChange={(event) => setExternalVoiceConsent(event.target.checked)}
            />
            Allow Orb replies and narrator lines to use the configured natural external voice provider this session.
          </label>
          <div className={styles.actions}>
            <button type="submit" disabled={busy || !message.trim() || !aiConsent}>Send</button>
            <button type="button" disabled={!busy && !voicePlaying} onClick={stop}>Stop</button>
            <button
              type="button"
              aria-pressed={micActive}
              onClick={() => { if (micActive) void stopMicrophone(); else void startMicrophone() }}
            >
              {micActive ? 'Mic listening' : 'Start mic'}
            </button>
            <button
              type="button"
              aria-pressed={!voiceMuted}
              onClick={() => {
                const next = !voiceMuted
                if (next) stopVoice(false)
                setVoiceMuted(next)
              }}
            >
              {voiceMuted ? 'Voice muted' : 'Voice on'}
            </button>
            <button type="button" disabled={!result} onClick={() => {
              if (!result) return
              cancelDeferredConsentState()
              if (result.provider === 'openai') void speakOrbResponse(result.message)
              else void playDeviceVoice(result.message)
            }}>
              Replay
            </button>
          </div>
        </form>
        <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        {streamedText ? (
          <section className={styles.response} aria-label="Orb response">
            <p>{streamedText}</p>
            {result ? <small>{result.disclosure}</small> : null}
            {result?.suggestedActions.length ? (
              <ul>{result.suggestedActions.map((action) => <li key={action}>{action}</li>)}</ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  )
}
