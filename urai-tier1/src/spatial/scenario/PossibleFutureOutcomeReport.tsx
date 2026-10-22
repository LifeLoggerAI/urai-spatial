'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import { getAIActorSnapshot, getServerAIActorSnapshot, isCurrentAIActorSnapshot, subscribeAIActor, type AIActorSnapshot } from '@/lib/privacy/aiActorBoundary'
import { reportPossibleFutureOwnerOutcomeClient } from '@/lib/scenario/scenarioClient'

/**
 * Reports do not become independently verified memories. This component
 * records an explicitly acknowledged user assertion for an active scenario.
 */
export default function PossibleFutureOutcomeReport({ scenarioId, branchId }: {
  scenarioId: string
  branchId: string
}) {
  const actor = useSyncExternalStore(subscribeAIActor, getAIActorSnapshot, getServerAIActorSnapshot)
  return <ActorBoundOwnerOutcomeReport key={`${actor.generation}:${scenarioId}:${branchId}`}
    actor={actor} scenarioId={scenarioId} branchId={branchId} />
}

function ActorBoundOwnerOutcomeReport({ actor, scenarioId, branchId }: {
  actor: AIActorSnapshot
  scenarioId: string
  branchId: string
}) {
  const [assertion, setAssertion] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('No outcome has been reported for this branch in this session.')
  const [receipt, setReceipt] = useState<string | null>(null)
  const attempt = useRef<{ fingerprint: string; operationId: string } | null>(null)

  const report = async () => {
    const description = assertion.trim()
    if (!actor.uid || !actor.actor || !isCurrentAIActorSnapshot(actor) || busy
      || !acknowledged || !description || description.length > 1200) return
    if (!/^scn_[A-Za-z0-9_-]{12,96}$/.test(scenarioId)
      || !/^br_[A-Za-z0-9_-]{12,96}$/.test(branchId)) {
      setStatus('A current Scenario branch is required.')
      return
    }
    const fingerprint = JSON.stringify([scenarioId, branchId, description])
    if (!attempt.current || attempt.current.fingerprint !== fingerprint) {
      const fresh = globalThis.crypto?.randomUUID?.()
      if (!fresh) {
        setStatus('Secure operation identity is unavailable. Your report was not sent.')
        return
      }
      attempt.current = { fingerprint, operationId: 'outcome-' + fresh.replace(/-/g, '') }
    }
    setBusy(true)
    setStatus('Saving an owner-reported outcome. Independent verification is not claimed.')
    try {
      const saved = await reportPossibleFutureOwnerOutcomeClient({
        scenarioId, branchId, assertion: description,
        operationId: attempt.current.operationId,
      })
      if (!isCurrentAIActorSnapshot(actor)) return
      if (!/^obs_[A-Za-z0-9_-]{12,96}$/.test(saved.observationId)
        || saved.scenarioId !== scenarioId || saved.verified !== false
        || saved.source !== 'user-assertion') {
        throw new Error('The outcome receipt did not match its unverified contract.')
      }
      setReceipt(saved.observationId)
      setAssertion('')
      setAcknowledged(false)
      attempt.current = null
      setStatus('Owner report saved. This is not independent evidence or a verified memory.')
    } catch {
      if (isCurrentAIActorSnapshot(actor)) {
        setStatus('The report was not confirmed. You may retry without changing the text; this reuses the same operation ID.')
      }
    } finally {
      if (isCurrentAIActorSnapshot(actor)) setBusy(false)
    }
  }

  return <section aria-label="Report a real-world outcome" style={{
    pointerEvents: 'auto', maxWidth: 620, padding: 16, borderRadius: 18,
    background: 'rgba(8,13,16,.92)', border: '1px solid rgba(255,255,255,.20)',
    display: 'grid', gap: 10,
  }}>
    <strong>What actually happened?</strong>
    <p style={{ margin: 0, fontSize: 13, opacity: .82 }}>
      Optional owner report. This is your assertion, not an independently verified observation,
      a prediction, a worker action, or an autobiographical memory.
    </p>
    <label htmlFor="urai-owner-outcome-description">Describe what you believe occurred</label>
    <textarea id="urai-owner-outcome-description" value={assertion}
      onChange={(event) => setAssertion(event.target.value)}
      maxLength={1200} rows={3} disabled={busy || !actor.uid}
      style={{ minHeight: 88, width: '100%', borderRadius: 12,
        border: '1px solid rgba(255,255,255,.3)', background: 'rgba(255,255,255,.05)',
        color: 'inherit', padding: 12, font: 'inherit', boxSizing: 'border-box' }} />
    <label style={{ display: 'flex', alignItems: 'center', minHeight: 48, gap: 12, fontSize: 13 }}>
      <input type="checkbox" checked={acknowledged}
        onChange={(event) => setAcknowledged(event.target.checked)}
        disabled={busy || !actor.uid} style={{ width: 20, height: 20 }} />
      I understand UrAi will store this as my unverified report.
    </label>
    <button type="button" onClick={() => void report()}
      disabled={busy || !actor.uid || !acknowledged || !assertion.trim() || assertion.trim().length > 1200}
      style={{ minHeight: 48, padding: '0 18px', borderRadius: 999,
        border: '1px solid rgba(255,255,255,.3)',
        background: 'rgba(255,255,255,.09)', color: 'inherit', cursor: 'pointer' }}>
      {busy ? 'Saving owner report…' : 'Save my unverified outcome report'}
    </button>
    <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 12, opacity: .85 }}>{status}</p>
    {receipt ? <small>Saved report reference: {receipt}</small> : null}
  </section>
}
