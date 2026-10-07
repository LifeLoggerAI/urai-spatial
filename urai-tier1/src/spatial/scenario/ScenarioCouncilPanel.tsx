'use client'

import { useMemo, useRef, useState } from 'react'
import { getPossibleFutureCouncilBundleClient } from '@/lib/scenario/scenarioClient'
import { COUNCIL_AGENTS } from '@/spatial/council/councilAgentSchema'
import {
  COUNCIL_PROVIDER_REGISTRY,
  REQUESTABLE_COUNCIL_PROVIDER_IDS,
  PENDING_COUNCIL_PROVIDER_IDS,
  CouncilProviderNotConnectedError,
  requestCouncilProvider,
  type CouncilProviderId,
} from '@/spatial/council/councilProviderRegistry'

type RequestableProvider = Exclude<CouncilProviderId, 'local-fallback'>

export function ScenarioCouncilPanel({ scenarioId, branchId }: { scenarioId: string; branchId?: string }) {
  const requestableProviders = useMemo(
    () => REQUESTABLE_COUNCIL_PROVIDER_IDS.filter((id): id is RequestableProvider => id !== 'local-fallback'),
    [],
  )
  const [provider, setProvider] = useState<RequestableProvider>(requestableProviders[0] ?? 'openai')
  const [roleId, setRoleId] = useState(COUNCIL_AGENTS[0]?.id ?? 'council-guardian')
  const [question, setQuestion] = useState('What assumptions or uncertainties should I examine before I treat this branch seriously?')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('Council has not reviewed this Scenario.')
  const [answer, setAnswer] = useState('')
  const [disclosure, setDisclosure] = useState('')
  const controller = useRef<AbortController | null>(null)

  const role = COUNCIL_AGENTS.find((agent) => agent.id === roleId) ?? COUNCIL_AGENTS[0]

  async function askCouncil() {
    if (!scenarioId || !role || !question.trim() || !consent || busy) return
    setBusy(true)
    setAnswer('')
    setDisclosure('')
    setStatus('Preparing a minimal trusted Scenario bundle…')
    const aborter = new AbortController()
    controller.current = aborter
    try {
      const bundle = await getPossibleFutureCouncilBundleClient(scenarioId, branchId)
      const message = [
        `Council role: ${role.name} (${role.role}).`,
        `Role focus: ${role.focus}`,
        bundle.disclosure,
        `Scenario question: ${bundle.question}`,
        `Selected branch: ${bundle.branchLabel}.`,
        bundle.branchSummary ? `User-authored branch summary: ${bundle.branchSummary}` : 'No branch summary is available yet.',
        `Basis: ${bundle.assumptionOnly ? 'explicit assumption-only' : 'server-authorized lived context'}; evidence references admitted: ${bundle.evidenceCount}; evidence classes: ${bundle.evidenceKinds.join(', ') || 'none'}.`,
        `Recorded uncertainties: ${bundle.uncertainty.join('; ') || 'none recorded'}.`,
        `User request: ${question.trim()}`,
        'Respond as one Council perspective only. Do not claim this Scenario is memory, prediction, fact, consensus, or an authority decision. Do not invent evidence or hidden personal facts. Surface assumptions, uncertainty, alternatives, and what additional evidence would matter.',
      ].join('\n')
      setStatus(`Sending this bounded Scenario context to ${COUNCIL_PROVIDER_REGISTRY[provider].label} with your consent…`)
      const result = await requestCouncilProvider({
        provider,
        message,
        context: [],
        aiProcessingConsent: true,
        signal: aborter.signal,
      })
      if (!result) {
        setStatus('No external Council response was used.')
        return
      }
      setAnswer(result.message)
      setDisclosure(result.disclosure)
      setStatus(`${role.name} returned one provider-backed perspective. It remains advisory and hypothetical.`)
    } catch (error) {
      if (aborter.signal.aborted) {
        setStatus('Council request stopped.')
      } else if (error instanceof CouncilProviderNotConnectedError) {
        setStatus(`${COUNCIL_PROVIDER_REGISTRY[error.provider].label} is not enabled for Council requests in this environment.`)
      } else {
        setStatus('Council could not review this Scenario. No provider answer is being substituted.')
      }
    } finally {
      if (controller.current === aborter) controller.current = null
      setBusy(false)
    }
  }

  return (
    <section
      data-testid="possible-futures-council"
      aria-label="Council Scenario lens"
      style={{ pointerEvents:'auto', width:'100%', maxWidth:620, boxSizing:'border-box', padding:16, border:'1px solid rgba(255,255,255,.18)', borderRadius:18, background:'rgba(8,13,16,.9)', backdropFilter:'blur(16px)' }}
    >
      <strong>Council lens</strong>
      <p style={{ opacity:.76, margin:'6px 0 12px' }}>One consented provider perspective on a Possible Future. It cannot turn a Scenario into fact, memory, consensus, or a decision.</p>
      <div style={{ display:'grid', gap:10 }}>
        <label>
          Council role
          <select value={roleId} onChange={(event)=>setRoleId(event.currentTarget.value)} disabled={busy} style={{ width:'100%', minHeight:48, boxSizing:'border-box', marginTop:5 }}>
            {COUNCIL_AGENTS.map((agent)=><option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
        </label>
        <label>
          Provider
          <select value={provider} onChange={(event)=>setProvider(event.currentTarget.value as RequestableProvider)} disabled={busy || !requestableProviders.length} style={{ width:'100%', minHeight:48, boxSizing:'border-box', marginTop:5 }}>
            {requestableProviders.map((id)=><option key={id} value={id}>{COUNCIL_PROVIDER_REGISTRY[id].label}</option>)}
          </select>
        </label>
        <label>
          What should this Council lens examine?
          <textarea value={question} onChange={(event)=>setQuestion(event.currentTarget.value)} disabled={busy} style={{ width:'100%', minHeight:80, boxSizing:'border-box', marginTop:5 }} />
        </label>
        <label style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
          <input type="checkbox" checked={consent} disabled={busy} onChange={(event)=>setConsent(event.currentTarget.checked)} style={{ minWidth:24, minHeight:24, marginTop:2 }} />
          <span>Allow the selected provider to process this Scenario question, branch summary, uncertainty labels, and evidence-class counts for this request. Raw memory evidence is not sent by this surface.</span>
        </label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          <button type="button" onClick={()=>void askCouncil()} disabled={busy || !consent || !question.trim() || !requestableProviders.length} style={{ minHeight:48, padding:'0 14px' }}>{busy ? 'Considering…' : 'Ask Council'}</button>
          <button type="button" onClick={()=>controller.current?.abort()} disabled={!busy} style={{ minHeight:48, padding:'0 14px' }}>Stop</button>
        </div>
      </div>
      <small>Provider availability is checked when you ask. A listed provider may be unavailable.</small>
      <p role="status" aria-live="polite" style={{ opacity:.72 }}>{status}</p>
      {answer ? <div data-testid="possible-futures-council-answer" style={{ borderTop:'1px solid rgba(255,255,255,.14)', paddingTop:10 }}><strong>{role?.name}</strong><p>{answer}</p><small>{disclosure}</small></div> : null}
      {PENDING_COUNCIL_PROVIDER_IDS.length ? <small style={{ display:'block', opacity:.55 }}>Other providers are currently unavailable.</small> : null}
    </section>
  )
}
