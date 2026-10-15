'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from 'react'
import { getAIActorSnapshot, getServerAIActorSnapshot, isCurrentAIActorSnapshot, subscribeAIActor, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'
import type { CouncilAgent } from './councilAgentSchema'
import { useBrowserLocation } from '@/hooks/useBrowserLocation'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { sanitizeMemoryId, type SelectedMemoryResult } from '@/spatial/memory/selectedMemoryContract'
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
import { requestCouncilSecondOpinion } from './councilSecondOpinion'

export default function CouncilConversationPanel({ agent }: { agent: CouncilAgent }) {
  const actor = useSyncExternalStore(subscribeAIActor, getAIActorSnapshot, getServerAIActorSnapshot)
  const location = useBrowserLocation()
  const address = location.split('#')[0]
  const params = new URLSearchParams(address.includes('?') ? address.slice(address.indexOf('?') + 1) : '')
  const memoryRouteId = sanitizeMemoryId(params.get('memoryId'))
  const selectedMemory = useSelectedMemory()
  // The memory route can stay unchanged while the owner corrects or revokes
  // a persisted memory. A changed selected-memory record must remount Council,
  // removing stale answers, clearing consent/history and aborting any request.
  // This client freshness fence complements server-side SceneTruth rechecks;
  // it is not itself evidence of historical authority.
  const memoryRevision = useMemo(() => selectedMemory.status === 'ready'
    && selectedMemory.memory.id === memoryRouteId
    ? JSON.stringify(selectedMemory.memory)
    : selectedMemory.status, [selectedMemory, memoryRouteId])
  const sessionKey = JSON.stringify([actor.generation, agent.id, agent.name, agent.role, agent.focus, memoryRouteId, params.get('demo'), memoryRevision])
  return <ActorBoundCouncilConversationPanel key={sessionKey} agent={agent} actor={actor} memoryRouteId={memoryRouteId} selectedMemory={selectedMemory} />
}

function ActorBoundCouncilConversationPanel({ agent, actor, memoryRouteId, selectedMemory }: {
  agent: CouncilAgent; actor: AIActorSnapshot; memoryRouteId: string | null; selectedMemory: SelectedMemoryResult
}) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<OrbConversationMessage[]>([])
  const [result, setResult] = useState<CouncilProviderResult | null>(null)
  const [reviewResult, setReviewResult] = useState<CouncilProviderResult | null>(null)
  const [reviewRequested, setReviewRequested] = useState(false)
  const [reviewConsent, setReviewConsent] = useState(false)
  // Focus supplies the selected star through canonical navigation. Memory
  // evidence is the default context, but provider disclosure never is.
  const [graphRequested, setGraphRequested] = useState(Boolean(memoryRouteId))
  const validMemoryId = memoryRouteId && selectedMemory.status === 'ready'
    && selectedMemory.memory.id === memoryRouteId && selectedMemory.memory.demo === false
    ? memoryRouteId : null
  const [useSelectedMemoryGraph, setUseSelectedMemoryGraph] = useState(Boolean(memoryRouteId))
  const [graphSnapshotId, setGraphSnapshotId] = useState('')
  const [graphEntityIds, setGraphEntityIds] = useState('')
  const [graphShareConsent, setGraphShareConsent] = useState(false)
  const requestableProviderIds = useMemo(() => REQUESTABLE_COUNCIL_PROVIDER_IDS.filter((id): id is Exclude<CouncilProviderId, 'local-fallback'> => id !== 'local-fallback'), [])
  const [providerId, setProviderId] = useState<Exclude<CouncilProviderId, 'local-fallback'>>(
    (memoryRouteId ? requestableProviderIds.find((id) => id !== 'openai') : undefined)
      ?? requestableProviderIds[0] ?? 'openai'
  )
  const [reviewProviderId, setReviewProviderId] = useState<Exclude<CouncilProviderId, 'local-fallback'>>('gemini')
  const reviewableProviderIds = requestableProviderIds.filter((id) => id !== providerId)
  const selectedReviewerId = reviewableProviderIds.includes(reviewProviderId) ? reviewProviderId : reviewableProviderIds[0]
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

  useEffect(() => {
    if (!memoryRouteId || !graphRequested || !useSelectedMemoryGraph
      || selectedMemory.status === 'loading' || validMemoryId) return
    // A deleted, demo, inaccessible, or changed selected memory cannot retain
    // a response, prior history, or a disclosure grant from an older snapshot.
    aborter.current?.abort()
    aborter.current = null
    setBusy(false)
    setResult(null)
    setReviewResult(null)
    setHistory([])
    setGraphShareConsent(false)
    setStatus('The selected memory is not currently authorized for Council processing.')
  }, [memoryRouteId, graphRequested, useSelectedMemoryGraph, selectedMemory.status, validMemoryId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isCurrentAIActorSnapshot(actor)) return
    const trimmed = message.trim()
    if (!trimmed || busy) return
    const graphIdTokens = graphEntityIds.split(',').map(id => id.trim()).filter(Boolean)
    const graphSelection = graphRequested && graphSnapshotId.trim() && graphIdTokens.length
      ? { snapshotId: graphSnapshotId.trim(), entityIds: graphIdTokens } : undefined
    const graphSelectionValid = Boolean(graphSelection && /^[A-Za-z0-9._:-]{1,160}$/.test(graphSelection.snapshotId)
      && graphSelection.entityIds.length <= 8 && new Set(graphSelection.entityIds).size === graphSelection.entityIds.length
      && graphSelection.entityIds.every(id => /^[A-Za-z0-9._:-]{1,160}$/.test(id)))
    const liveMemoryId = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('memoryId')
    const selectedMemoryRequest = graphRequested && useSelectedMemoryGraph && validMemoryId && liveMemoryId === validMemoryId ? validMemoryId : null
    if (graphRequested && (providerId === 'openai' || reviewRequested || (!selectedMemoryRequest && !graphSelectionValid) || !graphShareConsent)) {
      setStatus('Selected memory evidence requires an accessible Memory Star or a valid advanced Life Graph selection, a supported external provider, and separate disclosure permission. Graph-backed second opinions remain disabled.')
      return
    }
    if (reviewRequested && (!selectedReviewerId || !reviewConsent)) {
      setStatus('Select a different Council provider and explicitly allow the second opinion before sending.')
      return
    }
    if (!consent) {
      setStatus(`Allow ${COUNCIL_PROVIDER_REGISTRY[providerId].label} processing for this Council message before sending.`)
      return
    }

    aborter.current?.abort()
    const controller = new AbortController()
    aborter.current = controller
    setBusy(true)
    setResult(null)
    setReviewResult(null)
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
        ...(graphRequested && selectedMemoryRequest ? { memorySelection: selectedMemoryRequest, graphShareConsent: true }
          : graphRequested && graphSelection ? { graphSelection, graphShareConsent: true } : {}),
        signal: controller.signal,
      })
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
      if (graphRequested && selectedMemoryRequest && (typeof window === 'undefined' || new URLSearchParams(window.location.search).get('memoryId') !== selectedMemoryRequest)) {
        setResult(null)
        setGraphShareConsent(false)
        setStatus('Selected memory changed. The earlier Council response was discarded.')
        return
      }
      if (graphRequested && !response) {
        setResult(null)
        setStatus('Selected memory evidence was unavailable or not authorized. No grounded Council response was produced.')
        setGraphShareConsent(false)
        return
      }
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
      if (response && response.provider !== 'fallback' && reviewRequested && reviewConsent && selectedReviewerId) {
        setStatus(`First answer received. Requesting a separate opinion from ${COUNCIL_PROVIDER_REGISTRY[selectedReviewerId].label}…`)
        try {
          const review = await requestCouncilSecondOpinion({
            originalProvider: providerId,
            reviewerProvider: selectedReviewerId,
            originalQuestion: councilMessage,
            firstAnswer: response.message,
            context: history,
            explicitSecondProviderConsent: true,
            signal: controller.signal,
          })
          if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
          if (review) {
            setReviewResult(review)
            setStatus(`First answer and ${COUNCIL_PROVIDER_REGISTRY[selectedReviewerId].label} second opinion received. No automatic correction or factual certification.`)
          } else {
            setStatus('First answer preserved. The second provider was unavailable before processing. No automatic correction.')
          }
        } catch {
          if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
          setStatus('First answer preserved. The second opinion failed or could not be confirmed. No automatic correction.')
        }
      } else {
        setStatus(resolved.provider !== 'fallback'
          ? `${agent.name} responded through ${COUNCIL_PROVIDER_REGISTRY[resolved.provider].label}.`
          : 'The selected provider was unavailable before external processing; a disclosed local fallback is shown.')
      }
    } catch (error) {
      if (controller.signal.aborted || aborter.current !== controller || !isCurrentAIActorSnapshot(actor)) return
      if (graphRequested) {
        setResult(null)
        setGraphShareConsent(false)
        setStatus('Selected memory evidence could not be safely processed or verified. No grounded Council response was produced.')
        return
      }
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
            setConsent(false)
            setResult(null)
            setReviewResult(null)
            setReviewConsent(false)
            setGraphShareConsent(false)
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
          {validMemoryId && graphRequested && useSelectedMemoryGraph
            ? 'Allow this question (not earlier Council chat history) to be processed by '
            : 'Allow this message and bounded recent Council context to be processed by '}
          {COUNCIL_PROVIDER_REGISTRY[providerId].label}.
        </label>
        {memoryRouteId ? <p role="status" aria-live="polite">
          Selected Memory Star: {validMemoryId && selectedMemory.memory ? selectedMemory.memory.title : selectedMemory.message}.
          UrAi must still verify its SceneTruth, provenance, graph, and processing authority on the server.
        </p> : null}
        <label className="councilConsent">
          <input type="checkbox" checked={graphRequested} disabled={busy} onChange={(event) => { setGraphRequested(event.currentTarget.checked); setGraphShareConsent(false); setReviewRequested(false); setReviewConsent(false); setResult(null) }} />
          {memoryRouteId ? 'Ask Council about this Memory Star using server-verified evidence (separate sharing permission required).' : 'Ask about source-backed Life Graph records (advanced selection; external disclosure requires separate permission).'}
        </label>
        {graphRequested ? <>
          {validMemoryId ? <label className="councilConsent">
            <input type="checkbox" checked={useSelectedMemoryGraph} disabled={busy} onChange={(event) => { setUseSelectedMemoryGraph(event.currentTarget.checked); setGraphShareConsent(false) }} />
            Use the selected Memory Star ({validMemoryId}) and its current SceneTruth-linked Life Graph, verified by UrAi.
          </label> : <small>No selected memory came from Focus or Life Map. Graph-backed memory reasoning requires an authorized source.</small>}
          {!useSelectedMemoryGraph || !validMemoryId ? <>
          <label htmlFor="urai-council-graph-snapshot">Authorized Life Graph snapshot ID</label>
          <input id="urai-council-graph-snapshot" type="text" value={graphSnapshotId} maxLength={160} disabled={busy} onChange={(event) => { setGraphSnapshotId(event.currentTarget.value); setGraphShareConsent(false) }} />
          <label htmlFor="urai-council-graph-entities">Selected graph entity IDs (comma-separated, maximum eight)</label>
          <input id="urai-council-graph-entities" type="text" value={graphEntityIds} maxLength={800} disabled={busy} onChange={(event) => { setGraphEntityIds(event.currentTarget.value); setGraphShareConsent(false) }} />
          <small>Advanced graph identifiers are not proof of ownership; the server independently checks them.</small>
          </> : null}
          <label className="councilConsent">
            <input type="checkbox" checked={graphShareConsent} disabled={busy || providerId === 'openai' || (Boolean(memoryRouteId) && useSelectedMemoryGraph && !validMemoryId)} onChange={(event) => setGraphShareConsent(event.currentTarget.checked)} />
            I separately authorize {COUNCIL_PROVIDER_REGISTRY[providerId].label} to process the selected, server-validated private Life Graph evidence for this question.
          </label>
        </> : null}
        <label className="councilConsent">
          <input type="checkbox" checked={reviewRequested} disabled={busy || graphRequested || reviewableProviderIds.length === 0} onChange={(event) => { setReviewRequested(event.currentTarget.checked); setReviewConsent(false); setReviewResult(null) }} />
          Request a second opinion from another provider (additional external processing; no automatic correction).
        </label>
        {reviewRequested && selectedReviewerId ? <>
          <label htmlFor="urai-council-reviewer">Second-opinion provider</label>
          <select id="urai-council-reviewer" disabled={busy} value={selectedReviewerId} onChange={(event) => { setReviewProviderId(event.currentTarget.value as Exclude<CouncilProviderId, 'local-fallback'>); setReviewConsent(false); setReviewResult(null) }}>
            {reviewableProviderIds.map((id) => <option value={id} key={id}>{COUNCIL_PROVIDER_REGISTRY[id].label}</option>)}
          </select>
          <label className="councilConsent">
            <input type="checkbox" checked={reviewConsent} disabled={busy} onChange={(event) => setReviewConsent(event.currentTarget.checked)} />
            Allow {COUNCIL_PROVIDER_REGISTRY[selectedReviewerId].label} to review the original question, bounded Council context, and first provider answer.
          </label>
        </> : null}
        {reviewableProviderIds.length === 0 ? <small>A second opinion requires another separately enabled Council provider.</small> : null}
        <div className="councilConversationActions">
          <button type="submit" disabled={busy || !consent || !message.trim() || (graphRequested && (providerId === 'openai' || !graphShareConsent || (useSelectedMemoryGraph && Boolean(memoryRouteId) ? !validMemoryId : !graphSnapshotId.trim() || !graphEntityIds.trim()))) || (reviewRequested && (!selectedReviewerId || !reviewConsent))}>{busy ? 'Considering…' : 'Ask Council'}</button>
          <button type="button" disabled={!busy} onClick={() => { aborter.current?.abort(); aborter.current = null; setBusy(false); setStatus('Council response stopped.') }}>Stop</button>
        </div>
      </form>
      <small>Provider availability is checked when you ask. A listed provider may be unavailable.</small>
      <p role="status" aria-live="polite">{status}</p>
      {result ? <div className="councilResponse"><strong>{agent.name}</strong><p>{result.message}</p><small>{result.disclosure}</small></div> : null}
      {reviewResult && reviewResult.provider !== 'fallback' ? <div className="councilResponse" aria-label="Unverified Council second opinion"><strong>Second opinion: {COUNCIL_PROVIDER_REGISTRY[reviewResult.provider].label}</strong><p>{reviewResult.message}</p><small>{reviewResult.disclosure} This is a model response, not verified memory evidence. The first answer has not been automatically changed.</small></div> : null}
      <style>{`
        .councilConversation{pointer-events:auto;margin-top:14px;border-top:1px solid rgba(255,255,255,.12);padding-top:14px}.councilConversation form{display:grid;gap:8px}.councilConversation label{font-size:11px;font-weight:800;color:rgba(255,255,255,.8)}.councilConversation select{box-sizing:border-box;width:100%;min-height:48px;padding:0 10px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(3,8,12,.82);color:#fff}.councilConversation input[type=text]{box-sizing:border-box;width:100%;min-height:48px;padding:0 10px;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(3,8,12,.82);color:#fff}.councilConversation textarea{box-sizing:border-box;width:100%;min-height:76px;padding:10px;border:1px solid rgba(255,255,255,.2);border-radius:14px;background:rgba(3,8,12,.82);color:#fff;resize:vertical}.councilConsent{display:flex;align-items:flex-start;gap:8px;line-height:1.35}.councilConsent input{margin-top:2px}.councilConversationActions{display:flex;gap:8px}.councilConversationActions button{min-height:48px;padding:0 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#f4f1e8;color:#10151a;font-weight:800}.councilConversationActions button+button{background:transparent;color:#fff}.councilConversationActions button:disabled{opacity:.45}.councilConversation>p{margin:8px 0 0;color:rgba(255,255,255,.58);font-size:10px;line-height:1.4}.councilResponse{margin-top:10px;padding:12px;border:1px solid rgba(233,214,183,.24);border-radius:14px;background:rgba(4,8,11,.72)}.councilResponse p{margin:5px 0;color:rgba(255,255,255,.86);line-height:1.5}.councilResponse small{color:rgba(255,255,255,.56)}.councilConversation :is(select,textarea,button,input):focus-visible{outline:3px solid #fff;outline-offset:2px}
      `}</style>
    </section>
  )
}
