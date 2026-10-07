"use client"

import { useReducedMotion } from '@/hooks/useReducedMotion'
import dynamic from 'next/dynamic'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useMemo, useRef, useState } from 'react'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { assetCssStack, passportAssets } from '@/spatial/assets/uraiAssets'
import {
  cancelOperationalDeletionRequest,
  cancelOperationalExportRequest,
  createOperationalDeletionRequest,
  createOperationalExportRequest,
  getOperationalExportDownloadUrl,
  getOperationalPassportSnapshot,
  subscribeOperationalUserCollection,
  type PrivacyRow,
} from '@/lib/privacy/operationalPrivacyClient'
import { demoPassportSnapshot, redactPassportSnapshot, type PassportSnapshot } from './passportModel'
import { ZONES } from './passportZones'
import './passport-vault.css'

// Ownership controls commit before the decorative WebGL module initializes.
const VaultWorld = dynamic(() => import('./VaultWorld'), { ssr: false })

type LoadState = 'loading' | 'private' | 'demo' | 'signed-out' | 'empty' | 'offline' | 'unavailable'
type SnapshotPayload = Record<string, unknown>

const DELETION_SCOPES = [
  ['export-history', 'Export history', 'CONFIRM DELETE'],
  ['privacy-history', 'Privacy history', 'CONFIRM DELETE'],
  ['memories', 'Memories and replay records', 'CONFIRM DELETE'],
  ['spatial-state', 'Spatial state', 'CONFIRM DELETE'],
  ['life-model', 'Life causal graph and person/world model', 'CONFIRM DELETE'],
  ['intelligence', 'Possible Futures and AI activity ledger', 'CONFIRM DELETE'],
  ['all-repository-data', 'All repository-controlled UrAi data', 'DELETE MY URAI DATA'],
  ['account', 'Entire account after a grace period', 'DELETE MY URAI ACCOUNT'],
] as const

function runtimeExportAssetIds(job: PrivacyRow): string[] {
  const entries = job.runtimeExports
  if (!Array.isArray(entries)) return []
  return entries.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    const assetId = (entry as Record<string, unknown>).assetId
    return typeof assetId === 'string' && assetId ? [assetId] : []
  })
}

function toDemoPayload(): SnapshotPayload {
  const sample = redactPassportSnapshot(demoPassportSnapshot())
  return {
    owner: { displayName: sample.displayName, ownershipStatus: sample.ownershipStatus, keyState: sample.keyState, ownerReference: 'sample-owner' },
    consent: { revision: 4, enforcement: { state: 'fully-enforced', providerState: 'not-applicable' }, domains: {} },
    sources: sample.sources,
    devices: sample.devices,
    providers: [],
    exports: [],
    deletions: [],
    receipts: sample.receipts,
    recovery: { status: sample.recoveryStatus, supportAvailable: true },
  }
}

const list = (value: unknown): Record<string, unknown>[] => Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object') : []
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

export default function PassportVaultClient() {
  const params = useMemo(() => typeof window === 'undefined' ? new URLSearchParams() : new URLSearchParams(window.location.search), [])
  const explicitDemo = params.get('demo') === '1'
  const authEpoch = useRef(0)
  const [user, setUser] = useState<User | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [snapshot, setSnapshot] = useState<SnapshotPayload>({})
  const [selectedZone, setSelectedZone] = useState('identity')
  const [message, setMessage] = useState('Opening your Ownership Vault…')
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [exports, setExports] = useState<PrivacyRow[]>([])
  const [deletions, setDeletions] = useState<PrivacyRow[]>([])
  const [receipts, setReceipts] = useState<PrivacyRow[]>([])
  const [exportScopes, setExportScopes] = useState<string[]>(['profile', 'consent', 'audit'])
  const [deletionScope, setDeletionScope] = useState('memories')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setWebglAvailable(Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl')))
    } catch {
      setWebglAvailable(false)
    }
    const onOffline = () => { setState('offline'); setMessage('Offline. The vault remains readable from its last server snapshot, but no sensitive action can begin.') }
    const onOnline = () => {
      if (explicitDemo) {
        setState('demo')
        setMessage('DEMONSTRATION — sample data only. No private account is connected.')
      } else if (!firebasePublicEnvReady) {
        setState('unavailable')
        setMessage('Ownership services are not configured. Demo data was not substituted.')
      } else if (!user) {
        setState('signed-out')
        setMessage('Sign in to open your private Ownership Vault.')
      } else {
        setMessage('Connection restored. Refreshing owner authority…')
        setState('loading')
      }
    }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline) }
  }, [explicitDemo, user])

  useEffect(() => {
    if (explicitDemo) {
      setSnapshot(toDemoPayload())
      setState('demo')
      setMessage('DEMONSTRATION — sample data only. No private account is connected.')
      return
    }
    if (!firebasePublicEnvReady) {
      setState('unavailable')
      setMessage('Ownership services are not configured. Demo data was not substituted.')
      return
    }
    return onAuthStateChanged(getAuth(app), (nextUser) => {
      authEpoch.current += 1
      setSnapshot({})
      setExports([])
      setDeletions([])
      setReceipts([])
      setConfirmation('')
      setBusy(false)
      setUser(nextUser)
      if (!nextUser) {
        setState('signed-out')
        setMessage('Sign in to open your private Ownership Vault.')
        return
      }
      setState(navigator.onLine ? 'loading' : 'offline')
    })
  }, [explicitDemo])

  useEffect(() => {
    if (!user || explicitDemo || state === 'offline') return
    let active = true
    const epoch = authEpoch.current
    void getOperationalPassportSnapshot().then((payload) => {
      if (!active || epoch !== authEpoch.current || !navigator.onLine) return
      setSnapshot(payload)
      const empty = list(payload.sources).length === 0 && list(payload.devices).length === 0 && list(payload.receipts).length === 0
      setState(empty ? 'empty' : 'private')
      setMessage(empty ? 'Your vault is private and currently empty. Connect a source only through an explicit authorization path.' : 'Owner-scoped records loaded from the trusted Passport service.')
    }).catch(() => {
      if (!active || epoch !== authEpoch.current || !navigator.onLine) return
      setState('unavailable')
      setMessage('The vault service is unavailable. No private state was replaced with sample data.')
    })
    return () => { active = false }
  }, [user, explicitDemo, state])

  useEffect(() => {
    if (!user || explicitDemo) return
    let active = true
    const epoch = authEpoch.current
    const current = () => active && epoch === authEpoch.current
    const unsubscribers = [
      subscribeOperationalUserCollection('exportJobs', user.uid, (rows) => { if (current()) setExports(rows) }, () => { if (current()) setMessage('Export history is temporarily unavailable.') }),
      subscribeOperationalUserCollection('deletionJobs', user.uid, (rows) => { if (current()) setDeletions(rows) }, () => { if (current()) setMessage('Deletion history is temporarily unavailable.') }),
      subscribeOperationalUserCollection('privacyReceipts', user.uid, (rows) => { if (current()) setReceipts(rows) }, () => { if (current()) setMessage('Audit receipts are temporarily unavailable.') }),
    ]
    return () => { active = false; unsubscribers.forEach((unsubscribe) => unsubscribe()) }
  }, [user, explicitDemo])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Home') { event.preventDefault(); setSelectedZone('identity'); document.getElementById('passport-controls')?.focus() }
      if (event.key === 'Escape') { if (window.history.length > 1) window.history.back(); else window.location.assign('/ground') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const owner = record(snapshot.owner)
  const consent = record(snapshot.consent)
  const enforcement = record(consent.enforcement)
  const sources = list(snapshot.sources)
  const devices = list(snapshot.devices)
  const serverReceipts = list(snapshot.receipts)
  const recovery = record(snapshot.recovery)
  const keyState = String(owner.keyState ?? 'locked')
  const canOperate = state === 'private' && keyState === 'authorized' && !busy
  const requiredText = DELETION_SCOPES.find(([scope]) => scope === deletionScope)?.[2] ?? 'CONFIRM DELETE'

  const requestExport = async () => {
    const epoch = authEpoch.current
    if (!canOperate) { setMessage('Unlock the ownership key with a recent sign-in before exporting.'); return }
    setBusy(true)
    try {
      const result = await createOperationalExportRequest(exportScopes)
      if (epoch !== authEpoch.current) return
      setMessage(`Export ${String(result.jobId ?? '').slice(0, 10)} queued. Ready state requires server completion.`)
    } catch {
      if (epoch !== authEpoch.current) return
      setMessage('Export was not authorized. A recent reauthentication may be required; no file was represented as ready.')
    } finally { if (epoch === authEpoch.current) setBusy(false) }
  }

  const requestDeletion = async () => {
    const epoch = authEpoch.current
    if (!canOperate) { setMessage('Unlock the ownership key with a recent sign-in before deletion.'); return }
    if (confirmation !== requiredText) { setMessage(`Type “${requiredText}” exactly for this deletion scope.`); return }
    setBusy(true)
    try {
      const result = await createOperationalDeletionRequest({ scope: deletionScope, confirmation })
      if (epoch !== authEpoch.current) return
      setConfirmation('')
      if (epoch !== authEpoch.current) return
      setMessage(`Deletion ${String(result.jobId ?? '').slice(0, 10)} entered ${String(result.state)}. Nothing is called deleted until the trusted job reports completed.`)
    } catch {
      if (epoch !== authEpoch.current) return
      setMessage('Deletion was not authorized. No data was represented as deleted.')
    } finally { if (epoch === authEpoch.current) setBusy(false) }
  }

  const zoneRows: Record<string, Record<string, unknown>[]> = {
    sources,
    devices,
    provenance: sources,
    consent: Object.entries(record(consent.domains)).map(([id, value]) => ({ id, ...record(value) })),
    exports: exports.length ? exports : list(snapshot.exports),
    deletion: deletions.length ? deletions : list(snapshot.deletions),
    audit: receipts.length ? receipts : serverReceipts,
    recovery: [recovery],
    identity: [owner],
  }

  return (
    <main className="passportVault" data-route-owner="passport-ownership-vault" data-passport-source={state} data-key-state={keyState}>
      <a href="#passport-controls" className="passportSkip">Skip to vault controls</a>
      <div className="passportWorld" aria-hidden="true">
        <div
          className="passportEnvironmentArt"
          data-passport-environment-role="governed-visual-support"
          style={{ backgroundImage: assetCssStack(passportAssets.primary) }}
        />
        {webglAvailable ? <VaultWorld selected={selectedZone} keyState={keyState} onSelect={setSelectedZone} reducedMotion={reducedMotion} /> : <div className="passportFallback" />}
      </div>
      <header className="passportHeader"><p>UrAi Passport</p><h1>Your life remains in your possession.</h1>{!webglAvailable && <div className="passportFallbackNotice" role="note">Vault controls remain available without WebGL.</div>}<div role="status" aria-live="polite" className="passportStatus">{message}</div>{state === 'demo' && <span className="passportDisclosure">DEMONSTRATION — sample data only</span>}</header>
      <nav className="passportZones" aria-label="Ownership Vault zones">{ZONES.map(([id, label]) => <button key={id} type="button" aria-pressed={selectedZone === id} onClick={() => setSelectedZone(id)}>{label}</button>)}</nav>
      <section id="passport-controls" tabIndex={-1} className="passportPanel">
        <div className="passportPanelHeading"><div><p>Owner reference {String(owner.ownerReference ?? 'not available')}</p><h2>{ZONES.find(([id]) => id === selectedZone)?.[1]}</h2></div><span data-state={keyState} className="passportKeyState">{keyState}</span></div>
        <p><strong>Ownership:</strong> {String(owner.ownershipStatus ?? 'unavailable')}. <strong>Consent revision:</strong> {String(consent.revision ?? 0)}. <strong>Enforcement:</strong> {String(enforcement.state ?? 'unavailable')}.</p>
        <div className="passportRows">{(zoneRows[selectedZone] ?? []).length ? (zoneRows[selectedZone] ?? []).map((row, index) => <article key={String(row.id ?? index)}><h3>{String(row.label ?? row.kind ?? row.id ?? `Record ${index + 1}`)}</h3><dl>{Object.entries(row).filter(([key]) => !['id', 'ownerId', 'uid', 'token', 'secret'].includes(key)).slice(0, 8).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(', ') : typeof value === 'object' && value ? 'Protected structured record' : String(value ?? 'not available')}</dd></div>)}</dl></article>) : <p>No owner-scoped records exist in this zone.</p>}</div>
        <div className="passportActions"><a href="/privacy-controls">Enter Consent Sanctuary</a><a href="/mirror">Return to Mirror</a><a href="/ground">Return to Ground</a></div>
        <section className="passportOperation"><h3>Export chamber</h3><p>Exports exclude credentials, provider secrets, raw secret fields, and legally excepted records. The ownership key must be authorized by a recent sign-in.</p><div className="passportCheckGrid">{['profile', 'consent', 'memories', 'spatial', 'audit'].map((scope) => <label key={scope}><input type="checkbox" checked={exportScopes.includes(scope)} disabled={state !== 'private' || busy} onChange={(event) => setExportScopes((items) => event.target.checked ? [...new Set([...items, scope])] : items.filter((item) => item !== scope))} />{scope}</label>)}</div><button type="button" disabled={state !== 'private' || busy || exportScopes.length === 0} onClick={() => void requestExport()}>Unlock and request export</button><ol>{exports.slice(0, 6).map((job) => <li key={job.id}><strong>{String(job.state)}</strong> — {Array.isArray(job.scopes) ? job.scopes.join(', ') : 'scope unavailable'} {job.state === 'ready' && <button type="button" onClick={async () => { const epoch = authEpoch.current; try { const result = await getOperationalExportDownloadUrl({ jobId: job.id }); if (epoch !== authEpoch.current) return; window.location.assign(String(result.url)) } catch { setMessage('Secure export download could not be authorized.') } }}>Secure download</button>} {job.state === 'ready' && runtimeExportAssetIds(job).map((assetId) => <button key={assetId} type="button" onClick={async () => { const epoch = authEpoch.current; try { const result = await getOperationalExportDownloadUrl({ jobId: job.id, file: 'runtime', assetId }); if (epoch !== authEpoch.current) return; window.location.assign(String(result.url)) } catch { setMessage('Secure runtime download could not be authorized.') } }}>Runtime {assetId.slice(0, 8)}</button>)} {['queued', 'preparing'].includes(String(job.state)) && <button type="button" onClick={() => void cancelOperationalExportRequest(job.id)}>Cancel</button>}</li>)}</ol></section>
        <section className="passportOperation passportDanger"><h3>Deletion chamber</h3><p>Deletion is scoped, revision-safe, queued through the trusted backend, and leaves an append-only privacy-safe receipt. Provider and legal retention exceptions are disclosed rather than hidden.</p><label>Scope<select value={deletionScope} disabled={state !== 'private' || busy} onChange={(event) => { setDeletionScope(event.target.value); setConfirmation('') }}>{DELETION_SCOPES.map(([scope, label]) => <option key={scope} value={scope}>{label}</option>)}</select></label><label>Type {requiredText}<input value={confirmation} disabled={state !== 'private' || busy} onChange={(event) => setConfirmation(event.target.value)} /></label><button type="button" disabled={state !== 'private' || busy} onClick={() => void requestDeletion()}>Unlock and create deletion request</button><ol>{deletions.slice(0, 6).map((job) => <li key={job.id}><strong>{String(job.state)}</strong> — {String(job.scope)} {['queued', 'awaiting-grace'].includes(String(job.state)) && <button type="button" onClick={() => void cancelOperationalDeletionRequest(job.id)}>Cancel</button>}</li>)}</ol></section>
      </section>
      <aside className="passportKey" aria-label="Ownership key status"><strong>Ownership key: {keyState}</strong><span>{keyState === 'authorized' ? 'Sensitive actions may proceed under the trusted recent-auth window.' : 'Sensitive actions remain locked until recent authentication is proven.'}</span></aside>
    </main>
  )
}
