'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { disposableFirebaseReviewAuthorized, getUrAiAuth } from '@/lib/firebase/client'
import { createCanonicalAccountPrivacySession } from '@/lib/privacy/canonicalAccountPrivacyClient'
import { operationalPrivacyContractSelected } from '@/lib/privacy/privacyContractAuthority'
import { applyOperationalConsentPolicy, getOperationalLifeMapVisibility, type OperationalLifeMapVisibility } from '@/lib/privacy/operationalPrivacyClient'

type VerifiedPolicy = Extract<OperationalLifeMapVisibility, { state: 'available' }>

export function LifeMapVisibilityReview({ owner }: { owner: string }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [storage, setStorage] = useState<boolean | null>(null)
  const [policy, setPolicy] = useState<VerifiedPolicy | null>(null)
  const [message, setMessage] = useState('')
  const pending = useRef(0)
  useEffect(() => () => { pending.current++ }, [])

  const enabled = disposableFirebaseReviewAuthorized() && operationalPrivacyContractSelected(process.env.NEXT_PUBLIC_URAI_PRIVACY_CONTRACT)
  if (!enabled) return null

  async function review(change?: boolean) {
    const user = getUrAiAuth().currentUser
    if (busy || !user || user.uid !== owner) return
    const actor = user
    const epoch = ++pending.current
    const current = () => pending.current === epoch && getUrAiAuth().currentUser === user
    setOpen(true)
    setBusy(true)
    setStorage(null)
    setPolicy(null)
    setMessage('Checking your privacy controls…')

    async function checkStorage() {
      let session: ReturnType<typeof createCanonicalAccountPrivacySession> | undefined
      try {
        session = createCanonicalAccountPrivacySession(actor)
        const decision = await session.evaluateConsent('memory.storage')
        const allowed = typeof decision.allowed === 'boolean' ? decision.allowed : null
        if (current()) setStorage(allowed)
        return allowed
      } catch {
        return null
      } finally { session?.close() }
    }

    try {
      // Reading or withdrawing the visibility preference remains available if the storage authority is offline.
      const storageCheck = change === false ? undefined : checkStorage()
      let expectedRevision: number | undefined
      if (change !== undefined) {
        if (!policy || (change && (await storageCheck !== true || !policy.confirmed || !['granted', 'limited'].includes(policy.memory.mode)))) {
          throw Error('Visibility change unavailable')
        }
        if (!current()) return
        const accepted = await applyOperationalConsentPolicy({ domain: 'memory', next: { ...policy.memory, lifeMapVisible: change }, expectedRevision: policy.revision })
        expectedRevision = policy.revision + 1
        if (accepted.revision !== expectedRevision || typeof accepted.jobId !== 'string' || !accepted.jobId) throw Error('Visibility receipt unavailable')
      }
      if (!current()) return
      const result = await getOperationalLifeMapVisibility()
      if (!current()) return
      if (result.view !== 'life-map-visibility' || result.owner !== owner || result.state !== 'available' || !Number.isSafeInteger(result.revision)) {
        setMessage('Your Life Map visibility setting is unavailable.')
        return
      }
      if (expectedRevision !== undefined && (result.revision !== expectedRevision || result.memory.lifeMapVisible !== change)) {
        setMessage('Your privacy settings changed. Check again to see the current revision.')
        return
      }
      setPolicy(result)
      const permitted = ['granted', 'limited'].includes(result.memory.mode) && result.memory.lifeMapVisible
      setMessage(result.confirmed ? (permitted ? 'Visible in Life Map is on.' : 'Visible in Life Map is off.') : 'The visibility change is awaiting confirmation.')
    } catch {
      if (current()) setMessage('Could not verify your Life Map visibility. Check again to see the current setting.')
    } finally {
      if (current()) setBusy(false)
    }
  }

  if (!open) return <button type="button" onClick={() => void review()}>Manage Life Map visibility</button>
  return <section aria-label="Life Map visibility">
    <p role="status" aria-live="polite">{message}</p>
    <p>{storage === null ? 'Memory storage consent has not been verified.' : `Memory storage consent is ${storage ? 'granted' : 'off'}.`}</p>
    {policy && (policy.memory.lifeMapVisible || (policy.confirmed && storage && ['granted', 'limited'].includes(policy.memory.mode))) ?
      <button type="button" disabled={busy} onClick={() => void review(!policy.memory.lifeMapVisible)}>{policy.memory.lifeMapVisible ? 'Turn off Visible in Life Map' : 'Turn on Visible in Life Map'}</button> : null}
    <button type="button" disabled={busy} onClick={() => void review()}>Check visibility again</button>
    <Link href="/privacy-controls" prefetch={false}>Open Privacy Controls</Link>
  </section>
}
