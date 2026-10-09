'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { getAIActorSnapshot, getServerAIActorSnapshot, isCurrentAIActorSnapshot, subscribeAIActor, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'
import type { CouncilAgent } from './councilAgentSchema'
import {
  attemptedExternalOrbFallback,
  deterministicOrbFallback,
  OrbProviderAttemptError,
  OrbProviderAttemptUncertainError,
  uncertainExternalOrbFallback,
  type OrbConversationMessage,
} from '@/spatial/orb/openaiClient'
import {
  COUNCIL_PROVIDER_REGISTRY,
  LIVE_COUNCIL_PROVIDER_IDS,
  REQUESTABLE_COUNCIL_PROVIDER_IDS,
  PENDING_COUNCIL_PROVIDER_IDS,
  requestCouncilProvider,
  type CouncilProviderId,
  type CouncilProviderResult,
} from './councilProviderRegistry'
import {
  attemptedCouncilProviderFallback,
  CouncilExternalProviderAttemptError,
  CouncilExternalProviderAttemptUncertainError,
  uncertainCouncilProviderFallback,
} from './councilClient'

export default function CouncilConversationPanel({ agent }: { agent: CouncilAgent }) {
  const actor = useSyncExternalStore(subscribeAIActor, getAIActorSnapshot, getServerAIActorSnapshot)
  return <ActorBoundCouncilConversationPanel key={actor.generation} agent={agent} actor={actor} />
}

function ActorBoundCouncilConversationPanel({ agent, actor }: { agent: CouncilAgent; actor: AIActorSnapshot }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<OrbConversationMessage[]>([])
  const [result, setResult] = useState<CouncilProviderResult | null>(null)
  const requestableProviderIds = useMemo(() => REQUESTABLE_COUNCIL_PROVIDER_IDS.filter((id): id is Exclude<CouncilProviderId, 'local-fallback'> => id !== 'local-fallback'), [])
  const [providerId, setProviderId] = useState<Exclude<CouncilProviderId, 'local-fallback'>>(requestableProviderIds[0] ?? 'openai')
  const [status, setStatus] = useState('Council conversation is idle.')
  const [busy, setBusy] = useState(false)
  const [consent, setConsent] = useState(false)
  const aborter = useRef<AbortController | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeAIActor(() => {
      if (!isCurrentAIActorSnapshot(actor)) { aborter.current?.abort(); aborter.current = null }
    })
    return () => { unsubscribe(); aborter.current?.abort(); aborter.current = null }
  }, [actor])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isCurrentAIActorSnapshot(actor)) return
    const trimmed = message.trim()
    if (!trimmed || busy) return
    if (!consent) {
      setStatus(`Allow ${COUNCIL_PROVIDER_REGISTRY[providerId].label} processing for this Council message before sending.`)
      return
    }

    aborter.current?.abort()
    const controller = new AbortController()
    aborter.current = controller
    setBusy(true)
    setResult(null)
    setStatus(`${agent.name} is considering your message through the selected provider…`)

    const councilMessage = [
      `Council presence: ${agent.name}.`,
      `Council role: ${agent.role}.`,
      `Council focus: ${agent.focus}`,
      'Respond in that role while remaining optional, non-diagnostic, concise, and clear that this is reflective guidance rather than authority over the user.',
      '',
      trimmed,
    ].join('\n')

    try {
      const response = await requestCouncilProvider({
        provider: providerId,
        message: councilMessage,
        context: history,
        aiProcessingConsent: true,
        signal: controller.signal,
      })
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
      const resolved = response ?? deterministicOrbFallback(trimmed)
      setResult(resolved)
      if (response) {
        setHistory((current) => [
          ...current.slice(-6),
          { role: 'user', content: trimmed },
          { role: 'assistant', content: response.message },
        ])
      }
      setMessage('')
      setStatus(resolved.provider !== 'fallback'
        ? `${agent.name} responded through ${COUNCIL_PROVIDER_REGISTRY[resolved.provider].label}.`
        : 'The selected provider was unavailable before external processing; a disclosed local fallback is shown.')
    } catch (error) {
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
      const fallback = error instanceof OrbProviderAttemptError
        ? attemptedExternalOrbFallback(trimmed)
        : error instanceof OrbProviderAttemptUncertainError
          ? uncertainExternalOrbFallback(trimmed)
          : error instanceof CouncilExternalProviderAttemptError
            ? attemptedCouncilProviderFallback(trimmed, error.provider)
            : error instanceof CouncilExternalProviderAttemptUncertainError
              ? uncertainCouncilProviderFallback(trimmed, error.provider)
              : deterministicOrbFallback(trimmed)
      setResult(fallback)
      setStatus('The selected Council provider did not return a usable answer; a disclosed local fallback is shown.')
    } finally {
      if (!controller.signal.aborted && aborter.current === controller && isCurrentAIActorSnapshot(actor)) setBusy(false)
      if (aborter.current === controller) aborter.current = null
    }
  }

  return (
    <section
      className="councilConversation"
      aria-label="Council conversation"
      data-provider={result?.provider ?? 'idle'}
      data-live-council-providers={LIVE_COUNCIL_PROVIDER_IDS.join(' ')}
      data-requestable-council-providers={REQUESTABLE_COUNCIL_PROVIDER_IDS.join(' ')}
      data-pending-council-providers={PENDING_COUNCIL_PROVIDER_IDS.join(' ')}
    >
      <form onSubmit={submit} aria-busy={busy}>
        <label htmlFor="urai-council-provider">Council provider</label>
        <select
          id="urai-council-provider"
          value={providerId}
          disabled={busy}
          onChange={(event) => {
            setProviderId(event.currentTarget.value as Exclude<CouncilProviderId, 'local-fallback'>)
            setHistory([])
            setResult(null)
            setStatus('Council provider changed. Prior provider context was cleared.')
          }}
        >
          {requestableProviderIds.map((id) => <option key={id} value={id}>{COUNCIL_PROVIDER_REGISTRY[id].label}</option>)}
        </select>
        <label htmlFor="urai-council-message">Ask {agent.name}</label>
        <textarea
          id="urai-council-message"
          value={message}
          rows={3}
          maxLength={1800}
          disabled={busy}
          onChange={(event) => setMessage(event.currentTarget.value)}
        />
        <label className="councilConsent">
          <input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.currentTarget.checked)} />
          Allow this message and bounded recent Council context to be processed by {COUNCIL_PROVIDER_REGISTRY[providerId].label}.
        </label>
        <div className="councilConversationActions">
          <button type="submit" disabled={busy || !consent || !message.trim()}>{busy ? 'Considering…' : 'Ask Council'}</button>
          <button type="button" disabled={!busy} onClick={() => { aborter.current?.abort(); aborter.current = null; setBusy(false); setStatus('Council response stopped.') }}>Stop</button>
        </div>
      </form>
      <small>Provider availability is checked when you ask. A listed provider may be unavailable.</small>
      <p role="status" aria-live="polite">{status}</p>
      {result ? <div className="councilResponse"><strong>{agent.name}</strong><p>{result.message}</p><small>{result.disclosure}</small></div> : null}
      <style>{`
        .councilConversation{pointer-events:auto;margin-top:14px;border-top:1px solid rgba(255,255,255,.12);padding-top:14px}.councilConversation form{display:grid;gap:8px}.councilConversation label{font-size:11px;font-weight:800;color:rgba(255,255,255,.8)}.councilConversation select{box-sizing:border-box;width:100%;min-height:48px;padding:0 10px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(3,8,12,.82);color:#fff}.councilConversation textarea{box-sizing:border-box;width:100%;min-height:76px;padding:10px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(3,8,12,.82);color:#fff;resize:vertical}.councilConsent{display:flex;align-items:flex-start;gap:8px;line-height:1.35}.councilConsent input{margin-top:2px}.councilConversationActions{display:flex;gap:8px}.councilConversationActions button{min-height:48px;padding:0 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#f4f1e8;color:#10151a;font-weight:800}.councilConversationActions button+button{background:transparent;color:#fff}.councilConversationActions button:disabled{opacity:.45}.councilConversation>p{margin:8px 0 0;color:rgba(255,255,255,.58);font-size:10px;line-height:1.4}.councilResponse{margin-top:10px;padding:12px;border:1px solid rgba(233,214,183,.24);border-radius:14px;background:rgba(4,8,11,.72)}.councilResponse p{margin:5px 0;color:rgba(255,255,255,.86);line-height:1.5}.councilResponse small{color:rgba(255,255,255,.56)}.councilConversation :is(select,textarea,button,input):focus-visible{outline:3px solid #fff;outline-offset:2px}
      `}</style>
    </section>
  )
}
