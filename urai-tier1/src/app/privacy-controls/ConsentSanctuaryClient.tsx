'use client'

import { Canvas } from '@react-three/fiber'
import { Environment, Float, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  consequenceSummary,
  defaultConsentPolicy,
  DOMAIN_LABELS,
  DOMAIN_ORDER,
  isConsentPolicy,
  type ConsentDomain,
  type ConsentDomainPolicy,
  type ConsentMode,
  type ConsentPolicy,
} from './consentModel'
import './consent-sanctuary.css'

type LoadState = 'loading' | 'private' | 'demo' | 'signed-out' | 'unavailable'
type MutationState = 'idle' | 'previewing' | 'saving' | 'success' | 'failed' | 'conflict'

type PendingChange = {
  domain: ConsentDomain
  next: ConsentDomainPolicy
}

type AuditEntry = {
  id: string
  domain: ConsentDomain
  previousMode: ConsentMode
  nextMode: ConsentMode
  revision: number
  createdAt?: { toDate?: () => Date }
  result: 'enforced'
}

const MODE_OPTIONS: ConsentMode[] = ['granted', 'limited', 'paused', 'denied']

function consentColor(mode: ConsentMode) {
  if (mode === 'granted') return '#8ce7ee'
  if (mode === 'limited') return '#e9cb88'
  if (mode === 'paused') return '#b6a4ff'
  return '#657080'
}

function Chamber({
  domain,
  policy,
  index,
  selected,
  onSelect,
}: {
  domain: ConsentDomain
  policy: ConsentDomainPolicy
  index: number
  selected: boolean
  onSelect: (domain: ConsentDomain) => void
}) {
  const angle = (index / DOMAIN_ORDER.length) * Math.PI * 2
  const radius = 5.2
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  const color = consentColor(policy.mode)

  return (
    <group position={[x, 0.2, z]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <Float speed={policy.mode === 'paused' ? 0.35 : 0.8} rotationIntensity={0.08} floatIntensity={0.12}>
        <RoundedBox
          args={[2.4, 2.5, 0.7]}
          radius={0.18}
          smoothness={4}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(domain)
          }}
          onPointerOver={() => { document.body.style.cursor = 'pointer' }}
          onPointerOut={() => { document.body.style.cursor = '' }}
        >
          <meshStandardMaterial
            color={selected ? color : '#101923'}
            emissive={color}
            emissiveIntensity={selected ? 0.75 : policy.mode === 'denied' ? 0.04 : 0.18}
            metalness={0.35}
            roughness={0.38}
          />
        </RoundedBox>
        <Text position={[0, 0.15, 0.38]} fontSize={0.25} maxWidth={1.9} textAlign="center" color="#f4f8fb">
          {DOMAIN_LABELS[domain]}
        </Text>
        <Text position={[0, -0.55, 0.38]} fontSize={0.16} color={color}>
          {policy.mode.toUpperCase()}
        </Text>
      </Float>
    </group>
  )
}

function SanctuaryWorld({
  policy,
  selectedDomain,
  onSelect,
  reducedMotion,
}: {
  policy: ConsentPolicy
  selectedDomain: ConsentDomain
  onSelect: (domain: ConsentDomain) => void
  reducedMotion: boolean
}) {
  return (
    <Canvas camera={{ position: [0, 7.2, 11.8], fov: 48 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#02070c']} />
      <fog attach="fog" args={['#02070c', 10, 24]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 9, 5]} intensity={1.25} color="#dffbff" />
      <pointLight position={[0, 2.4, 0]} intensity={24} distance={12} color={consentColor(policy.domains[selectedDomain].mode)} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[9.4, 64]} />
        <meshStandardMaterial color="#07121a" metalness={0.18} roughness={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
        <ringGeometry args={[2.3, 8.2, 64]} />
        <meshBasicMaterial color="#163c47" transparent opacity={0.18} />
      </mesh>
      {DOMAIN_ORDER.map((domain, index) => (
        <Chamber
          key={domain}
          domain={domain}
          policy={policy.domains[domain]}
          index={index}
          selected={domain === selectedDomain}
          onSelect={onSelect}
        />
      ))}
      <group position={[0, 0.35, 0]}>
        <Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={reducedMotion ? 0 : 0.35} floatIntensity={reducedMotion ? 0 : 0.45}>
          <mesh>
            <icosahedronGeometry args={[0.82, 3]} />
            <meshStandardMaterial color="#baf8ff" emissive="#63e7f5" emissiveIntensity={1.5} transparent opacity={0.9} />
          </mesh>
          <pointLight intensity={14} distance={7} color="#7cecf7" />
        </Float>
      </group>
      <OrbitControls
        enablePan
        enableZoom
        minDistance={7}
        maxDistance={17}
        maxPolarAngle={Math.PI * 0.48}
        minPolarAngle={Math.PI * 0.18}
        enableDamping={!reducedMotion}
        dampingFactor={0.08}
      />
      <Environment preset="night" />
    </Canvas>
  )
}

function policyFromDemo(): ConsentPolicy {
  const policy = defaultConsentPolicy('disclosed-demo')
  policy.domains.exports.mode = 'limited'
  policy.domains.location.precise = false
  return policy
}

function receiptId() {
  return globalThis.crypto?.randomUUID?.() ?? `receipt-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function dateLabel(entry: AuditEntry) {
  const date = entry.createdAt?.toDate?.()
  return date ? date.toLocaleString() : 'Pending server timestamp'
}

export default function ConsentSanctuaryClient() {
  const params = useMemo(() => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search), [])
  const explicitDemo = params.get('demo') === '1'
  const [user, setUser] = useState<User | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [policy, setPolicy] = useState<ConsentPolicy>(() => policyFromDemo())
  const [selectedDomain, setSelectedDomain] = useState<ConsentDomain>('memory')
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [mutationState, setMutationState] = useState<MutationState>('idle')
  const [message, setMessage] = useState('Opening the Consent Sanctuary…')
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [webglAvailable, setWebglAvailable] = useState(true)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const loadPrivatePolicy = useCallback(async (activeUser: User) => {
    try {
      const db = getFirebaseDb()
      const policyRef = doc(db, 'users', activeUser.uid, 'privacyPolicy', 'current')
      const snapshot = await getDoc(policyRef)
      const next = snapshot.exists() && isConsentPolicy(snapshot.data(), activeUser.uid)
        ? snapshot.data()
        : defaultConsentPolicy(activeUser.uid)
      setPolicy(next)
      const auditQuery = query(collection(db, 'users', activeUser.uid, 'privacyAudit'), orderBy('createdAt', 'desc'), limit(12))
      const auditSnapshot = await getDocs(auditQuery)
      setAudit(auditSnapshot.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<AuditEntry, 'id'>) })))
      setLoadState('private')
      setMessage(snapshot.exists() ? 'Your current privacy state is enforced.' : 'No prior privacy policy exists. Private defaults are ready to save on your first change.')
    } catch {
      setLoadState('unavailable')
      setMessage('The permission service is unavailable. No private data was replaced with demo data and no change was made.')
    }
  }, [])

  useEffect(() => {
    if (explicitDemo) {
      setPolicy(policyFromDemo())
      setLoadState('demo')
      setMessage('Disclosed demonstration. These settings do not belong to you and cannot change production data.')
      return
    }
    if (!firebasePublicEnvReady) {
      setLoadState('unavailable')
      setMessage('The permission service is not configured. Controls remain unavailable rather than pretending to save.')
      return
    }
    const auth = getAuth(app)
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      if (!nextUser) {
        setLoadState('signed-out')
        setMessage('Sign in to inspect or change private consent state.')
        return
      }
      setLoadState('loading')
      void loadPrivatePolicy(nextUser)
    })
  }, [explicitDemo, loadPrivatePolicy])

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setWebglAvailable(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch {
      setWebglAvailable(false)
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (pending) {
        setPending(null)
        setMutationState('idle')
        return
      }
      if (window.history.length > 1) window.history.back()
      else window.location.assign('/passport')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pending])

  useEffect(() => {
    if (pending) requestAnimationFrame(() => confirmRef.current?.focus())
  }, [pending])

  const propose = (domain: ConsentDomain, patch: Partial<ConsentDomainPolicy>) => {
    if (loadState !== 'private') return
    const next = { ...policy.domains[domain], ...patch }
    setPending({ domain, next })
    setMutationState('previewing')
    setMessage(`Previewing changes to ${DOMAIN_LABELS[domain]}. Nothing has changed yet.`)
  }

  const confirmChange = async () => {
    if (!pending || !user || loadState !== 'private') return
    setMutationState('saving')
    setMessage('Applying and enforcing your change…')
    const db = getFirebaseDb()
    const policyRef = doc(db, 'users', user.uid, 'privacyPolicy', 'current')
    const id = receiptId()
    const auditRef = doc(db, 'users', user.uid, 'privacyAudit', id)
    const expectedRevision = policy.revision
    try {
      const committed = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(policyRef)
        const current = snapshot.exists() && isConsentPolicy(snapshot.data(), user.uid)
          ? snapshot.data()
          : defaultConsentPolicy(user.uid)
        if (current.revision !== expectedRevision) throw new Error('CONSENT_REVISION_CONFLICT')
        const nextPolicy: ConsentPolicy = {
          ...current,
          revision: current.revision + 1,
          domains: {
            ...current.domains,
            [pending.domain]: { ...pending.next, updatedAt: serverTimestamp() },
          },
        }
        transaction.set(policyRef, { ...nextPolicy, updatedAt: serverTimestamp() })
        transaction.set(auditRef, {
          ownerId: user.uid,
          domain: pending.domain,
          previousMode: current.domains[pending.domain].mode,
          nextMode: pending.next.mode,
          previousState: current.domains[pending.domain],
          nextState: pending.next,
          revision: nextPolicy.revision,
          result: 'enforced',
          createdAt: serverTimestamp(),
          receiptId: id,
        })
        return nextPolicy
      })
      setPolicy(committed)
      setAudit((items) => [{
        id,
        domain: pending.domain,
        previousMode: policy.domains[pending.domain].mode,
        nextMode: pending.next.mode,
        revision: committed.revision,
        result: 'enforced',
      }, ...items].slice(0, 12))
      setPending(null)
      setMutationState('success')
      setMessage(`Change enforced. Receipt ${id.slice(0, 8)} recorded.`)
    } catch (error) {
      const conflict = error instanceof Error && error.message === 'CONSENT_REVISION_CONFLICT'
      setMutationState(conflict ? 'conflict' : 'failed')
      setMessage(conflict
        ? 'Another session changed this policy first. Reload current state before trying again.'
        : 'Enforcement failed. No success state was shown and the previous policy remains authoritative.')
    }
  }

  const selected = policy.domains[selectedDomain]
  const controlsDisabled = loadState !== 'private' || mutationState === 'saving'

  return (
    <main className="consentSanctuary" data-route-owner="consent-sanctuary" data-privacy-source={loadState}>
      <a className="consentSkip" href="#consent-controls">Skip to direct controls</a>
      <div className="consentWorld" aria-hidden="true" data-webgl={webglAvailable ? 'available' : 'fallback'}>
        {webglAvailable ? (
          <Suspense fallback={<div className="consentWorldFallback">Preparing spatial sanctuary…</div>}>
            <SanctuaryWorld policy={policy} selectedDomain={selectedDomain} onSelect={setSelectedDomain} reducedMotion={reducedMotion} />
          </Suspense>
        ) : (
          <div className="consentWorldFallback">
            <strong>Consent Sanctuary</strong>
            <span>Spatial rendering is unavailable. Every privacy operation remains available below.</span>
          </div>
        )}
      </div>

      <header className="consentHeader">
        <p>UrAi · Consent Sanctuary</p>
        <h1>Your life answers to you.</h1>
        <div className="consentStatus" role="status" aria-live="polite">{message}</div>
        {loadState === 'demo' ? <strong className="consentDisclosure">DEMONSTRATION — no personal data</strong> : null}
      </header>

      <nav className="consentRealmNav" aria-label="Consent domains">
        {DOMAIN_ORDER.map((domain) => (
          <button
            key={domain}
            type="button"
            aria-pressed={selectedDomain === domain}
            data-mode={policy.domains[domain].mode}
            onClick={() => setSelectedDomain(domain)}
          >
            <span>{DOMAIN_LABELS[domain]}</span>
            <small>{policy.domains[domain].mode}</small>
          </button>
        ))}
      </nav>

      <section id="consent-controls" className="consentPanel" aria-labelledby="selected-domain-title">
        <div className="consentPanelHeading">
          <div>
            <p>Selected domain</p>
            <h2 id="selected-domain-title">{DOMAIN_LABELS[selectedDomain]}</h2>
          </div>
          <span className="consentMode" data-mode={selected.mode}>{selected.mode}</span>
        </div>

        {loadState === 'signed-out' ? (
          <div className="consentBoundary"><h3>Private controls require sign-in</h3><p>No demonstration state was substituted for your account.</p><a href="/login?returnTo=%2Fprivacy-controls">Sign in</a></div>
        ) : null}
        {loadState === 'unavailable' ? (
          <div className="consentBoundary"><h3>Permission service unavailable</h3><p>Existing permissions remain unchanged. Try again after service is restored.</p></div>
        ) : null}

        <fieldset disabled={controlsDisabled}>
          <legend>Access state</legend>
          <div className="consentChoiceGrid">
            {MODE_OPTIONS.map((mode) => (
              <button key={mode} type="button" aria-pressed={selected.mode === mode} onClick={() => propose(selectedDomain, { mode })}>{mode}</button>
            ))}
          </div>
        </fieldset>

        <div className="consentToggleGrid">
          {selectedDomain === 'location' ? (
            <label><input type="checkbox" checked={selected.precise} disabled={controlsDisabled} onChange={(event) => propose('location', { precise: event.target.checked })} /><span>Allow precise private location</span></label>
          ) : null}
          {selectedDomain === 'memory' ? (
            <>
              <label><input type="checkbox" checked={selected.lifeMapVisible} disabled={controlsDisabled} onChange={(event) => propose('memory', { lifeMapVisible: event.target.checked })} /><span>Show allowed memories in Life Map</span></label>
              <label><input type="checkbox" checked={selected.replayVisible} disabled={controlsDisabled} onChange={(event) => propose('memory', { replayVisible: event.target.checked })} /><span>Show allowed memories in Replay</span></label>
            </>
          ) : null}
          {selectedDomain === 'models' ? (
            <label><input type="checkbox" checked={selected.modelContext} disabled={controlsDisabled} onChange={(event) => propose('models', { modelContext: event.target.checked })} /><span>Allow approved context in model requests</span></label>
          ) : null}
          {selectedDomain === 'exports' ? (
            <label><input type="checkbox" checked={selected.sharingEnabled} disabled={controlsDisabled} onChange={(event) => propose('exports', { sharingEnabled: event.target.checked })} /><span>Allow creation of scoped share links</span></label>
          ) : null}
          {selectedDomain === 'workforce' ? (
            <label><input type="checkbox" checked={selected.automationEnabled} disabled={controlsDisabled} onChange={(event) => propose('workforce', { automationEnabled: event.target.checked })} /><span>Allow previously authorized automation</span></label>
          ) : null}
          {selectedDomain === 'identity' ? (
            <label><input type="checkbox" checked={selected.likenessEnabled} disabled={controlsDisabled} onChange={(event) => propose('identity', { likenessEnabled: event.target.checked })} /><span>Allow explicitly approved identity or likeness use</span></label>
          ) : null}
        </div>

        <label className="consentRetention">
          <span>Retention</span>
          <select
            value={selected.retentionDays ?? 0}
            disabled={controlsDisabled}
            onChange={(event) => propose(selectedDomain, { retentionDays: Number(event.target.value) || null })}
          >
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="0">Until I delete it</option>
          </select>
        </label>

        <div className="consentActions">
          <button type="button" onClick={() => setShowAudit((value) => !value)} aria-expanded={showAudit}>Consent history</button>
          <a href="/passport">Passport</a>
          <a href="/life-map">Life Map</a>
          <button type="button" onClick={() => history.length > 1 ? history.back() : location.assign('/passport')}>Return to prior world</button>
        </div>
      </section>

      <aside className="consentOrb" aria-label="Orb privacy explanation">
        <strong>Orb</strong>
        <p>{consequenceSummary(selectedDomain, selected).join(' ')}</p>
        <small>You remain the decision-maker. The Orb cannot grant consent.</small>
      </aside>

      {showAudit ? (
        <section className="consentAudit" aria-labelledby="consent-audit-title">
          <div><h2 id="consent-audit-title">Consent history</h2><button type="button" onClick={() => setShowAudit(false)}>Close</button></div>
          {audit.length ? (
            <ol>{audit.map((entry) => <li key={entry.id}><strong>{DOMAIN_LABELS[entry.domain]}</strong><span>{entry.previousMode} → {entry.nextMode}</span><small>{dateLabel(entry)} · revision {entry.revision} · {entry.id.slice(0, 8)}</small></li>)}</ol>
          ) : <p>No consent changes are recorded for this state.</p>}
        </section>
      ) : null}

      {pending ? (
        <div className="consentDialogBackdrop" role="presentation">
          <section className="consentDialog" role="dialog" aria-modal="true" aria-labelledby="consent-preview-title" aria-describedby="consent-preview-detail">
            <p>Nothing has changed yet</p>
            <h2 id="consent-preview-title">Preview {DOMAIN_LABELS[pending.domain]} change</h2>
            <ul id="consent-preview-detail">{consequenceSummary(pending.domain, pending.next).map((effect) => <li key={effect}>{effect}</li>)}</ul>
            <div>
              <button type="button" onClick={() => { setPending(null); setMutationState('idle'); setMessage('Change cancelled. No permission was modified.') }}>Cancel</button>
              <button ref={confirmRef} type="button" disabled={mutationState === 'saving'} onClick={() => void confirmChange()}>{mutationState === 'saving' ? 'Enforcing…' : 'Confirm and enforce'}</button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}
