'use client'

/**
 * R1513 REVIEW / EMULATOR ONLY.
 * Never use against hosted Firebase or real users. Account deletion is REQUEST ONLY.
 * This route is inert unless all three owner-controlled local test conditions match.
 * No production private-memory writes or privileged processing are enabled.
 */
import { useCallback, useEffect, useState } from 'react'
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, onAuthStateChanged, signOut, type User } from 'firebase/auth'
import { connectFunctionsEmulator, httpsCallable, type Functions } from 'firebase/functions'
import { app, firebasePublicEnvReady, functions } from '@/lib/firebase/client'

const DISPOSABLE_PROJECT = 'urai-privacy-r1512-disposable'
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])
const activeFlag = process.env.NEXT_PUBLIC_URAI_CANONICAL_PRIVACY_LAB === 'true'
const configuredProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
const requiredConsentPurposes = ['memory.storage', 'data.export'] as const
type ConsentPurpose = (typeof requiredConsentPurposes)[number]
type ConsentStatus = 'granted' | 'denied' | 'revoked'
type CanonicalResult = { status?: string; consentId?: string; requestId?: string; exportJobId?: string; allowed?: boolean; reason?: string }

function locallyAuthorized() {
  return typeof window !== 'undefined' &&
    LOCAL_HOSTS.has(window.location.hostname) &&
    activeFlag && firebasePublicEnvReady &&
    configuredProject === DISPOSABLE_PROJECT &&
    app.options.projectId === DISPOSABLE_PROJECT
}

let initialized = false
function emulatorServices(): { auth: ReturnType<typeof getAuth>; functions: Functions } {
  if (!locallyAuthorized()) throw new Error('LOCAL_EMULATOR_ONLY')
  const auth = getAuth(app)
  if (!initialized) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFunctionsEmulator(functions, '127.0.0.1', 5001)
    initialized = true
  }
  return { auth, functions }
}

async function canonicalCall(name: 'setCanonicalConsent' | 'evaluateCanonicalConsent' | 'createExportRequest' | 'createDeletionRequest' | 'getExportDownloadUrl', payload: Record<string, unknown> = {}): Promise<CanonicalResult> {
  const { auth, functions: fn } = emulatorServices()
  if (!auth.currentUser) throw new Error('SIGN_IN_REQUIRED')
  return (await httpsCallable<Record<string, unknown>, CanonicalResult>(fn, name, { timeout: 30000 })(payload)).data
}

export default function CanonicalPrivacyLabPage() {
  const [enabled, setEnabled] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [busy, setBusy] = useState(false)
  const [purpose, setPurpose] = useState<ConsentPurpose>('memory.storage')
  const [status, setStatus] = useState<ConsentStatus>('denied')
  const [result, setResult] = useState('No local authority verified.')
  const [lastExport, setLastExport] = useState<string | null>(null)
  const [reason, setReason] = useState('Disposable test account requested deletion')
  const [confirmation, setConfirmation] = useState('')
  const [notice, setNotice] = useState('Local emulator only; no real user data. No action has been executed.')

  useEffect(() => {
    if (!locallyAuthorized()) {
      setEnabled(false)
      return
    }
    let stop = () => {}
    try {
      const services = emulatorServices()
      stop = onAuthStateChanged(services.auth, (next) => {
        setUser(next)
        setEnabled(true)
      }, () => setEnabled(false))
    } catch {
      setEnabled(false)
    }
    return () => stop()
  }, [])

  const operate = useCallback(async (title: string, action: () => Promise<CanonicalResult>) => {
    setBusy(true)
    setNotice(title + ' requested; waiting for canonical Firebase response.')
    try {
      const data = await action()
      setResult(JSON.stringify(data, null, 2))
      setNotice(title + ': response received. Request status is not final processing approval.')
      if (title === 'Account-wide export request' && typeof data.exportJobId === 'string') {
        setLastExport(data.exportJobId)
      }
    } catch (error) {
      setNotice(title + ' failed; no completion is claimed.')
      setResult(error instanceof Error ? error.message : 'Unknown failure')
    } finally {
      setBusy(false)
    }
  }, [])

  const register = async () => {
    if (!enabled || busy || user) return
    setBusy(true)
    try {
      const id = 'r1513-' + crypto.randomUUID()
      await createUserWithEmailAndPassword(emulatorServices().auth, id + '@example.test', crypto.randomUUID() + 'Aa1!')
      setNotice('Created a disposable local Auth emulator identity; this is not a hosted Firebase account.')
    } catch (error) {
      setNotice('Local account creation rejected.')
      setResult(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '3rem auto', padding: 24, fontFamily: 'system-ui' }} data-route-owner="canonical-privacy-lab" data-lab-enabled={String(enabled)}>
      <h1>UrAi canonical Privacy acceptance lab</h1>
      <p><strong>REVIEW ONLY · DISPOSABLE LOCAL EMULATORS · NO PRODUCTION ACCESS</strong></p>
      <p>This screen tests the actual Privacy Functions contract and does not connect the consumer's existing scoped controls or grant launch approval.</p>
      {!enabled ? (
        <section role="status">
          <strong>Unavailable — fail closed.</strong>
          <p>Requires localhost, an exact disposable Firebase project, Firebase public config, and an explicit local lab flag. No remote call is permitted.</p>
        </section>
      ) : (
        <>
          <section>
            <h2>Disposable authentication</h2>
            <p>{user ? 'Signed into local Auth emulator.' : 'No local test identity signed in.'}</p>
            <button type="button" disabled={busy || Boolean(user)} onClick={() => void register()}>Create disposable local test account</button>{' '}
            <button type="button" disabled={busy || !user} onClick={() => void signOut(emulatorServices().auth)}>Sign out</button>
          </section>
          <section>
            <h2>Canonical consent</h2>
            <label>Approved registry purpose <select disabled={!user || busy} value={purpose} onChange={e => setPurpose(e.target.value as ConsentPurpose)}>
              {requiredConsentPurposes.map(p => <option key={p} value={p}>{p}</option>)}
            </select></label>{' '}
            <label>Status <select disabled={!user || busy} value={status} onChange={e => setStatus(e.target.value as ConsentStatus)}>
              <option value="denied">denied</option><option value="granted">granted</option><option value="revoked">revoked</option>
            </select></label>
            <p><button type="button" disabled={!user || busy} onClick={() => void operate('Canonical consent change', () => canonicalCall('setCanonicalConsent', { purpose, status, surface: 'r1513-local-lab' }))}>Submit canonical consent</button>{' '}
            <button type="button" disabled={!user || busy} onClick={() => void operate('Current consent decision', () => canonicalCall('evaluateCanonicalConsent', { purpose, correlationId: crypto.randomUUID() }))}>Re-evaluate decision</button></p>
          </section>
          <section>
            <h2>Export request — entire account</h2>
            <p>The canonical provider does not support the consumer UI's selected-data scopes. This button requests an <strong>account-wide</strong> export job; a pending request is not a downloadable file.</p>
            <button type="button" disabled={!user || busy} onClick={() => void operate('Account-wide export request', () => canonicalCall('createExportRequest'))}>Request account-wide export</button>{' '}
            <button type="button" disabled={!user || busy || !lastExport} onClick={() => void operate('Owner download eligibility check', () => canonicalCall('getExportDownloadUrl', { jobId: lastExport, file: 'export' }))}>Check completed export availability</button>
          </section>
          <section>
            <h2>Account deletion request only</h2>
            <p>There is no partial-memory deletion scope in this canonical endpoint. This submits a <strong>pending full account deletion request</strong>; no destructive job executes from this screen.</p>
            <label>Reason <input value={reason} disabled={!user || busy} onChange={e => setReason(e.target.value)} /></label>
            <p><label>Type REQUEST ACCOUNT DELETION <input value={confirmation} disabled={!user || busy} onChange={e => setConfirmation(e.target.value)} /></label></p>
            <button type="button" disabled={!user || busy || confirmation !== 'REQUEST ACCOUNT DELETION' || reason.trim().length < 8} onClick={() => void operate('Pending account deletion request', () => canonicalCall('createDeletionRequest', { reason: reason.trim() }))}>Submit pending account deletion request</button>
          </section>
        </>
      )}
      <p role="status" aria-live="polite">{notice}</p>
      <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }} aria-label="Canonical callable response">{result}</pre>
    </main>
  )
}
