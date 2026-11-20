'use client'
// R1593: localhost disposable consent authority; NOT operational-v1.
import { onAuthStateChanged, type User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useRef, useState } from 'react'
import { disposableFirebaseReviewAuthorized as authorized, functions, getUrAiAuth } from '@/lib/firebase/client'
type Purpose = 'memory.storage' | 'data.export'
const purposes: Purpose[] = ['memory.storage', 'data.export']
export default function CanonicalConsentCompanion() {
  const [ready, setReady] = useState(false)
  const [owner, setOwner] = useState<User | null>(null)
  const [purpose, setPurpose] = useState<Purpose>('memory.storage')
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [status, setStatus] = useState('Server authority unverified')
  const [busy, setBusy] = useState(false)
  const mounted = useRef(false)
  const authEpoch = useRef(0)
  const activeOwner = useRef<User | null>(null)
  const decisionEpoch = useRef(0)
  const pendingMutation = useRef<object | null>(null)

  useEffect(() => {
    if (!authorized()) return
    mounted.current = true
    const auth = getUrAiAuth()
    const reset = (user: User | null, available: boolean) => {
      if (!mounted.current) return
      authEpoch.current += 1
      decisionEpoch.current += 1
      activeOwner.current = user
      pendingMutation.current = null
      setReady(available); setOwner(user); setAllowed(null); setBusy(false)
      setStatus(user ? 'Server authority unverified' : 'Sign into disposable Auth first')
    }
    const unsubscribe = onAuthStateChanged(auth, user => {
      reset(user && auth.currentUser !== user ? null : user, true)
    }, () => reset(null, false))
    return () => {
      mounted.current = false
      authEpoch.current += 1
      decisionEpoch.current += 1
      activeOwner.current = null
      pendingMutation.current = null
      unsubscribe()
    }
  }, [])

  const captureAccount = (actor: User | null) => {
    const auth = authorized() ? getUrAiAuth() : null
    const epoch = authEpoch.current
    return () => mounted.current && authorized() && actor !== null
      && activeOwner.current === actor && auth?.currentUser === actor && authEpoch.current === epoch
  }
  const evaluate = async (p: Purpose, isCurrent: () => boolean) => {
    if (!isCurrent()) return null
    const call = httpsCallable<{ purpose: Purpose; correlationId: string }, { allowed: boolean; reason: string }>(functions, 'evaluateCanonicalConsent')
    if (!isCurrent()) return null
    const result = await call({ purpose: p, correlationId: crypto.randomUUID() })
    if (!isCurrent()) return null
    return result.data
  }
  useEffect(() => {
    if (!ready || !owner || !authorized()) return
    const accountIsCurrent = captureAccount(owner)
    if (!accountIsCurrent()) return
    const decision = ++decisionEpoch.current
    let active = true
    const isCurrent = () => active && accountIsCurrent() && decisionEpoch.current === decision
    setAllowed(null)
    void evaluate(purpose, isCurrent).then(d => {
      if (d && isCurrent()) { setAllowed(d.allowed === true); setStatus('Server decision: ' + d.reason) }
    }).catch(() => { if (isCurrent()) { setAllowed(null); setStatus('Server unavailable; no grant inferred') } })
    return () => { active = false }
  }, [ready, owner, purpose])

  async function update(statusValue: 'granted' | 'revoked') {
    if (!ready || !owner || busy || pendingMutation.current || !authorized()) return
    const accountIsCurrent = captureAccount(owner)
    if (!accountIsCurrent()) return
    const operation = {}
    pendingMutation.current = operation
    const decision = ++decisionEpoch.current
    const isCurrent = () => accountIsCurrent() && decisionEpoch.current === decision
      && pendingMutation.current === operation
    setBusy(true); setAllowed(null); setStatus('Awaiting server receipt')
    try {
      const fn = httpsCallable<{ purpose: Purpose; status: string; surface: string }, { status: string }>(functions, 'setCanonicalConsent')
      // This fences client initiation and completion. An already admitted SDK
      // request may still settle on the server; this is not server-side binding.
      if (!isCurrent()) return
      const r = (await fn({ purpose, status: statusValue, surface: 'r1593-local-sanctuary' })).data
      if (!isCurrent()) return
      if (r.status !== statusValue) throw Error('Receipt mismatch')
      const evaluated = await evaluate(purpose, isCurrent)
      if (!evaluated || !isCurrent()) return
      if (evaluated.allowed !== (statusValue === 'granted')) throw Error('Decision mismatch')
      setAllowed(evaluated.allowed)
      setStatus('Server: ' + evaluated.reason + '. Jobs acknowledgement and private writes unverified.')
    } catch {
      if (isCurrent()) { setAllowed(null); setStatus('Change unverified; no enforcement claimed') }
    } finally {
      if (pendingMutation.current === operation) {
        pendingMutation.current = null
        if (accountIsCurrent()) setBusy(false)
      }
    }
  }
  if (!ready || !authorized()) return null
  const ownerIsCurrent = Boolean(owner && mounted.current && activeOwner.current === owner
    && getUrAiAuth().currentUser === owner)
  const visibleAllowed = ownerIsCurrent ? allowed : null
  return <section aria-label="Disposable canonical consent review" data-canonical-consent-review="disposable"
    data-canonical-consent-state={visibleAllowed === true ? 'allowed' : visibleAllowed === false ? 'denied' : 'unverified'}
    style={{ position: 'relative', zIndex: 30, pointerEvents: 'auto', background: '#061118', padding: 20, border: '1px solid #8e9cad', borderRadius: 12 }}>
    <h2>Canonical consent — disposable test account</h2>
    <p>LOCAL EMULATOR ONLY. Independent canonical purpose test. Scoped Privacy Controls remain disabled.
      No private writes or downstream Jobs enforcement is authorized.</p>
    <label>Purpose <select value={purpose} disabled={!ownerIsCurrent || busy} onChange={e => {
      if (ownerIsCurrent && !busy && !pendingMutation.current && purposes.includes(e.target.value as Purpose)) setPurpose(e.target.value as Purpose)
    }}>{purposes.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
    <p role="status">{ownerIsCurrent ? status : 'Sign into disposable Auth first'}</p>
    <p>Canonical server evaluation: <strong>{visibleAllowed === true ? 'ALLOWED' : visibleAllowed === false ? 'DENIED' : 'UNVERIFIED'}</strong></p>
    <button type="button" disabled={!ownerIsCurrent || busy} onClick={() => void update('granted')}>Grant disposable canonical consent</button>{' '}
    <button type="button" disabled={!ownerIsCurrent || busy} onClick={() => void update('revoked')}>Revoke disposable canonical consent</button>
  </section>
}
