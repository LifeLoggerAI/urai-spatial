'use client'

import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { functions, getUraiAuth, uraiJourneyEmulatorEnabled } from '@/lib/firebase/client'

type HiddenReceipt = { ownerId: string; memoryId: string; receiptId: string }
type Props = { receipt: HiddenReceipt; derivativeSha256: string }
const SHA = /^[a-f0-9]{64}$/

/** Separate explicit private-only promotion; an upload never grants visibility. */
export default function FirstPrivateMemoryActivationPanel({ receipt, derivativeSha256 }: Props) {
  const [currentOwner, setCurrentOwner] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [activated, setActivated] = useState(false)
  const [status, setStatus] = useState('The new memory is still hidden. Private Replay requires a second confirmation.')
  const epoch = useRef(0)
  const inFlight = useRef(false)

  useEffect(() => {
    if (!uraiJourneyEmulatorEnabled) return
    const unsubscribe = onAuthStateChanged(getUraiAuth(), user => {
      epoch.current += 1
      setCurrentOwner(user?.uid ?? null)
      setConfirmed(false); setActivated(false); setBusy(false)
      inFlight.current = false
      setStatus('Owner identity changed. A new explicit confirmation is required.')
    })
    return () => { epoch.current += 1; inFlight.current = false; unsubscribe() }
  }, [])

  async function activate() {
    if (!uraiJourneyEmulatorEnabled || !confirmed || busy || activated || inFlight.current
      || currentOwner !== receipt.ownerId || !SHA.test(receipt.receiptId) || !SHA.test(derivativeSha256)) return
    const auth = getUraiAuth(), owner = auth.currentUser
    if (!owner || owner.uid !== receipt.ownerId) return
    const generation = epoch.current
    const current = () => epoch.current === generation && auth.currentUser === owner && owner.uid === receipt.ownerId
    inFlight.current = true
    setBusy(true); setStatus('Checking current owner authentication and protected media authority...')
    try {
      const token = await owner.getIdTokenResult(true)
      if (!current()) return
      const authTime = token.claims.auth_time, now = Math.floor(Date.now() / 1000)
      if (!Number.isSafeInteger(authTime) || Number(authTime) <= 0 || Number(authTime) > now
        || now - Number(authTime) > 300) throw new Error('RECENT_OWNER_REAUTHENTICATION_REQUIRED')
      const callable = httpsCallable<Record<string, unknown>, Record<string, unknown>>(functions, 'activateFirstPrivateMemory')
      const response = await callable({ memoryId: receipt.memoryId, receiptId: receipt.receiptId,
        derivativeSha256, confirmPrivateReplay: true })
      if (!current()) return
      const result = response.data
      if (Object.keys(result).length !== 5 || result.ownerId !== owner.uid || result.memoryId !== receipt.memoryId
        || result.receiptId !== receipt.receiptId || result.visibility !== 'private'
        || result.state !== 'owner-confirmed-ready-receipt') throw new Error('PRIVATE_REPLAY_ACTIVATION_RECEIPT_INVALID')
      setActivated(true)
      setStatus('Owner-authorized private memory activated. Focus and Replay still enforce live consent.')
    } catch (error) {
      if (current()) setStatus('Activation denied or unavailable: ' + (error instanceof Error ? error.message : 'UNKNOWN'))
    } finally {
      if (current()) { setBusy(false); inFlight.current = false }
    }
  }

  if (!uraiJourneyEmulatorEnabled) return null
  const ownerReady = currentOwner === receipt.ownerId
  return <section aria-label="Explicit private Replay activation" style={{ border: '1px solid #8aaab3', padding: 20, marginTop: 20 }}>
    <h2>Private Replay authorization</h2>
    <p>The imported audio is hidden. A ready upload receipt does not give permission to reveal or replay it.</p>
    <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <input type="checkbox" checked={confirmed} disabled={!ownerReady || busy || activated}
        onChange={event => { setConfirmed(event.currentTarget.checked); setActivated(false) }} />
      I explicitly authorize private Life Map and Replay access to this fictional memory, subject to my current consent policy.
    </label>
    <button type="button" onClick={() => void activate()} disabled={!ownerReady || !confirmed || busy || activated}
      style={{ minHeight: 48, marginTop: 16 }}>{busy ? 'Verifying private activation...' : 'Authorize private Replay'}</button>
    <p role="status" aria-live="polite">{status}</p>
    {activated && ownerReady ? <p><a href={'/focus?memoryId=' + encodeURIComponent(receipt.memoryId)
      + '&manifestId=' + encodeURIComponent('source-' + receipt.memoryId)}>
      Open owner-authorized Focus</a> (Replay access is independently checked)</p> : null}
  </section>
}
