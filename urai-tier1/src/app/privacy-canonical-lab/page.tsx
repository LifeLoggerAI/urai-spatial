'use client'

/** Disposable local acceptance only. Account deletion remains request-only. */
import { useEffect, useRef, useState } from 'react'
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { disposableFirebaseReviewAuthorized as authorized, getUrAiAuth } from '@/lib/firebase/client'
import {
  createCanonicalAccountPrivacySession, canonicalDownloadIsCurrent, type CanonicalAccountPrivacySession,
  type CanonicalConsentStatus, type CanonicalPurpose, type CanonicalExportRequest,
  type CanonicalExportState, type CanonicalDeletionRequest, type CanonicalDeletionState, type CanonicalIssuedDownload,
} from '@/lib/privacy/canonicalAccountPrivacyClient'

const purposes: CanonicalPurpose[] = ['memory.storage', 'data.export']
type Result = Record<string, unknown>

export default function CanonicalPrivacyLabPage() {
  const [enabled, setEnabled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [purpose, setPurpose] = useState<CanonicalPurpose>('memory.storage')
  const [status, setStatus] = useState<CanonicalConsentStatus>('denied')
  const [result, setResult] = useState('No local authority verified.')
  const [exportRequest, setExportRequest] = useState<CanonicalExportRequest | null>(null)
  const [exportState, setExportState] = useState<CanonicalExportState | null>(null)
  const [deletionRequest, setDeletionRequest] = useState<CanonicalDeletionRequest | null>(null)
  const [deletionState, setDeletionState] = useState<CanonicalDeletionState | null>(null)
  const [download, setDownload] = useState<CanonicalIssuedDownload | null>(null)
  const [reason, setReason] = useState('Disposable test account requested deletion')
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState('Local emulator only; no real user data. No action has been executed.')
  const session = useRef<CanonicalAccountPrivacySession | null>(null)
  const pending = useRef<object | null>(null)
  const mounted = useRef(false)

  useEffect(() => {
    if (!authorized()) return
    mounted.current = true
    const auth = getUrAiAuth()
    const reset = (next: User | null, available: boolean) => {
      session.current?.close()
      session.current = null
      pending.current = null
      if (!mounted.current) return
      setUser(next); setBusy(false); setEnabled(available)
      setExportRequest(null); setExportState(null); setDeletionRequest(null); setDeletionState(null)
      setDownload(null); setConfirmation(''); setResult('No local authority verified.')
      setNotice(next ? 'Disposable account selected; request status has not been verified.' : 'Sign into disposable Auth first.')
      if (next && available) {
        try { session.current = createCanonicalAccountPrivacySession(next) }
        catch { setEnabled(false); setUser(null) }
      }
    }
    const stop = onAuthStateChanged(auth, next => reset(next && auth.currentUser !== next ? null : next, authorized()), () => reset(null, false))
    return () => {
      mounted.current = false
      session.current?.close(); session.current = null; pending.current = null
      stop()
    }
  }, [])

  useEffect(() => {
    const current = session.current
    if (!exportRequest || !current?.isCurrent()) return
    setExportState(null); setDownload(null)
    try {
      return current.watchExport(exportRequest, value => {
        if (!mounted.current || session.current !== current || !current.isCurrent()) return
        setExportState(value); setDownload(null)
      }, () => {
        if (mounted.current && session.current === current && current.isCurrent()) {
          setExportState(null); setDownload(null); setNotice('Export status unavailable; no downloadable package is verified.')
        }
      })
    } catch { setExportState(null); setDownload(null) }
  }, [exportRequest, user])

  useEffect(() => {
    const current = session.current
    if (!deletionRequest || !current?.isCurrent()) return
    setDeletionState(null)
    try {
      return current.watchDeletion(deletionRequest, value => {
        if (mounted.current && session.current === current && current.isCurrent()) setDeletionState(value)
      }, () => {
        if (mounted.current && session.current === current && current.isCurrent()) {
          setDeletionState(null); setNotice('Deletion request status unavailable; deletion is not claimed complete.')
        }
      })
    } catch { setDeletionState(null) }
  }, [deletionRequest, user])

  useEffect(() => {
    if (!download) return
    const delay = download.receipt.signedUrlExpiresAt - Date.now()
    if (delay <= 0) { setDownload(null); return }
    const timer = setTimeout(() => setDownload(current => current === download ? null : current), Math.min(delay, 2147483647))
    return () => clearTimeout(timer)
  }, [download])

  async function operate(title: string, action: (current: CanonicalAccountPrivacySession) => Promise<Result>) {
    const current = session.current
    if (!mounted.current || !current?.isCurrent() || pending.current) return
    const operation = {}
    pending.current = operation
    const active = () => mounted.current && session.current === current && current.isCurrent() && pending.current === operation
    setBusy(true); setNotice(title + ' requested; waiting for canonical Firebase response.')
    try {
      const data = await action(current)
      if (!active()) return
      setResult(JSON.stringify(data, null, 2))
      setNotice(title + ': response received. Request status is not final processing approval.')
    } catch (error) {
      if (!active()) return
      setNotice(title + ' failed; no completion is claimed.')
      setResult(error instanceof Error ? error.message : 'Unknown failure')
    } finally {
      if (pending.current === operation) { pending.current = null; if (mounted.current && session.current === current && current.isCurrent()) setBusy(false) }
    }
  }

  async function requestExport(current: CanonicalAccountPrivacySession): Promise<Result> {
    const value = await current.requestExport()
    if (mounted.current && session.current === current && current.isCurrent()) setExportRequest(value)
    return value
  }
  async function requestDeletion(current: CanonicalAccountPrivacySession): Promise<Result> {
    const value = await current.requestDeletion(reason, confirmation)
    if (mounted.current && session.current === current && current.isCurrent()) { setDeletionRequest(value); setConfirmation('') }
    return value
  }
  async function requestDownload(current: CanonicalAccountPrivacySession): Promise<Result> {
    if (!exportRequest) throw new Error('CANONICAL_EXPORT_NOT_READY')
    const value = await current.getDownload(exportRequest)
    if (mounted.current && session.current === current && current.isCurrent()) setDownload({ receipt: value, issuingSession: current })
    // Do not copy the bearer URL into raw result/status text.
    return { jobId: value.jobId, requestId: value.requestId, signedUrlExpiresAt: value.signedUrlExpiresAt }
  }
  async function register() {
    if (!enabled || busy || user || !authorized()) return
    setBusy(true)
    try {
      await createUserWithEmailAndPassword(getUrAiAuth(), 'r1513-' + crypto.randomUUID() + '@example.test', crypto.randomUUID() + 'Aa1!')
      if (mounted.current && authorized()) setNotice('Created a disposable local Auth emulator identity; this is not a hosted Firebase account.')
    } catch {
      if (mounted.current) setNotice('Local account creation rejected.')
    } finally { if (mounted.current) setBusy(false) }
  }

  const currentOwner = Boolean(enabled && user && session.current?.isCurrent())
  const visibleExport = currentOwner && exportState?.serverConfirmed ? exportState : null
  const visibleDeletion = currentOwner && deletionState?.serverConfirmed ? deletionState : null
  const downloadable = Boolean(visibleExport?.downloadEligible && visibleExport.packageExpiresAt && visibleExport.packageExpiresAt > Date.now())
  const visibleDownload = currentOwner && downloadable && canonicalDownloadIsCurrent(download, session.current) ? download : null

  return <main style={{ maxWidth: 720, margin: '3rem auto', padding: 24, fontFamily: 'system-ui' }} data-route-owner="canonical-privacy-lab" data-lab-enabled={String(enabled)}>
    <h1>UrAi canonical Privacy acceptance lab</h1>
    <p><strong>REVIEW ONLY · DISPOSABLE LOCAL EMULATORS · NO PRODUCTION ACCESS</strong></p>
    <p>This screen tests the actual Privacy Functions contract and does not connect the consumer&apos;s existing scoped controls or grant launch approval.</p>
    {!enabled ? <section role="status"><strong>Unavailable — fail closed.</strong><p>Requires localhost, an exact disposable Firebase project, Firebase public config, and an explicit local lab flag. No remote call is permitted.</p></section> : <>
      <section><h2>Disposable authentication</h2>
        <p>{currentOwner ? 'Signed into local Auth emulator.' : 'No local test identity signed in.'}</p>
        <button type="button" disabled={busy || Boolean(user)} onClick={() => void register()}>Create disposable local test account</button>{' '}
        <button type="button" disabled={busy || !user} onClick={() => { if (authorized()) void signOut(getUrAiAuth()) }}>Sign out</button>
      </section>
      <section><h2>Canonical consent</h2>
        <label>Approved registry purpose <select disabled={!currentOwner || busy} value={purpose} onChange={e => setPurpose(e.target.value as CanonicalPurpose)}>{purposes.map(p => <option key={p} value={p}>{p}</option>)}</select></label>{' '}
        <label>Status <select disabled={!currentOwner || busy} value={status} onChange={e => setStatus(e.target.value as CanonicalConsentStatus)}><option value="denied">denied</option><option value="granted">granted</option><option value="revoked">revoked</option></select></label>
        <p><button type="button" disabled={!currentOwner || busy} onClick={() => void operate('Canonical consent change', current => current.setConsent(purpose, status))}>Submit canonical consent</button>{' '}
          <button type="button" disabled={!currentOwner || busy} onClick={() => void operate('Current consent decision', current => current.evaluateConsent(purpose))}>Re-evaluate decision</button></p>
      </section>
      <section aria-label="Canonical account export status"><h2>Export request — entire account</h2>
        <p>The canonical provider does not support selected-data scopes. This requests an <strong>account-wide</strong> export job; a pending request is not a downloadable file.</p>
        <button type="button" disabled={!currentOwner || busy} onClick={() => void operate('Account-wide export request', requestExport)}>Request account-wide export</button>{' '}
        <button type="button" disabled={!currentOwner || busy || !downloadable} onClick={() => void operate('Owner download eligibility check', requestDownload)}>Check completed export availability</button>
        <p role="status" data-canonical-export-status={visibleExport?.status ?? 'unverified'}>Export request status: <strong>{visibleExport?.status ?? (exportRequest ? 'Awaiting server status' : 'No request selected')}</strong>.</p>
        <p>{downloadable ? 'The server reports a completed package. Download access still requires its current owner check.' : 'No completed downloadable package has been verified.'}</p>
        {visibleDownload && <a href={visibleDownload.receipt.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={event => {
          if (!canonicalDownloadIsCurrent(visibleDownload, session.current)) { event.preventDefault(); setDownload(null) }
        }}>Download completed account export</a>}
      </section>
      <section aria-label="Canonical account deletion request status"><h2>Account deletion request only</h2>
        <p>This submits a <strong>pending full account deletion request</strong>. There is no partial-memory scope, and no destructive job executes from this screen.</p>
        <label>Reason <input value={reason} maxLength={1000} disabled={!currentOwner || busy} onChange={e => setReason(e.target.value)} /></label>
        <p><label>Type REQUEST ACCOUNT DELETION <input value={confirmation} disabled={!currentOwner || busy} onChange={e => setConfirmation(e.target.value)} /></label></p>
        <button type="button" disabled={!currentOwner || busy || confirmation !== 'REQUEST ACCOUNT DELETION' || reason.trim().length < 8} onClick={() => void operate('Pending account deletion request', requestDeletion)}>Submit pending account deletion request</button>
        <p role="status" data-canonical-deletion-status={visibleDeletion?.status ?? 'unverified'}>Deletion request status: <strong>{visibleDeletion?.status ?? (deletionRequest ? 'Awaiting server status' : 'No request selected')}</strong>.</p>
        <p>Request status is not independent proof of completed deletion. No completed deletion is certified by this screen.</p>
      </section>
    </>}
    <p role="status" aria-live="polite">{currentOwner ? notice : enabled ? 'Sign into disposable Auth first.' : notice}</p>
    <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} aria-label="Canonical callable response">{currentOwner ? result : 'No local authority verified.'}</pre>
  </main>
}
