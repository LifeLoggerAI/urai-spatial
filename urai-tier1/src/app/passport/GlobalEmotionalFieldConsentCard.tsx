'use client'

import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useMemo, useState } from 'react'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { applyGlobalEmotionalFieldConsent, getGlobalEmotionalFieldConsent } from '@/lib/privacy/operationalPrivacyClient'

type Mode = 'off' | 'limited' | 'on'
type Precision = 'country' | 'multi-region' | 'coarse-region'

type ConsentSnapshot = {
  revision: number
  mode: Mode
  precision: Precision
  policyVersion: string
  contributes: string[]
  neverContributes: string[]
  minimumCohortFloor: number
  sensitiveHigherThresholdRequired: boolean
  providerState: string
  publicationState: string
}

const DEFAULT: ConsentSnapshot = {
  revision: 0,
  mode: 'off',
  precision: 'country',
  policyVersion: 'global-emotional-field-v1-draft',
  contributes: [],
  neverContributes: [
    'individual emotion',
    'household emotion',
    'exact location',
    'street-level or building-level signal',
    'raw voice or transcript',
    'raw memory',
    'movement trail',
    'named relationship or identifiable social graph',
    'biometric template',
  ],
  minimumCohortFloor: 100,
  sensitiveHigherThresholdRequired: true,
  providerState: 'not-activated',
  publicationState: 'blocked-pending-governance-and-aggregate-provider',
}

function normalize(payload: Record<string, unknown>): ConsentSnapshot {
  const mode = payload.mode === 'on' || payload.mode === 'limited' || payload.mode === 'off' ? payload.mode : 'off'
  const precision = payload.precision === 'coarse-region' || payload.precision === 'multi-region' || payload.precision === 'country' ? payload.precision : 'country'
  return {
    revision: Number.isInteger(payload.revision) ? Number(payload.revision) : 0,
    mode,
    precision,
    policyVersion: typeof payload.policyVersion === 'string' ? payload.policyVersion : DEFAULT.policyVersion,
    contributes: Array.isArray(payload.contributes) ? payload.contributes.filter((item): item is string => typeof item === 'string') : [],
    neverContributes: Array.isArray(payload.neverContributes) ? payload.neverContributes.filter((item): item is string => typeof item === 'string') : DEFAULT.neverContributes,
    minimumCohortFloor: Number(payload.minimumCohortFloor) || 100,
    sensitiveHigherThresholdRequired: payload.sensitiveHigherThresholdRequired !== false,
    providerState: typeof payload.providerState === 'string' ? payload.providerState : DEFAULT.providerState,
    publicationState: typeof payload.publicationState === 'string' ? payload.publicationState : DEFAULT.publicationState,
  }
}

export default function GlobalEmotionalFieldConsentCard() {
  const [user, setUser] = useState<User | null>(null)
  const [snapshot, setSnapshot] = useState<ConsentSnapshot>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Loading dedicated public-good consent…')

  useEffect(() => {
    if (!firebasePublicEnvReady) {
      setLoading(false)
      setMessage('Public-good consent service is unavailable. Contribution remains Off.')
      return
    }
    return onAuthStateChanged(getAuth(app), (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setSnapshot(DEFAULT)
        setLoading(false)
        setMessage('Sign in to inspect or change public-good contribution. Default is Off.')
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    let active = true
    setLoading(true)
    void getGlobalEmotionalFieldConsent().then((payload) => {
      if (!active) return
      const next = normalize(payload)
      setSnapshot(next)
      setMessage(next.mode === 'off' ? 'Contribution is Off.' : `Contribution is ${next.mode === 'limited' ? 'Limited' : 'On'}, but publication remains provider/governance blocked.`)
    }).catch(() => {
      if (!active) return
      setSnapshot(DEFAULT)
      setMessage('Consent state could not be verified. Contribution is treated as Off.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [user])

  const contributionSummary = useMemo(() => snapshot.contributes.length ? snapshot.contributes.join('; ') : 'Nothing while Off.', [snapshot.contributes])

  const apply = async (mode: Mode) => {
    if (!user || busy || loading) return
    setBusy(true)
    setMessage('Applying consent change…')
    try {
      const result = await applyGlobalEmotionalFieldConsent({
        mode,
        precision: mode === 'limited' ? 'country' : snapshot.precision,
        expectedRevision: snapshot.revision,
      })
      const next = normalize(result)
      setSnapshot(next)
      setMessage(mode === 'off'
        ? 'Contribution revoked. Future public-good contribution is disabled.'
        : `${mode === 'limited' ? 'Limited' : 'On'} consent recorded. No public signal is published until governed aggregate infrastructure is approved and active.`)
    } catch {
      setMessage('Consent change was not confirmed. The previous verified state remains authoritative.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section
      aria-labelledby="global-field-consent-title"
      data-testid="passport-global-emotional-field-consent"
      data-consent-tier="C8"
      data-publication-state={snapshot.publicationState}
      data-provider-state={snapshot.providerState}
      style={{ position: 'relative', zIndex: 20, width: 'min(920px, calc(100% - 32px))', margin: '24px auto 56px', padding: 24, border: '1px solid rgba(214,182,111,.32)', borderRadius: 24, background: 'rgba(5,10,16,.92)', color: '#f4f1e8', boxShadow: '0 22px 80px rgba(0,0,0,.42)' }}
    >
      <p style={{ margin: 0, opacity: .7, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase' }}>Passport · Public-good permission · C8</p>
      <h2 id="global-field-consent-title" style={{ margin: '8px 0 10px', fontSize: 'clamp(22px,4vw,34px)' }}>Global Emotional Field contribution</h2>
      <p>This permission is separate from location, sensitive inference, biometrics, memory storage, and ordinary personalization. Default is <strong>Off</strong>.</p>

      <div role="group" aria-label="Global Emotional Field contribution level" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '18px 0' }}>
        {(['off', 'limited', 'on'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            disabled={!user || busy || loading}
            aria-pressed={snapshot.mode === mode}
            onClick={() => void apply(mode)}
            style={{ minWidth: 112, minHeight: 48, padding: '10px 16px', borderRadius: 999, border: snapshot.mode === mode ? '2px solid #f3d996' : '1px solid rgba(255,255,255,.25)', background: snapshot.mode === mode ? 'rgba(214,182,111,.2)' : 'rgba(255,255,255,.05)', color: 'inherit', cursor: !user || busy || loading ? 'not-allowed' : 'pointer' }}
          >
            {mode === 'off' ? 'Off' : mode === 'limited' ? 'Limited' : 'On'}
          </button>
        ))}
      </div>

      <label style={{ display: 'grid', gap: 6, maxWidth: 360 }}>
        <span>Maximum aggregate precision</span>
        <select
          value={snapshot.precision}
          disabled={!user || busy || loading || snapshot.mode === 'off' || snapshot.mode === 'limited'}
          onChange={(event) => setSnapshot((current) => ({ ...current, precision: event.target.value as Precision }))}
          style={{ minHeight: 48, padding: '8px 12px', borderRadius: 12, background: '#0b131b', color: 'inherit', border: '1px solid rgba(255,255,255,.25)' }}
        >
          <option value="country">Country</option>
          <option value="multi-region">Multi-region</option>
          <option value="coarse-region">Coarse region</option>
        </select>
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, marginTop: 20 }}>
        <article><h3>What may contribute</h3><p>{contributionSummary}</p></article>
        <article><h3>What never contributes</h3><ul>{snapshot.neverContributes.map((item) => <li key={item}>{item}</li>)}</ul></article>
        <article><h3>Cohort protection</h3><p>Absolute privacy floor: {snapshot.minimumCohortFloor} users. Location/sensitive cohorts require a separately approved higher threshold. If that threshold is unavailable, the field is suppressed rather than shown as zero.</p></article>
        <article><h3>Current activation truth</h3><p>Provider: {snapshot.providerState}. Publication: {snapshot.publicationState}. Policy: {snapshot.policyVersion}. Revision: {snapshot.revision}.</p></article>
      </div>

      <p role="status" aria-live="polite" style={{ marginTop: 18 }}>{message}</p>
    </section>
  )
}
