'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { getAIActorSnapshot, getServerAIActorSnapshot, isCurrentAIActorSnapshot, subscribeAIActor, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'
import { publishOrbState } from '@/app/home/orbStateController'
import { requestOrbContinuity } from './orbContinuityClient'
import { createPossibleFutureClient } from '@/lib/scenario/scenarioClient'
import { readOrbActivity } from './orbActivityClient'
import type { OrbActivityItem } from './orbActivityClient'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import type { OrbContinuityState } from './orbContinuityClient'
import { requestExternalVoiceAudio } from '@/spatial/narrator/elevenlabsClient'
import { URAI_VOICE_CONFIG } from '@/spatial/narrator/narratorCopy'
import { narratorPlayback } from '@/spatial/narrator/narratorPlayback'
import { sensorySafeEnabled, URAI_SENSORY_SAFE_EVENT, URAI_SENSORY_SAFE_STORAGE_KEY } from '@/spatial/accessibility/SensorySafeRuntime'
import { OrbVoicePlayback, type OrbVoicePhase } from './orbVoicePlayback'
import styles from './OrbConversationPanel.module.css'
import { currentSpeechTag } from '@/lib/i18n/localePreference'
import { contentLanguageProps } from '@/lib/i18n/contentLanguage'
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
  const actor = useSyncExternalStore(subscribeAIActor, getAIActorSnapshot, getServerAIActorSnapshot)
  return <ActorBoundOrbConversationPanel key={actor.generation} active={active} actor={actor} />
}

function ActorBoundOrbConversationPanel({ active, actor }: { active: boolean; actor: AIActorSnapshot }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<OrbConversationMessage[]>([])
  const [continuity, setContinuity] = useState<OrbContinuityState | null>(null)
  const [continuityBusy, setContinuityBusy] = useState(false)
  const [scenarioBusy, setScenarioBusy] = useState(false)
  const [activityBusy, setActivityBusy] = useState(false)
  const [activity, setActivity] = useState<OrbActivityItem[] | null>(null)
  const [continuityHydrating, setContinuityHydrating] = useState(Boolean(actor.uid))
  const continuityRef = useRef<OrbContinuityState | null>(null)
  const continuityPending = useRef<Promise<unknown>>(Promise.resolve())
  const [result, setResult] = useState<OrbProviderResult | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [responseLocale, setResponseLocale] = useState('en-US')
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
  // A What-If begins only when the owner explicitly presses its button.
  // Do not send the remainder of conversation history or private life data.
  const latestUserTurn = [...history].reverse().find(turn => turn.role === 'user')?.content ?? ''
  const whatIfQuestion = message.trim() || latestUserTurn.trim()

  useEffect(() => {
    if (!actor.uid || !actor.actor) return
    let cancelled = false
    void requestOrbContinuity(actor, { action: 'read' }).then(saved => {
      if (cancelled || !saved || !isCurrentAIActorSnapshot(actor)) return
      continuityRef.current = saved
      setContinuity(saved)
      if (saved.enabled) setHistory(saved.messages)
    }).catch(() => {
      if (!cancelled && isCurrentAIActorSnapshot(actor)) setStatus('Private conversation continuity is unavailable; this chat remains temporary.')
    }).finally(() => {
      if (!cancelled && isCurrentAIActorSnapshot(actor)) setContinuityHydrating(false)
    })
    return () => { cancelled = true; continuityRef.current = null }
  }, [actor])

  const changeContinuity = async (action: 'enable' | 'disable' | 'clear') => {
    if (!isCurrentAIActorSnapshot(actor) || continuityBusy || continuityHydrating || busy) return
    setContinuityBusy(true)
    try {
      // Clear/disable must not be overtaken by a completed in-flight save.
      await continuityPending.current.catch(() => undefined)
      if (!isCurrentAIActorSnapshot(actor)) return
      const input = action === 'enable'
        ? { action: 'enable' as const, seed: history.slice(-20), epoch: continuityRef.current?.epoch ?? null }
        : action === 'clear'
          ? { action: 'clear' as const, epoch: continuityRef.current?.epoch ?? '' }
          : { action: 'disable' as const }
      const saved = await requestOrbContinuity(actor, input)
      if (!saved) return
      continuityRef.current = saved
      setContinuity(saved)
      if (action === 'clear') setHistory([])
      if (action === 'disable') setHistory([])
      setStatus(action === 'enable' ? 'Private Orb continuity enabled.' : action === 'clear' ? 'Saved Orb conversation cleared.' : 'Private Orb continuity disabled and stored transcript deleted.')
    } catch {
      setStatus('Unable to change saved conversation. Check your current memory/privacy permissions.')
    } finally {
      if (isCurrentAIActorSnapshot(actor)) setContinuityBusy(false)
    }
  }

  const showActivity = async () => {
    if (!actor.uid || !isCurrentAIActorSnapshot(actor) || busy || activityBusy) return
    setActivityBusy(true)
    try {
      const items = await readOrbActivity(actor)
      if (!isCurrentAIActorSnapshot(actor)) return
      if (items === null) return
      setActivity(items)
      setStatus('This is a private activity record, not independently verified autobiographical memory.')
    } catch {
      if (isCurrentAIActorSnapshot(actor)) {
        setActivity(null)
        setStatus('Activity could not be loaded with current permissions.')
      }
    } finally {
      if (isCurrentAIActorSnapshot(actor)) setActivityBusy(false)
    }
  }

  const exploreWhatIf = async () => {
    if (!actor.uid || !isCurrentAIActorSnapshot(actor)
      || busy || scenarioBusy || continuityBusy || continuityHydrating) return
    const question = whatIfQuestion.trim()
    if (!question || question.length > 1200) {
      setStatus('A What-If question must be between 1 and 1200 characters.')
      return
    }
    setScenarioBusy(true)
    setStatus('Creating your assumption-only Possible Future. No AI or workers are being started.')
    try {
      const returnToken = `orb-what-if-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`
      const created = await createPossibleFutureClient({
        question, originRealm: 'home', returnToken,
        worldRevision: 'orb-conversation-question-v1',
        assumptionOnly: true, timeHorizon: { amount: 1, unit: 'month' },
      })
      // A late response from a previous owner must not move a new owner
      // into somebody else's private scenario.
      if (!isCurrentAIActorSnapshot(actor)) return
      if (!/^scn_[A-Za-z0-9_-]{12,96}$/.test(created.scenarioId)
        || !Number.isSafeInteger(created.basisRevision) || created.basisRevision < 1) {
        throw new Error('Invalid Scenario receipt.')
      }
      requestUraiWorldTravel({
        destination: 'possible-futures',
        href: '/possible-futures',
        entryPortal: 'orb-conversation-what-if',
        cameraCheckpoint: 'possible-futures-arrival',
        context: {
          scenarioId: created.scenarioId,
          scenarioBasisRevision: created.basisRevision,
          scenarioOrigin: 'home',
          truthMode: 'scenario',
          returnToken,
        },
      })
      setStatus('Possible Future created. This remains a hypothetical scenario, not a memory.')
    } catch {
      if (isCurrentAIActorSnapshot(actor)) {
        setStatus('Could not create a Possible Future. No simulated outcome was recorded as reality.')
      }
    } finally {
      if (isCurrentAIActorSnapshot(actor)) setScenarioBusy(false)
    }
  }

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

  useEffect(() => {
    const unsubscribe = subscribeAIActor(() => {
      if (!isCurrentAIActorSnapshot(actor)) {
        aborter.current?.abort(); aborter.current = null
        voicePreferences.current.externalConsent = false
        narratorPlayback.setExternalVoiceConsent(false)
        stopVoice()
      }
    })
    return unsubscribe
  }, [actor, stopVoice])

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

  const playDeviceVoice = (text: string, locale = 'en-US') => {
    if (!isCurrentAIActorSnapshot(actor)) return
    if (sensorySafeEnabled() || voicePreferences.current.sensorySafe) {
      muteVoiceForComfort()
      return
    }
    if (!voicePreferences.current.muted && voicePreferences.current.active) void getVoicePlayback().play(text, false, locale)
  }

  const speakOrbResponse = async (text: string, locale: string) => {
    if (!isCurrentAIActorSnapshot(actor)) return
    if (sensorySafeEnabled() || voicePreferences.current.sensorySafe) {
      muteVoiceForComfort()
      return
    }
    const preferences = voicePreferences.current
    if (!preferences.muted && preferences.active) await getVoicePlayback().play(text, preferences.externalConsent, locale)
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
    if (!isCurrentAIActorSnapshot(actor)) return
    const trimmed = message.trim()
    if (!trimmed || busy || scenarioBusy || !active || continuityBusy || continuityHydrating) return
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
    const requestedLocale = currentSpeechTag()
    setResponseLocale(requestedLocale)
    setStatus('Orb is responding through the live provider.')
    publishConversationState('thinking')

    try {
      const liveResult = await requestOpenAIOrb({
        message: trimmed,
        context: history,
        aiProcessingConsent: true,
        locale: requestedLocale,
        signal: controller.signal,
        onEvent: (providerEvent) => {
          if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
          if (providerEvent.type === 'delta') {
            setStreamedText((current) => current + providerEvent.text)
          } else if (providerEvent.type === 'status') {
            publishConversationState('thinking')
            setStatus('Orb is preparing a response.')
          }
        },
      })
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return

      const resolved = liveResult ?? deterministicOrbFallback(trimmed)
      setResult(resolved)
      setResponseLocale(resolved.locale)
      setStreamedText(resolved.message)
      if (liveResult) {
        const savedAtSend = continuityRef.current
        if (savedAtSend?.enabled && savedAtSend.epoch) {
          const turnId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : ''
          if (turnId) {
            continuityPending.current = continuityPending.current.catch(() => undefined).then(async () => {
              if (!isCurrentAIActorSnapshot(actor)) return
              const current = continuityRef.current
              if (!current?.enabled || current.epoch !== savedAtSend.epoch) return
              const persisted = await requestOrbContinuity(actor, {
                action: 'append', epoch: savedAtSend.epoch!, turnId,
                userMessage: trimmed, assistantMessage: liveResult.message,
              })
              if (persisted && isCurrentAIActorSnapshot(actor)) {
                continuityRef.current = persisted
                setContinuity(persisted)
              }
            }).catch(() => {
              if (isCurrentAIActorSnapshot(actor)) setStatus('Orb answered, but the private conversation was not saved.')
            })
          }
        }
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
        if (resolved.provider === 'openai') void speakOrbResponse(resolved.message, resolved.locale)
        else playDeviceVoice(resolved.message, resolved.locale)
      }
    } catch (error) {
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
      const fallback = error instanceof OrbProviderAttemptError
        ? attemptedExternalOrbFallback(trimmed)
        : error instanceof OrbProviderAttemptUncertainError
          ? uncertainExternalOrbFallback(trimmed)
          : deterministicOrbFallback(trimmed)
      setResult(fallback)
      setResponseLocale(fallback.locale)
      setStreamedText(fallback.message)
      setStatus(error instanceof OrbProviderAttemptError
        ? 'External provider attempt did not return an answer; truthful local fallback ready.'
        : error instanceof OrbProviderAttemptUncertainError
          ? 'External processing state could not be confirmed; cautious local fallback ready.'
          : 'Live provider unavailable before external processing; local fallback response ready.')
      publishConversationState('warning', 2400)
      emitAudioCue('error')
      if (!voicePreferences.current.muted) playDeviceVoice(fallback.message, fallback.locale)
    } finally {
      if (!controller.signal.aborted && aborter.current === controller && isCurrentAIActorSnapshot(actor)) setBusy(false)
      if (aborter.current === controller) aborter.current = null
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
            disabled={busy || scenarioBusy}
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
                publishConversationState(allowed ? 'attention' : 'privacy')
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
                  publishConversationState('privacy')
                }
              }}
            />
            Allow Orb replies and narrator lines to use the configured natural external voice provider this session.
          </label>
          <div className={styles.actions}>
            <button type="button" disabled={!actor.uid || continuityBusy || continuityHydrating || busy} onClick={() => void changeContinuity(continuity?.enabled ? 'disable' : 'enable')}>
              {continuity?.enabled ? 'Turn off remembering and delete saved Orb messages' : 'Remember Orb conversations across devices'}
            </button>
            {continuity?.enabled
              ? <button type="button" disabled={continuityBusy || continuityHydrating || busy} onClick={() => void changeContinuity('clear')}>Clear saved Orb conversation</button>
              : <button type="button" disabled={!actor.uid || continuityBusy || continuityHydrating || busy} onClick={() => void changeContinuity('disable')}>Delete any saved Orb conversations</button>}
            <button type="button"
              disabled={!actor.uid || busy || scenarioBusy || continuityBusy || continuityHydrating
                || !whatIfQuestion || whatIfQuestion.length > 1200}
              onClick={() => void exploreWhatIf()}>
              Explore this question in Possible Futures
            </button>
            <button type="button" disabled={!actor.uid || activityBusy || busy || scenarioBusy}
              onClick={() => void showActivity()}>Review my recent UrAi activity</button>
            <button type="submit" disabled={busy || scenarioBusy || continuityBusy || continuityHydrating || !message.trim() || !aiConsent}>Send</button>
            <button type="button" disabled={!busy && !voicePlaying} onClick={stop}>Stop</button>
            <button
              type="button"
              aria-pressed={!voiceMuted}
              onClick={() => {
                if (!isCurrentAIActorSnapshot(actor)) return
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
              if (result.provider === 'openai') void speakOrbResponse(result.message, result.locale)
              else playDeviceVoice(result.message, result.locale)
            }}>
              Replay
            </button>
          </div>
        </form>
        <p className={styles.disclosure}>What-If saves only this question as an assumption-only Scenario. It does not run an AI prediction, dispatch workers, or make a memory.</p>
        <p className={styles.status} role="status" aria-live="polite" aria-atomic="true">
          {status}
        </p>
        {activity !== null ? (
          <section className={styles.response} aria-label="Private UrAi activity history">
            <p>Activity history · scenario proposals and unverified outcome reports</p>
            {activity.length ? <ol>
              {activity.map(item => <li key={item.id}>
                <strong>{item.kind === 'outcome-report' ? 'Owner report' : item.kind === 'outcome-observation' ? 'Observation receipt' : 'Scenario proposal'}</strong>
                {' · '}{item.truthKind === 'user-assertion' ? 'User-reported, not independently verified' : item.truthKind === 'scenario' ? 'Hypothetical only' : 'Evidence status requires review'}
                {' · '}{item.recordedAt}
                {item.scenarioId ? (
                  <button type="button" disabled={!actor.uid || busy || scenarioBusy}
                    onClick={() => {
                      if (!isCurrentAIActorSnapshot(actor)) return
                      requestUraiWorldTravel({
                        destination: 'possible-futures',
                        href: '/possible-futures',
                        entryPortal: 'orb-history-scenario-recall',
                        cameraCheckpoint: 'possible-futures-arrival',
                        context: { scenarioId: item.scenarioId!, scenarioOrigin: 'home', truthMode: 'scenario' },
                      })
                    }}>
                    Open related Scenario
                  </button>
                ) : null}
              </li>)}
            </ol> : <p>No recent activity records found.</p>}
            <p>This view does not send ledger entries to the model or authorize actions.</p>
          </section>
        ) : null}
        {continuity?.enabled && history.length > 0 ? (
          <section className={styles.response} aria-label="Saved Orb conversation">
            <p>Recent saved conversation (not verified historical evidence)</p>
            <ol>{history.map((item, index) => <li key={index}><strong>{item.role === 'assistant' ? 'Orb' : 'You'}:</strong> {item.content}</li>)}</ol>
          </section>
        ) : null}
        {streamedText ? (
          <section className={styles.response} aria-label="Orb response">
            <p {...contentLanguageProps(responseLocale)} style={{ textAlign: 'start', overflowWrap: 'anywhere' }}>{streamedText}</p>
            {result ? <small lang="en" dir="ltr">{result.disclosure}</small> : null}
            {result?.suggestedActions.length ? (
              <ul {...contentLanguageProps(result.locale)}>{result.suggestedActions.map((action) => <li key={action}>{action}</li>)}</ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </details>
  )
}
