'use client'
import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { getUraiAuth, uraiJourneyEmulatorEnabled } from '@/lib/firebase/client'
import { FirstPrivateMemoryUploadIncomplete, importFirstPreparedMemory } from '@/lib/privacy/importFirstPreparedMemory'
import FirstPrivateMemoryActivationPanel from './FirstPrivateMemoryActivationPanel'

const MAX_PACKET_BYTES = 16 * 1024
const MAX_MEDIA_BYTES = 4 * 1024 * 1024
type Receipt = Awaited<ReturnType<typeof importFirstPreparedMemory>>

export default function FirstPrivateMemoryDevClient() {
  const [signedIn, setSignedIn] = useState(false)
  const [packetFile, setPacketFile] = useState<File | null>(null)
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Select fictional handoff JSON and a matching fictional audio derivative.')
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const epoch = useRef(0)
  const inFlight = useRef<AbortController | null>(null)
  const invalidate = () => {
    epoch.current++
    inFlight.current?.abort()
    inFlight.current = null
    setApproved(false); setReceipt(null); setBusy(false)
  }
  useEffect(() => {
    if (!uraiJourneyEmulatorEnabled) return
    const unsub = onAuthStateChanged(getUraiAuth(), user => {
      epoch.current++; inFlight.current?.abort(); inFlight.current = null
      setSignedIn(Boolean(user)); setPacketFile(null); setMediaFile(null)
      setApproved(false); setBusy(false); setReceipt(null)
      setMessage(user ? 'Fictional local owner session ready.' : 'Sign in to the fictional local Firebase emulator.')
    })
    return () => { epoch.current++; inFlight.current?.abort(); inFlight.current = null; unsub() }
  }, [])
  async function submit() {
    if (!uraiJourneyEmulatorEnabled || !signedIn || !approved || !packetFile || !mediaFile || busy || inFlight.current) return
    const controller = new AbortController(), generation = epoch.current
    inFlight.current = controller
    const current = () => epoch.current === generation && inFlight.current === controller && !controller.signal.aborted
    setBusy(true); setReceipt(null); setMessage('Verifying owner authentication and synthetic source integrity…')
    try {
      if (!packetFile.size || packetFile.size > MAX_PACKET_BYTES) throw Error('FIRST_MEMORY_PACKET_SIZE_INVALID')
      if (!mediaFile.size || mediaFile.size > MAX_MEDIA_BYTES) throw Error('FIRST_MEMORY_MEDIA_SIZE_INVALID')
      const packet: unknown = JSON.parse(await packetFile.text())
      if (!current()) return
      const result = await importFirstPreparedMemory(packet, mediaFile, true, { signal: controller.signal, isCurrent: current })
      if (!current()) return
      setReceipt(result)
      setMessage('Protected synthetic upload receipt received. Memory remains hidden pending explicit visibility authorization.')
    } catch (error) {
      if (!current()) return
      if (error instanceof FirstPrivateMemoryUploadIncomplete) {
        setMessage('Hidden memory created but media upload incomplete. Do not recreate this memory ID; use owner-authorized recovery.')
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
      <form onSubmit={event => { event.preventDefault(); void submit() }} style={{ display: 'grid', gap: 18 }}>
        <label>Private handoff JSON
          <input style={{ display: 'block', minHeight: 48 }} type="file" accept=".json,application/json" disabled={!signedIn || busy}
            onChange={event => { invalidate(); setPacketFile(event.currentTarget.files?.[0] ?? null) }} />
        </label>
        <label>Matching fictional audio derivative
          <input style={{ display: 'block', minHeight: 48 }} type="file" accept=".ogg,.mp3,audio/ogg,audio/mpeg" disabled={!signedIn || busy}
            onChange={event => { invalidate(); setMediaFile(event.currentTarget.files?.[0] ?? null) }} />
        </label>
        <label style={{ display: 'flex', gap: 12 }}>
          <input type="checkbox" checked={approved} disabled={!signedIn || busy}
            onChange={event => { setApproved(event.currentTarget.checked); setReceipt(null) }} />
          I explicitly confirm creating this one fictional owner-bound memory as hidden, subject to current server C1 consent and deletion barriers.
        </label>
        <button type="submit" disabled={!signedIn || !packetFile || !mediaFile || !approved || busy}
          style={{ minHeight: 48, padding: 12, color: '#06131b', background: '#ccf3f9', borderRadius: 12, fontWeight: 700 }}>
          {busy ? 'Verifying…' : 'Verify and import hidden synthetic memory'}
        </button>
      </form>
      <p role="status" aria-live="polite">{message}</p>
      {receipt ? <section aria-label="Synthetic memory receipt">
        <h2>Hidden import registered</h2>
        <p>Not yet proof of browser playback. Focus remains subject to explicit owner visibility consent.</p>
        <a style={{ color: '#9eeefa' }} href={'/focus?memoryId=' + encodeURIComponent(receipt.memoryId) + '&manifestId=' + encodeURIComponent('source-' + receipt.memoryId)}>Attempt consent-authorized Focus</a>
      </section> : null}
      <p><a style={{ color: '#9eeefa' }} href="/privacy-controls">Privacy controls</a></p>
    </div>
  </main>
}
