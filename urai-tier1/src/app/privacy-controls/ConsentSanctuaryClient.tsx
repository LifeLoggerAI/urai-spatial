'use client'

import { Canvas } from '@react-three/fiber'
import { Float, OrbitControls, RoundedBox, Text } from '@react-three/drei'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import {
  applyOperationalConsentPolicy,
  cancelOperationalDeletionRequest,
  cancelOperationalExportRequest,
  createOperationalDeletionRequest,
  createOperationalExportRequest,
  getOperationalExportDownloadUrl,
  subscribeOperationalUserCollection,
  type PrivacyRow,
} from '@/lib/privacy/operationalPrivacyClient'
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

type LoadState = 'loading' | 'private' | 'demo' | 'signed-out' | 'unavailable' | 'offline'
type MutationState = 'idle' | 'previewing' | 'requested' | 'pending' | 'partial' | 'success' | 'failed' | 'conflict'
type PendingChange = { domain: ConsentDomain; next: ConsentDomainPolicy }

const MODE_OPTIONS: ConsentMode[] = ['granted', 'limited', 'paused', 'denied']
const EXPORT_SCOPES = ['profile', 'consent', 'memories', 'spatial', 'audit'] as const
const DELETION_SCOPES = [
  ['export-history', 'Export history', 'CONFIRM DELETE'],
  ['privacy-history', 'Privacy history', 'CONFIRM DELETE'],
  ['memories', 'Memories and replay records', 'CONFIRM DELETE'],
  ['spatial-state', 'Spatial state', 'CONFIRM DELETE'],
  ['all-repository-data', 'All repository-controlled UrAi data', 'DELETE MY URAI DATA'],
  ['account', 'Entire account after a grace period', 'DELETE MY URAI ACCOUNT'],
] as const

function consentColor(mode: ConsentMode) {
  if (mode === 'granted') return '#8ce7ee'
  if (mode === 'limited') return '#e9cb88'
  if (mode === 'paused') return '#b6a4ff'
  return '#657080'
}

function Chamber({ domain, policy, index, selected, onSelect }: {
  domain: ConsentDomain
  policy: ConsentDomainPolicy
  index: number
  selected: boolean
  onSelect: (domain: ConsentDomain) => void
}) {
  const angle = (index / DOMAIN_ORDER.length) * Math.PI * 2
  const radius = 5.2
  const color = consentColor(policy.mode)
  return (
    <group position={[Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <Float speed={policy.mode === 'paused' ? 0.2 : 0.65} rotationIntensity={0.05} floatIntensity={0.1}>
        <RoundedBox
          args={[2.4, 2.5, 0.7]}
          radius={0.18}
          smoothness={4}
          onClick={(event) => { event.stopPropagation(); onSelect(domain) }}
        >
          <meshStandardMaterial
            color={selected ? color : '#101923'}
            emissive={color}
            emissiveIntensity={selected ? 0.72 : policy.mode === 'denied' ? 0.03 : 0.16}
            metalness={0.35}
            roughness={0.4}
          />
        </RoundedBox>
        <Text position={[0, 0.15, 0.38]} fontSize={0.25} maxWidth={1.9} textAlign="center" color="#f4f8fb">
          {DOMAIN_LABELS[domain]}
        </Text>
        <Text position={[0, -0.55, 0.38]} fontSize={0.16} color={color}>{policy.mode.toUpperCase()}</Text>
      </Float>
    </group>
  )
}

function SanctuaryWorld({ policy, selectedDomain, onSelect, reducedMotion }: {
  policy: ConsentPolicy
  selectedDomain: ConsentDomain
  onSelect: (domain: ConsentDomain) => void
  reducedMotion: boolean
}) {
  const selected = policy.domains[selectedDomain]
  const interrupted = policy.enforcement.state === 'failed' || policy.enforcement.state === 'partially-enforced'
  return (
    <Canvas camera={{ position: [0, 7.2, 11.8], fov: 48 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: false }}>
      <color attach="background" args={['#02070c']} />
      <fog attach="fog" args={['#02070c', 10, 24]} />
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 9, 5]} intensity={1.25} color="#dffbff" />
      <pointLight position={[0, 2.4, 0]} intensity={interrupted ? 8 : 24} distance={12} color={interrupted ? '#ff9f7a' : consentColor(selected.mode)} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.1, 0]}>
        <circleGeometry args={[9.4, 64]} />
        <meshStandardMaterial color="#07121a" metalness={0.18} roughness={0.72} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 0]}>
        <ringGeometry args={[2.3, 8.2, 64]} />
        <meshBasicMaterial color={interrupted ? '#8b392c' : '#163c47'} transparent opacity={0.24} />
      </mesh>
      {DOMAIN_ORDER.map((domain, index) => (
        <Chamber key={domain} domain={domain} policy={policy.domains[domain]} index={index} selected={domain === selectedDomain} onSelect={onSelect} />
      ))}
      <group position={[0, 0.35, 0]}>
        <Float speed={reducedMotion ? 0 : 0.9} rotationIntensity={reducedMotion ? 0 : 0.25} floatIntensity={reducedMotion ? 0 : 0.3}>
          <mesh>
            <icosahedronGeometry args={[0.82, 3]} />
            <meshStandardMaterial color={interrupted ? '#ffb09b' : '#baf8ff'} emissive={interrupted ? '#9b382a' : '#63e7f5'} emissiveIntensity={1.4} transparent opacity={0.9} />
          </mesh>
        </Float>
      </group>
      <OrbitControls enablePan enableZoom minDistance={7} maxDistance={17} maxPolarAngle={Math.PI * 0.48} minPolarAngle={Math.PI * 0.18} enableDamping={!reducedMotion} dampingFactor={0.08} />
    </Canvas>
  )
}

function demoPolicy() {
  const policy = defaultConsentPolicy('disclosed-demo')
  policy.domains.exports.mode = 'limited'
  policy.enforcement = { state: 'partially-enforced', jobId: 'sample-job', affectedTargets: ['share-links', 'provider-revocation'], providerState: 'pending' }
  return policy
}

function errorCode(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (message.includes('CONSENT_REVISION_CONFLICT') || message.includes('aborted')) return 'conflict'
  if (message.includes('RECENT_REAUTHENTICATION_REQUIRED') || message.includes('failed-precondition')) return 'reauth'
  return 'failed'
}

export default function ConsentSanctuaryClient() {
  const params = useMemo(() => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search), [])
  const explicitDemo = params.get('demo') === '1'
  const [user, setUser] = useState<User | null>(null)
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [policy, setPolicy] = useState<ConsentPolicy>(() => demoPolicy())
  const [selectedDomain, setSelectedDomain] = useState<ConsentDomain>('memory')
  const [pending, setPending] = useState<PendingChange | null>(null)
  const [mutationState, setMutationState] = useState<MutationState>('idle')
  const [message, setMessage] = useState('Opening the Consent Sanctuary…')
  const [receipts, setReceipts] = useState<PrivacyRow[]>([])
  const [exports, setExports] = useState<PrivacyRow[]>([])
  const [deletions, setDeletions] = useState<PrivacyRow[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [exportScopes, setExportScopes] = useState<string[]>(['consent', 'audit'])
  const [deletionScope, setDeletionScope] = useState('memories')
  const [deletionConfirmation, setDeletionConfirmation] = useState('')
  const [operationBusy, setOperationBusy] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    const online = () => { setLoadState((state) => state === 'offline' ? 'loading' : state); setMessage('Connection restored. Rechecking server authority…') }
    const offline = () => { setLoadState('offline'); setMessage('Offline. No change can be represented as saved or enforced.') }
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setWebglAvailable(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch { setWebglAvailable(false) }
  }, [])

  useEffect(() => {
    if (explicitDemo) {
      setPolicy(demoPolicy())
      setLoadState('demo')
      setMessage('DEMONSTRATION — no personal data. Controls cannot write production state.')
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
      setLoadState(navigator.onLine ? 'loading' : 'offline')
    })
  }, [explicitDemo])

  useEffect(() => {
    if (!user || explicitDemo || loadState === 'signed-out' || loadState === 'unavailable') return
    const policyRef = doc(getFirebaseDb(), 'users', user.uid, 'privacyPolicy', 'current')
    return onSnapshot(policyRef, (snapshot) => {
      const next = snapshot.exists() && isConsentPolicy(snapshot.data(), user.uid) ? snapshot.data() : defaultConsentPolicy(user.uid)
      setPolicy(next)
      setLoadState('private')
      const state = next.enforcement.state
      setMutationState(state === 'fully-enforced' ? 'success' : state === 'partially-enforced' ? 'partial' : state === 'failed' ? 'failed' : state === 'conflicted' ? 'conflict' : 'pending')
      setMessage(
        state === 'fully-enforced' ? 'Repository-controlled targets report full enforcement.' :
        state === 'partially-enforced' ? 'Repository enforcement is complete, but provider revocation is still pending.' :
        state === 'failed' ? 'Enforcement failed. The interrupted pathway remains visible and requires retry or support.' :
        'Policy persisted. Enforcement is still pending.',
      )
    }, () => {
      setLoadState('unavailable')
      setMessage('The consent authority could not be read. No private state was replaced with demo data.')
    })
  }, [user, explicitDemo, loadState])

  useEffect(() => {
    if (!user || explicitDemo) return
    const unsubscribers = [
      subscribeOperationalUserCollection('privacyReceipts', user.uid, setReceipts, () => setMessage('Audit receipts are temporarily unavailable.')),
      subscribeOperationalUserCollection('exportJobs', user.uid, setExports, () => setMessage('Export status is temporarily unavailable.')),
      subscribeOperationalUserCollection('deletionJobs', user.uid, setDeletions, () => setMessage('Deletion status is temporarily unavailable.')),
    ]
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [user, explicitDemo])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Home') { event.preventDefault(); setSelectedDomain('memory'); document.getElementById('consent-controls')?.focus() }
      if (event.key !== 'Escape') return
      if (pending) { setPending(null); setMutationState('idle'); return }
      if (showAudit) { setShowAudit(false); return }
      if (window.history.length > 1) window.history.back(); else window.location.assign('/passport')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [pending, showAudit])

  useEffect(() => { if (pending) requestAnimationFrame(() => confirmRef.current?.focus()) }, [pending])

  const propose = (domain: ConsentDomain, patch: Partial<ConsentDomainPolicy>) => {
    if (loadState !== 'private') return
    setPending({ domain, next: { ...policy.domains[domain], ...patch } })
    setMutationState('previewing')
    setMessage(`Previewing ${DOMAIN_LABELS[domain]}. Nothing has changed yet.`)
  }

  const confirmChange = async () => {
    if (!pending || !user || loadState !== 'private') return
    setMutationState('requested')
    setMessage('Requesting a revision-controlled policy change…')
    try {
      const result = await applyOperationalConsentPolicy({
        domain: pending.domain,
        next: pending.next as unknown as Record<string, unknown>,
        expectedRevision: policy.revision,
      })
      setPending(null)
      setMutationState('pending')
      setMessage(`Request accepted. Enforcement job ${String(result.jobId ?? '').slice(0, 10)} is pending; no completion is claimed yet.`)
    } catch (error) {
      const code = errorCode(error)
      setMutationState(code === 'conflict' ? 'conflict' : 'failed')
      setMessage(code === 'conflict' ? 'Another session changed this policy first. Current server authority must be reloaded.' : 'The change was not accepted. The prior server policy remains authoritative.')
    }
  }

  const requestExport = async () => {
    if (loadState !== 'private' || exportScopes.length === 0) return
    setOperationBusy(true)
    try {
      const result = await createOperationalExportRequest(exportScopes)
      setMessage(`Export ${String(result.jobId ?? '').slice(0, 10)} queued. It is not ready until the server reports ready.`)
    } catch (error) {
      setMessage(errorCode(error) === 'reauth' ? 'Recent reauthentication is required before an export can begin.' : 'Export request failed. No file was created or represented as ready.')
    } finally { setOperationBusy(false) }
  }

  const requestDeletion = async () => {
    if (loadState !== 'private') return
    const required = DELETION_SCOPES.find(([scope]) => scope === deletionScope)?.[2] ?? 'CONFIRM DELETE'
    if (deletionConfirmation !== required) { setMessage(`Type “${required}” exactly to confirm this scope.`); return }
    setOperationBusy(true)
    try {
      const result = await createOperationalDeletionRequest({ scope: deletionScope, confirmation: deletionConfirmation })
      setDeletionConfirmation('')
      setMessage(`Deletion ${String(result.jobId ?? '').slice(0, 10)} entered ${String(result.state)}. Completion is not claimed until the trusted job reports completed.`)
    } catch (error) {
      setMessage(errorCode(error) === 'reauth' ? 'Recent reauthentication is required before deletion can begin.' : 'Deletion request failed. No data was represented as deleted.')
    } finally { setOperationBusy(false) }
  }

  const selected = policy.domains[selectedDomain]
  const canWrite = loadState === 'private' && mutationState !== 'requested'
  const requiredDeletionText = DELETION_SCOPES.find(([scope]) => scope === deletionScope)?.[2] ?? 'CONFIRM DELETE'

  return (
    <main className="consentSanctuary" data-route-owner="consent-sanctuary" data-privacy-source={loadState} data-enforcement-state={policy.enforcement.state}>
      <a className="consentSkip" href="#consent-controls">Skip to direct controls</a>
      <div className="consentWorld" aria-hidden="true">
        {webglAvailable ? <Suspense fallback={null}><SanctuaryWorld policy={policy} selectedDomain={selectedDomain} onSelect={setSelectedDomain} reducedMotion={reducedMotion} /></Suspense> : (
          <div className="consentWorldFallback"><strong>Consent Sanctuary</strong><span>Semantic controls remain fully available without WebGL.</span></div>
        )}
      </div>
      <header className="consentHeader">
        <p>UrAi Consent Sanctuary</p>
        <h1>Choose what the world may hold.</h1>
        <div className="consentStatus" role="status" aria-live="polite">{message}</div>
        {loadState === 'demo' && <span className="consentDisclosure">DEMONSTRATION — no personal data</span>}
      </header>

      <nav className="consentRealmNav" aria-label="Consent domains">
        {DOMAIN_ORDER.map((domain) => <button key={domain} type="button" aria-pressed={domain === selectedDomain} onClick={() => setSelectedDomain(domain)}><span>{DOMAIN_LABELS[domain]}</span><small>{policy.domains[domain].mode}</small></button>)}
      </nav>

      <section id="consent-controls" tabIndex={-1} className="consentPanel" aria-label={`${DOMAIN_LABELS[selectedDomain]} controls`}>
        <div className="consentPanelHeading"><div><p>Revision {policy.revision}</p><h2>{DOMAIN_LABELS[selectedDomain]}</h2></div><span className="consentMode" data-mode={selected.mode}>{selected.mode}</span></div>
        <p><strong>Enforcement:</strong> {policy.enforcement.state}; provider state: {policy.enforcement.providerState}.</p>
        <fieldset disabled={!canWrite}><legend>Authority level</legend><div className="consentChoiceGrid">{MODE_OPTIONS.map((mode) => <button type="button" key={mode} aria-pressed={selected.mode === mode} onClick={() => propose(selectedDomain, { mode })}>{mode}</button>)}</div></fieldset>
        <div className="consentToggleGrid">
          {selectedDomain === 'location' && <label><input disabled={!canWrite} type="checkbox" checked={selected.precise} onChange={(event) => propose(selectedDomain, { precise: event.target.checked })} /><span>Allow precise private location</span></label>}
          {selectedDomain === 'memory' && <><label><input disabled={!canWrite} type="checkbox" checked={selected.replayVisible} onChange={(event) => propose(selectedDomain, { replayVisible: event.target.checked })} /><span>Visible in Replay</span></label><label><input disabled={!canWrite} type="checkbox" checked={selected.lifeMapVisible} onChange={(event) => propose(selectedDomain, { lifeMapVisible: event.target.checked })} /><span>Visible in Life Map</span></label></>}
          {selectedDomain === 'models' && <label><input disabled={!canWrite} type="checkbox" checked={selected.modelContext} onChange={(event) => propose(selectedDomain, { modelContext: event.target.checked })} /><span>Allow new model context retrieval</span></label>}
          {selectedDomain === 'exports' && <label><input disabled={!canWrite} type="checkbox" checked={selected.sharingEnabled} onChange={(event) => propose(selectedDomain, { sharingEnabled: event.target.checked })} /><span>Allow new exports and sharing</span></label>}
          {selectedDomain === 'workforce' && <label><input disabled={!canWrite} type="checkbox" checked={selected.automationEnabled} onChange={(event) => propose(selectedDomain, { automationEnabled: event.target.checked })} /><span>Allow approved external actions</span></label>}
          {selectedDomain === 'identity' && <label><input disabled={!canWrite} type="checkbox" checked={selected.likenessEnabled} onChange={(event) => propose(selectedDomain, { likenessEnabled: event.target.checked })} /><span>Allow identity, likeness and legacy use</span></label>}
        </div>
        <label className="consentRetention"><span>Retention</span><select disabled={!canWrite} value={selected.retentionDays ?? 'none'} onChange={(event) => propose(selectedDomain, { retentionDays: event.target.value === 'none' ? null : Number(event.target.value) })}><option value="30">30 days</option><option value="90">90 days</option><option value="365">365 days</option><option value="none">Until separately deleted</option></select></label>
        <div className="consentActions"><button type="button" onClick={() => setShowAudit(true)}>Inspect receipts</button><a href="/passport">Open Ownership Vault</a><a href="/ground">Return to Ground</a></div>

        <hr />
        <h3>Authenticated export</h3>
        <p>Choose scope. Tokens, credentials, raw secret fields and legally excepted records are excluded.</p>
        <div className="consentToggleGrid">{EXPORT_SCOPES.map((scope) => <label key={scope}><input type="checkbox" disabled={loadState !== 'private' || operationBusy} checked={exportScopes.includes(scope)} onChange={(event) => setExportScopes((items) => event.target.checked ? [...new Set([...items, scope])] : items.filter((item) => item !== scope))} /><span>{scope}</span></label>)}</div>
        <div className="consentActions"><button type="button" disabled={loadState !== 'private' || operationBusy || exportScopes.length === 0} onClick={() => void requestExport()}>Request export</button></div>
        <ol>{exports.slice(0, 5).map((job) => <li key={job.id}><strong>{String(job.state)}</strong> — {Array.isArray(job.scopes) ? job.scopes.join(', ') : 'scope unavailable'} {job.state === 'ready' && <button type="button" onClick={async () => { try { const result = await getOperationalExportDownloadUrl({ jobId: job.id }); window.location.assign(String(result.url)) } catch { setMessage('Secure download could not be authorized.') } }}>Secure download</button>} {['queued', 'preparing'].includes(String(job.state)) && <button type="button" onClick={() => void cancelOperationalExportRequest(job.id)}>Cancel</button>}</li>)}</ol>

        <hr />
        <h3>Scoped deletion</h3>
        <p>Completion is shown only after the trusted deletion job confirms it. Append-only evidence and required security/legal records may remain.</p>
        <label className="consentRetention"><span>Deletion scope</span><select value={deletionScope} disabled={loadState !== 'private' || operationBusy} onChange={(event) => { setDeletionScope(event.target.value); setDeletionConfirmation('') }}>{DELETION_SCOPES.map(([scope, label]) => <option key={scope} value={scope}>{label}</option>)}</select></label>
        <label><span>Type {requiredDeletionText}</span><input value={deletionConfirmation} disabled={loadState !== 'private' || operationBusy} onChange={(event) => setDeletionConfirmation(event.target.value)} /></label>
        <div className="consentActions"><button type="button" disabled={loadState !== 'private' || operationBusy} onClick={() => void requestDeletion()}>Create deletion request</button></div>
        <ol>{deletions.slice(0, 5).map((job) => <li key={job.id}><strong>{String(job.state)}</strong> — {String(job.scope)} {['queued', 'awaiting-grace'].includes(String(job.state)) && <button type="button" onClick={() => void cancelOperationalDeletionRequest(job.id)}>Cancel</button>}</li>)}</ol>
      </section>

      <aside className="consentOrb" aria-label="Enforcement status"><strong>{policy.enforcement.state}</strong><p>{policy.enforcement.affectedTargets.length ? `${policy.enforcement.affectedTargets.length} connected targets` : 'No active propagation job'}</p><small>Animations reflect the server state; they never prove backend completion.</small></aside>

      {showAudit && <section className="consentAudit" aria-label="Privacy audit receipts"><div><h2>Append-only receipts</h2><button type="button" onClick={() => setShowAudit(false)}>Close</button></div><ol>{receipts.length ? receipts.map((entry) => <li key={entry.id}><strong>{String(entry.kind ?? 'privacy')}</strong><span>{String(entry.result ?? 'recorded')}</span><small>{entry.id.slice(0, 12)}</small></li>) : <li>No receipts exist for this owner.</li>}</ol></section>}

      {pending && <div className="consentDialogBackdrop"><section className="consentDialog" role="dialog" aria-modal="true" aria-labelledby="consent-preview-title"><p>Consequence preview</p><h2 id="consent-preview-title">Confirm {DOMAIN_LABELS[pending.domain]}</h2><ul>{consequenceSummary(pending.domain, pending.next).map((effect) => <li key={effect}>{effect}</li>)}</ul><div><button type="button" onClick={() => { setPending(null); setMutationState('idle') }}>Cancel</button><button ref={confirmRef} type="button" onClick={() => void confirmChange()}>Confirm and request enforcement</button></div></section></div>}
    </main>
  )
}
