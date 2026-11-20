'use client'
// R1593: localhost disposable consent authority; NOT operational-v1.
import { onAuthStateChanged, type User } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import { useEffect, useState } from 'react'
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
  useEffect(() => {
    if (!authorized()) return
    return onAuthStateChanged(getUrAiAuth(), user => {
      setReady(true); setOwner(user); setAllowed(null)
    }, () => { setReady(false); setOwner(null) })
  }, [])
  const evaluate = async (p: Purpose) => {
    const call = httpsCallable<{ purpose: Purpose; correlationId: string }, { allowed: boolean; reason: string }>(functions, 'evaluateCanonicalConsent')
    return (await call({ purpose: p, correlationId: crypto.randomUUID() })).data
  }
  useEffect(() => {
    if (!ready || !owner || !authorized()) return
    let current = true
    setAllowed(null)
    void evaluate(purpose).then(d => {
      if (current) { setAllowed(d.allowed === true); setStatus('Server decision: ' + d.reason) }
    }).catch(() => { if (current) { setAllowed(null); setStatus('Server unavailable; no grant inferred') } })
    return () => { current = false }
  }, [ready, owner, purpose])
  async function update(statusValue: 'granted' | 'revoked') {
    if (!ready || !owner || busy || !authorized() || getUrAiAuth().currentUser?.uid !== owner.uid) return
    setBusy(true); setAllowed(null); setStatus('Awaiting server receipt')
    try {
      const fn = httpsCallable<{ purpose: Purpose; status: string; surface: string }, { status: string }>(functions, 'setCanonicalConsent')
      const r = (await fn({ purpose, status: statusValue, surface: 'r1593-local-sanctuary' })).data
      if (r.status !== statusValue) throw Error('Receipt mismatch')
      const decision = await evaluate(purpose)
      if (decision.allowed !== (statusValue === 'granted')) throw Error('Decision mismatch')
      setAllowed(decision.allowed)
      setStatus('Server: ' + decision.reason + '. Jobs acknowledgement and private writes unverified.')
    } catch { setAllowed(null); setStatus('Change unverified; no enforcement claimed') }
    finally { setBusy(false) }
  }
  if (!ready) return null
  return <section aria-label="Disposable canonical consent review" data-canonical-consent-review="disposable"
    data-canonical-consent-state={allowed === true ? 'allowed' : allowed === false ? 'denied' : 'unverified'}
    style={{ position: 'relative', zIndex: 30, pointerEvents: 'auto', background: '#061118', padding: 20, border: '1px solid #8e9cad', borderRadius: 12 }}>
    <h2>Canonical consent — disposable test account</h2>
    <p>LOCAL EMULATOR ONLY. Independent canonical purpose test. Scoped Privacy Controls remain disabled.
      No private writes or downstream Jobs enforcement is authorized.</p>
    <label>Purpose <select value={purpose} disabled={!owner || busy} onChange={e => {
      if (purposes.includes(e.target.value as Purpose)) setPurpose(e.target.value as Purpose)
    }}>{purposes.map(p => <option key={p} value={p}>{p}</option>)}</select></label>
    <p role="status">{owner ? status : 'Sign into disposable Auth first'}</p>
    <p>Canonical server evaluation: <strong>{allowed === true ? 'ALLOWED' : allowed === false ? 'DENIED' : 'UNVERIFIED'}</strong></p>
    <button type="button" disabled={!owner || busy} onClick={() => void update('granted')}>Grant disposable canonical consent</button>{' '}
    <button type="button" disabled={!owner || busy} onClick={() => void update('revoked')}>Revoke disposable canonical consent</button>
  </section>
}
