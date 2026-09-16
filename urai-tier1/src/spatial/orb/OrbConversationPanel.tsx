'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { publishOrbState } from '@/app/home/orbStateController'
import { requestExternalVoiceAudio } from '@/spatial/narrator/elevenlabsClient'
import { URAI_VOICE_CONFIG } from '@/spatial/narrator/narratorCopy'
import { narratorPlayback } from '@/spatial/narrator/narratorPlayback'
import styles from './OrbConversationPanel.module.css'
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

type OrbSpeechClockDetail = {
  readonly phase: 'start' | 'boundary' | 'frame' | 'end' | 'cancel'
  readonly source: 'natural' | 'device' | 'text'
  readonly elapsedMs?: number
  readonly durationMs?: number
  readonly charIndex?: number
}

const ORB_SPEECH_CLOCK_EVENT = 'urai:orb-speech-clock'

function emitSpeechClock(detail: OrbSpeechClockDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OrbSpeechClockDetail>(ORB_SPEECH_CLOCK_EVENT, { detail }))
}

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
  const aborter = useRef<AbortController | null>(null)
  const voiceAborter = useRef<AbortController | null>(null)
  const voiceAudio = useRef<HTMLAudioElement | null>(null)
  const voiceObjectUrl = useRef<string | null>(null)
  const stateResetTimer = useRef<number | null>(null)
  const consentStateTimer = useRef<number | null>(null)
  const speechStartedAt = useRef<number | null>(null)

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
        publishOrbState('idle', 'conversation')
      }, resetAfterMs)
    }
  }

  const beginSpeakingClock = (source: OrbSpeechClockDetail['source']) => {
    speechStartedAt.current = performance.now()
    setVoicePlaying(source !== 'text')
    publishConversationState('speaking')
    emitSpeechClock({ phase: 'start', source, elapsedMs: 0 })
  }

  const endSpeakingClock = (source: OrbSpeechClockDetail['source'], phase: 'end' | 'cancel' = 'end') => {
    const started = speechStartedAt.current
    const elapsedMs = started === null ? undefined : Math.max(0, performance.now() - started)
    speechStartedAt.current = null
    setVoicePlaying(false)
    emitSpeechClock({ phase, source, elapsedMs })
    publishConversationState('idle')
  }

  const stopVoice = (publishIdle = false) => {
    const hadNaturalVoice = Boolean(voiceAudio.current)
    const hadDeviceVoice = typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking

    voiceAborter.current?.abort()
    voiceAborter.current = null

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
      emitSpeechClock({ phase: 'cancel', source: hadNaturalVoice ? 'natural' : 'device', elapsedMs })
    }

    if (publishIdle) publishConversationState('idle')
  }

  const playTextOnlyResponse = (text: string) => {
    beginSpeakingClock('text')
    const duration = textResponseDurationMs(text)
    emitSpeechClock({ phase: 'frame', source: 'text', elapsedMs: 0, durationMs: duration })
    stateResetTimer.current = window.setTimeout(() => {
      stateResetTimer.current = null
      endSpeakingClock('text')
    }, duration)
  }

  const playDeviceVoice = (text: string) => {
    if (voiceMuted) {
      playTextOnlyResponse(text)
      return
    }

    speakWithDeviceVoice(text, {
      onStart: () => beginSpeakingClock('device'),
      onBoundary: (charIndex) => {
        const started = speechStartedAt.current
        emitSpeechClock({
          phase: 'boundary',
          source: 'device',
          elapsedMs: started === null ? undefined : Math.max(0, performance.now() - started),
          charIndex,
        })
      },
      onDone: () => endSpeakingClock('device'),
    })
  }

  const speakOrbResponse = async (text: string) => {
    if (typeof window === 'undefined') return
    stopVoice(false)

    if (voiceMuted) {
      playTextOnlyResponse(text)
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
      if (voiceAborter.current === controller) voiceAborter.current = null
      if (controller.signal.aborted) return

      if (blob) {
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        voiceObjectUrl.current = url
        voiceAudio.current = audio

        const cleanup = (phase: 'end' | 'cancel' = 'end') => {
          if (voiceAudio.current === audio) voiceAudio.current = null
          if (voiceObjectUrl.current === url) {
            URL.revokeObjectURL(url)
            voiceObjectUrl.current = null
          }
          audio.ontimeupdate = null
          endSpeakingClock('natural', phase)
        }

        audio.onended = () => cleanup('end')
        audio.onerror = () => {
          if (voiceAudio.current === audio) voiceAudio.current = null
          if (voiceObjectUrl.current === url) {
            URL.revokeObjectURL(url)
            voiceObjectUrl.current = null
          }
          audio.ontimeupdate = null
          if (!controller.signal.aborted) playDeviceVoice(text)
        }
        audio.ontimeupdate = () => {
          emitSpeechClock({
            phase: 'frame',
            source: 'natural',
            elapsedMs: Math.max(0, audio.currentTime * 1000),
            durationMs: Number.isFinite(audio.duration) ? Math.max(0, audio.duration * 1000) : undefined,
          })
        }

        try {
          await audio.play()
          beginSpeakingClock('natural')
          setStatus('Live Orb response ready. Natural voice is playing.')
          return
        } catch {
          audio.onended = null
          audio.onerror = null
          audio.ontimeupdate = null
          audio.pause()
          if (voiceAudio.current === audio) voiceAudio.current = null
          if (voiceObjectUrl.current === url) {
            URL.revokeObjectURL(url)
            voiceObjectUrl.current = null
          }
          if (controller.signal.aborted) return
        }
      }

      setStatus('Live Orb response ready. Natural voice is unavailable, so the device voice is being used.')
    }

    playDeviceVoice(text)
  }

  useEffect(() => {
    narratorPlayback.setExternalVoiceConsent(externalVoiceConsent)
    return () => narratorPlayback.setExternalVoiceConsent(false)
  }, [externalVoiceConsent])

  useEffect(() => () => {
    aborter.current?.abort()
    voiceAborter.current?.abort()
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
      else playDeviceVoice(resolved.message)
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
      if (!voiceMuted) playDeviceVoice(fallback.message)
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
              publishConversationState('attention')
            }}
            onBlur={() => { if (!busy && !voicePlaying) publishConversationState('idle') }}
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
                  publishConversationState(checked ? 'attention' : 'privacy')
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
              else playDeviceVoice(result.message)
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
