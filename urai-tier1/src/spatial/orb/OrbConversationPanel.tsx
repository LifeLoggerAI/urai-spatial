'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { publishOrbState } from '@/app/home/orbStateController'
import { requestExternalVoiceAudio } from '@/spatial/narrator/elevenlabsClient'
import { URAI_VOICE_CONFIG } from '@/spatial/narrator/narratorCopy'
import { narratorPlayback } from '@/spatial/narrator/narratorPlayback'
import { sensorySafeEnabled, URAI_SENSORY_SAFE_EVENT, URAI_SENSORY_SAFE_STORAGE_KEY } from '@/spatial/accessibility/SensorySafeRuntime'
import { OrbVoicePlayback, type OrbVoicePhase } from './orbVoicePlayback'
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

function emitAudioCue(cue: 'orb-confirm' | 'error') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue } }))
}

export default function OrbConversationPanel({ active = true }: { active?: boolean }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<OrbConversationMessage[]>([])
  const [result, setResult] = useState<OrbProviderResult | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [status, setStatus] = useState('Orb conversation is idle.')
  const [busy, setBusy] = useState(false)
  const [aiConsent, setAiConsent] = useState(false)
  const [externalVoiceConsent, setExternalVoiceConsent] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [voicePhase, setVoicePhase] = useState<OrbVoicePhase>('idle')
  const voicePlaying = voicePhase !== 'idle'
  const aborter = useRef<AbortController | null>(null)
  const voicePlayback = useRef<OrbVoicePlayback | null>(null)
  const voicePreferences = useRef({ muted: false, externalConsent: false, active, sensorySafe: false })
  const stateResetTimer = useRef<number | null>(null)

  const publishConversationState = useCallback((state: 'idle' | 'attention' | 'thinking' | 'speaking' | 'privacy' | 'warning', resetAfterMs?: number) => {
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
  }, [])

  const stopVoice = useCallback(() => {
    voicePlayback.current?.stop()
    setVoicePhase('idle')
  }, [])

  const muteVoiceForComfort = useCallback(() => {
    voicePreferences.current.muted = true
    setVoiceMuted(true)
    stopVoice()
    setStatus('Low stimulation is on. Orb voice remains muted; turn low stimulation off before enabling voice. Text replies remain available.')
  }, [stopVoice])

  const getVoicePlayback = () => {
    if (!voicePlayback.current) {
      voicePlayback.current = new OrbVoicePlayback({
        requestExternalAudio: (text, signal) => requestExternalVoiceAudio(
          { text, voiceId: URAI_VOICE_CONFIG.neutral.voiceId, tone: 'neutral' }, signal, true,
        ),
        onPhase: (phase) => {
          setVoicePhase(phase)
          publishConversationState(phase === 'speaking' ? 'speaking' : phase === 'idle' ? 'idle' : 'thinking')
        },
        onNotice: (notice) => {
          const captions = {
            preparing: 'Orb response ready. Preparing the natural voice.',
            'external-playing': 'Orb response ready. Natural voice is playing.',
            'device-playing': 'Orb response ready. Local device voice is playing.',
            'external-unavailable': 'Natural voice is unavailable. Checking for a local device voice.',
            unavailable: 'Orb response ready. Voice playback is unavailable; the text remains available.',
            finished: 'Orb voice finished. The response remains available.',
          }
          setStatus(captions[notice])
        },
      })
    }
    return voicePlayback.current
  }

  const playDeviceVoice = (text: string) => {
    if (sensorySafeEnabled() || voicePreferences.current.sensorySafe) {
      muteVoiceForComfort()
      return
    }
    if (!voicePreferences.current.muted && voicePreferences.current.active) void getVoicePlayback().play(text, false)
  }

  const speakOrbResponse = async (text: string) => {
    if (sensorySafeEnabled() || voicePreferences.current.sensorySafe) {
      muteVoiceForComfort()
      return
    }
    const preferences = voicePreferences.current
    if (!preferences.muted && preferences.active) await getVoicePlayback().play(text, preferences.externalConsent)
  }

  useEffect(() => {
    const muteForComfort = (enabled: boolean) => {
      voicePreferences.current.sensorySafe = enabled
      if (enabled) muteVoiceForComfort()
      else if (voicePreferences.current.muted) setStatus('Low stimulation is off. Orb voice remains muted until you choose Voice on.')
    }
    muteForComfort(sensorySafeEnabled())
    const onSensory = (event: CustomEvent<{ enabled: boolean }>) => muteForComfort(event.detail.enabled === true)
    const onStorage = (event: StorageEvent) => {
      if (event.key === URAI_SENSORY_SAFE_STORAGE_KEY || event.key === null) muteForComfort(sensorySafeEnabled())
    }
    window.addEventListener(URAI_SENSORY_SAFE_EVENT, onSensory)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(URAI_SENSORY_SAFE_EVENT, onSensory)
      window.removeEventListener('storage', onStorage)
    }
  }, [muteVoiceForComfort])

  useEffect(() => {
    narratorPlayback.setExternalVoiceConsent(active && externalVoiceConsent)
    return () => narratorPlayback.setExternalVoiceConsent(false)
  }, [active, externalVoiceConsent])

  useEffect(() => {
    voicePreferences.current.active = active
    if (active) return
    aborter.current?.abort()
    aborter.current = null
    stopVoice()
    setBusy(false)
    publishConversationState('idle')
  }, [active, publishConversationState, stopVoice])

  useEffect(() => () => {
    aborter.current?.abort()
    voicePlayback.current?.stop()
    if (stateResetTimer.current !== null) window.clearTimeout(stateResetTimer.current)
    publishOrbState('idle', 'conversation')
  }, [])

  const stop = () => {
    aborter.current?.abort()
    aborter.current = null
    stopVoice()
    setBusy(false)
    setStatus('Orb response stopped.')
    publishConversationState('idle')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || busy || !active) return
    if (!aiConsent) {
      setStatus('Turn on OpenAI processing consent before sending.')
      publishConversationState('privacy', 1800)
      return
    }

    aborter.current?.abort()
    stopVoice()
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
          if (controller.signal.aborted || aborter.current !== controller) return
          if (providerEvent.type === 'delta') {
            setStreamedText((current) => current + providerEvent.text)
          } else if (providerEvent.type === 'status') {
            publishConversationState('thinking')
            setStatus('Orb is preparing a response.')
          }
        },
      })
      if (controller.signal.aborted || aborter.current !== controller) return

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
      publishConversationState('attention', 1800)
      emitAudioCue('orb-confirm')
      if (!voicePreferences.current.muted) {
        if (resolved.provider === 'openai') void speakOrbResponse(resolved.message)
        else playDeviceVoice(resolved.message)
      }
    } catch (error) {
      if (controller.signal.aborted || aborter.current !== controller) return
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
      if (!voicePreferences.current.muted) playDeviceVoice(fallback.message)
    } finally {
      if (aborter.current === controller) aborter.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  return (
    <details className={styles.panel} data-orb-voice-phase={voicePhase} onToggle={(event) => {
      if (!event.currentTarget.open) stop()
    }}>
      <summary>Talk with Orb</summary>
      <div className={styles.body}>
        <p className={styles.disclosure}>
          OpenAI processing and natural external voice processing are separate, optional permissions. Device speech uses an available local voice; otherwise the response stays in text.
        </p>
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="urai-orb-message">Message for Orb</label>
          <textarea
            id="urai-orb-message"
            value={message}
            maxLength={2000}
            rows={3}
            disabled={busy}
            onFocus={() => { if (!busy && !voicePlaying) publishConversationState('attention') }}
            onBlur={() => { if (!busy && !voicePlaying) publishConversationState('idle') }}
            onChange={(event) => setMessage(event.target.value)}
          />
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(event) => {
                const allowed = event.target.checked
                setAiConsent(allowed)
                if (!allowed) {
                  aborter.current?.abort()
                  aborter.current = null
                  stopVoice()
                  setBusy(false)
                  setStatus('OpenAI consent revoked. This device canceled the current request and stopped Orb voice.')
                }
                publishConversationState(allowed ? 'attention' : 'privacy', 1800)
              }}
            />
            Allow this message and bounded recent context to be processed by OpenAI.
          </label>
          <label className={styles.consent}>
            <input
              type="checkbox"
              checked={externalVoiceConsent}
              onChange={(event) => {
                const allowed = event.target.checked
                voicePreferences.current.externalConsent = allowed
                setExternalVoiceConsent(allowed)
                if (!allowed) {
                  stopVoice()
                  setStatus('External voice consent revoked. Current Orb voice stopped.')
                  publishConversationState('privacy', 1800)
                }
              }}
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
                if (sensorySafeEnabled() || voicePreferences.current.sensorySafe) {
                  muteVoiceForComfort()
                  return
                }
                const next = !voiceMuted
                voicePreferences.current.muted = next
                if (next) stopVoice()
                setVoiceMuted(next)
                setStatus(next ? 'Voice muted. Text replies remain available.' : 'Voice on. Replay a response to hear it.')
              }}
            >
              {voiceMuted ? 'Voice muted' : 'Voice on'}
            </button>
            <button type="button" disabled={!result || voiceMuted} onClick={() => {
              if (!result) return
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
