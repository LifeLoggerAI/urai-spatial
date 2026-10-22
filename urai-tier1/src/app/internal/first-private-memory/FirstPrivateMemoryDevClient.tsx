'use client'
import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getUraiAuth, uraiJourneyEmulatorEnabled } from '@/lib/firebase/client'
import { FirstPrivateMemoryUploadIncomplete, importFirstPreparedMemory, resumeFirstPreparedMemoryUpload } from '@/lib/privacy/importFirstPreparedMemory'
import FirstPrivateMemoryActivationPanel from './FirstPrivateMemoryActivationPanel'

const MAX_PACKET_BYTES = 16 * 1024
const MAX_MEDIA_BYTES = 4 * 1024 * 1024
type Receipt = Awaited<ReturnType<typeof importFirstPreparedMemory>>

export default function FirstPrivateMemoryDevClient() {
  const [signedIn, setSignedIn] = useState(false)
  const [packetFile, setPacketFile] = useState<File | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [approved, setApproved] = useState(false)
  const [recoveryMemoryId, setRecoveryMemoryId] = useState<string | null>(null)
  const [recoveryApproved, setRecoveryApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Select fictional handoff JSON and a matching fictional audio derivative.')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const [derivativeSha256, setDerivativeSha256] = useState<string | null>(null)
  const epoch = useRef(0)
  const inFlight = useRef<AbortController | null>(null)
  const invalidate = () => {
    epoch.current++
    inFlight.current?.abort()
    inFlight.current = null
    setApproved(false); setRecoveryMemoryId(null); setRecoveryApproved(false)
    setReceipt(null); setDerivativeSha256(null); setBusy(false)
  }
  useEffect(() => {
    if (!uraiJourneyEmulatorEnabled) return
    const unsub = onAuthStateChanged(getUraiAuth(), user => {
      epoch.current++; inFlight.current?.abort(); inFlight.current = null
      setSignedIn(Boolean(user)); setPacketFile(null); setMediaFile(null)
      setApproved(false); setRecoveryMemoryId(null); setRecoveryApproved(false)
      setBusy(false); setReceipt(null); setDerivativeSha256(null)
      setMessage(user ? 'Fictional local owner session ready.' : 'Sign in to the fictional local Firebase emulator.')
    })
    return () => { epoch.current++; inFlight.current?.abort(); inFlight.current = null; unsub() }
  }, [])
  async function submit(mode: 'create' | 'recover' = 'create') {
    // Recovery requires its OWN affirmative owner decision. An incomplete
    // upload never authorizes recreation of an existing hidden memory.
    if (!uraiJourneyEmulatorEnabled || !signedIn || !packetFile || !mediaFile || busy || inFlight.current
      || (mode === 'create' && (!approved || recoveryMemoryId))
      || (mode === 'recover' && (!recoveryMemoryId || !recoveryApproved))) return
    const controller = new AbortController(), generation = epoch.current
    inFlight.current = controller
    const current = () => epoch.current === generation && inFlight.current === controller && !controller.signal.aborted
    setBusy(true); setReceipt(null)
    setMessage(mode === 'recover'
      ? 'Verifying current owner, stored hidden memory and synthetic source before protected upload recovery…'
      : 'Verifying owner authentication and synthetic source integrity…')
    try {
      if (!packetFile.size || packetFile.size > MAX_PACKET_BYTES) throw Error('FIRST_MEMORY_PACKET_SIZE_INVALID')
      if (!mediaFile.size || mediaFile.size > MAX_MEDIA_BYTES) throw Error('FIRST_MEMORY_MEDIA_SIZE_INVALID')
      const packet: unknown = JSON.parse(await packetFile.text())
      if (!current()) return
      const result = mode === 'recover'
        ? await resumeFirstPreparedMemoryUpload(packet, mediaFile, true,
          { signal: controller.signal, isCurrent: current }, recoveryMemoryId!)
        : await importFirstPreparedMemory(packet, mediaFile, true, { signal: controller.signal, isCurrent: current })
      if (!current()) return
      setReceipt(result)
      setRecoveryMemoryId(null); setRecoveryApproved(false)
      const prepared = packet as { upload?: { sha256?: unknown } }
      setDerivativeSha256(typeof prepared.upload?.sha256 === 'string' ? prepared.upload.sha256 : null)
      setMessage('Protected synthetic upload receipt received. Memory remains hidden pending explicit visibility authorization.')
    } catch (error) {
      if (!current()) return
      if (error instanceof FirstPrivateMemoryUploadIncomplete) {
        // Never expose a create button for this known committed identity.
        setRecoveryMemoryId(error.memoryId); setRecoveryApproved(false); setApproved(false)
        setMessage('Hidden memory ' + error.memoryId + ' has an incomplete protected upload. It remains hidden. You may explicitly request a current-owner recovery; closing, aborted, revoked or stale receipts still require server-governed reconciliation.')
      } else if (mode === 'recover') {
        setRecoveryApproved(false)
        setMessage('Recovery denied or unavailable: ' + (error instanceof Error ? error.message : 'UNKNOWN')
          + '. The memory remains hidden. Do not recreate the same identity.')
      } else {
        setMessage('Import not confirmed: ' + (error instanceof Error ? error.message : 'UNKNOWN'))
      }
    } finally { if (current()) { setBusy(false); inFlight.current = null } }
  }
  if (!uraiJourneyEmulatorEnabled) return <main><h1>Local emulator required</h1></main>
  return <main style={{ minHeight: '100svh', padding: 'clamp(24px,5vw,64px)', background: '#06131b', color: '#f3fbff', fontFamily: 'system-ui,sans-serif' }}>
    <div style={{ maxWidth: 740, margin: '0 auto' }}>
      <p style={{ color: '#a9e7ee', letterSpacing: '.12em' }}>LOCAL EMULATOR · SYNTHETIC ONLY · NO PRODUCTION</p>
      <h1>First private memory import</h1>
      <p>This development-only interface accepts fictional files. A local packet is not consent, and this screen does not authorize public visibility or certify Replay.</p>
      <p role="status">{signedIn ? 'Fictional owner authenticated.' : 'Fictional owner authentication required.'}</p>
      <form onSubmit={event => { event.preventDefault(); void submit('create') }} style={{ display: 'grid', gap: 18 }}>
        <label>Private handoff JSON
          <input style={{ display: 'block', minHeight: 48 }} type="file" accept=".json,application/json" disabled={!signedIn || busy}
            onChange={event => { invalidate(); setPacketFile(event.currentTarget.files?.[0] ?? null) }} />
        </label>
        <label>Matching fictional audio derivative
          <input style={{ display: 'block', minHeight: 48 }} type="file" accept=".ogg,.mp3,audio/ogg,audio/mpeg" disabled={!signedIn || busy}
            onChange={event => { invalidate(); setMediaFile(event.currentTarget.files?.[0] ?? null) }} />
        </label>
        <label style={{ display: 'flex', gap: 12 }}>
          <input type="checkbox" checked={approved} disabled={!signedIn || busy || Boolean(recoveryMemoryId)}
            onChange={event => { setApproved(event.currentTarget.checked); setReceipt(null) }} />
          I explicitly confirm creating this one fictional owner-bound memory as hidden, subject to current server C1 consent and deletion barriers.
        </label>
        <button type="submit" disabled={!signedIn || !packetFile || !mediaFile || !approved || busy || Boolean(recoveryMemoryId)}
          style={{ minHeight: 48, padding: 12, color: '#06131b', background: '#ccf3f9', borderRadius: 12, fontWeight: 700 }}>
          {busy ? 'Verifying…' : 'Verify and import hidden synthetic memory'}
        </button>
      </form>
      {recoveryMemoryId && signedIn ? <section aria-label="Recover hidden synthetic memory upload"
        style={{ marginTop: 22, padding: 20, border: '1px solid #8aaab3', borderRadius: 12 }}>
        <h2>Recover existing hidden memory</h2>
        <p>Memory ID: <code>{recoveryMemoryId}</code>. The original memory will not be created again.
          Select the same source files and confirm this separate upload attempt. Current consent,
          receipt state, owner authentication and deletion barriers are checked again.</p>
        <label style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="checkbox" checked={recoveryApproved} disabled={busy}
            onChange={event => setRecoveryApproved(event.currentTarget.checked)} />
          I explicitly authorize attempting protected media recovery for this existing hidden fictional memory.
          I understand that stale, aborted or revoked receipts may require server-side reconciliation.
        </label>
        <button type="button" onClick={() => void submit('recover')}
          disabled={!recoveryApproved || busy || !packetFile || !mediaFile}
          style={{ minHeight: 48, marginTop: 14 }}>
          {busy ? 'Verifying recovery…' : 'Recover protected upload without recreating memory'}
        </button>
      </section> : null}
      <p role="status" aria-live="polite">{message}</p>
      {receipt && derivativeSha256 ? <FirstPrivateMemoryActivationPanel receipt={receipt} derivativeSha256={derivativeSha256} /> : null}
      {receipt ? <section aria-label="Synthetic memory receipt">
        <h2>Hidden import registered</h2>
        <p>Not yet proof of browser playback. Focus remains subject to explicit owner visibility consent.</p>
        <a style={{ color: '#9eeefa' }} href="/privacy-controls">Focus requires the separate owner confirmation above</a>
      </section> : null}
      <p><a style={{ color: '#9eeefa' }} href="/privacy-controls">Privacy controls</a></p>
    </div>
  </main>
}
