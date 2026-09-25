'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import {
  applyReplayOperation,
  executeReplayOperation,
  flushReplayOperationQueue,
  readReplayOperationState,
  writeReplayOperationState,
  type ReplayCorrection,
  type ReplayOperation,
  type ReplayOperationState,
} from '@/spatial/replay/replayOperations'
import {
  createAuthenticatedReplayTransport,
  readAuthenticatedReplayServerState,
  type ReplayServerState,
} from '@/spatial/replay/replayServerTransport'

const emptyState = (): ReplayOperationState => ({ saved: false, hidden: false, pending: [], audit: [] })
const draftKey = (ownerId: string, memoryId: string) => `urai-replay-correction-draft-v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(memoryId)}`

function safeReadDraft(ownerId: string, memoryId: string) {
  try { return window.localStorage.getItem(draftKey(ownerId, memoryId)) ?? '' } catch { return '' }
}

function safeWriteDraft(ownerId: string, memoryId: string, value: string) {
  try {
    if (value) window.localStorage.setItem(draftKey(ownerId, memoryId), value)
    else window.localStorage.removeItem(draftKey(ownerId, memoryId))
  } catch { /* Persistence failure is surfaced by the operation state, not by draft typing. */ }
}

function mergeState(local: ReplayOperationState, server: ReplayServerState): ReplayOperationState {
  const serverIds = new Set(server.audit.map((entry) => entry.id))
  const base: ReplayOperationState = {
    saved: server.saved,
    hidden: server.hidden,
    correction: server.correction,
    pending: [],
    audit: [...server.audit, ...local.audit.filter((entry) => !serverIds.has(entry.id))].slice(-100),
    error: local.error,
  }
  return local.pending.reduce((state, operation) => applyReplayOperation(state, operation), base)
}

function operationLabel(operation: ReplayOperation, pending: boolean) {
  const action = operation.kind === 'save'
    ? 'Saved Replay'
    : operation.kind === 'hide'
      ? operation.hidden === false ? 'Restored Replay' : 'Hid Replay'
      : 'Corrected interpretation'
  return `${action} - ${pending ? 'Pending' : 'Complete'}`
}

export function ReplayProductControls({ memory }: { memory: SelectedMemory }) {
  const [operations, setOperations] = useState<ReplayOperationState>(emptyState)
  const [correcting, setCorrecting] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [online, setOnline] = useState(true)
  const [status, setStatus] = useState(memory.demo ? 'Demo Replay controls are read-only.' : 'Replay controls ready.')
  const mutable = !memory.demo && memory.authorization === 'owner'
  const identity = `${memory.ownerId}:${memory.id}`
  const activeIdentity = useRef(identity)
  const operationVersion = useRef(0)
  activeIdentity.current = identity
  const transport = useMemo(() => createAuthenticatedReplayTransport(), [])

  useEffect(() => {
    let cancelled = false
    if (!mutable) {
      setOperations(emptyState())
      setStatus(memory.demo ? 'Demo Replay controls are read-only.' : 'Sign in as the owner to change this Replay.')
      return () => { cancelled = true }
    }

    const local = readReplayOperationState(window.localStorage, memory.ownerId, memory.id)
    setOperations(local)
    setStatus(local.pending.length ? `${local.pending.length} change${local.pending.length === 1 ? '' : 's'} waiting to sync.` : 'Replay controls ready.')

    const requestedVersion = operationVersion.current
    readAuthenticatedReplayServerState(memory.ownerId, memory.id)
      .then((server) => {
        if (cancelled || activeIdentity.current !== identity || operationVersion.current !== requestedVersion) return
        const current = readReplayOperationState(window.localStorage, memory.ownerId, memory.id)
        const merged = mergeState(current, server)
        writeReplayOperationState(window.localStorage, memory.ownerId, memory.id, merged)
        setOperations(merged)
        setStatus(merged.pending.length ? `${merged.pending.length} change${merged.pending.length === 1 ? '' : 's'} waiting to sync.` : 'Replay changes are synchronized.')
      })
      .catch((error) => {
        if (cancelled || activeIdentity.current !== identity || operationVersion.current !== requestedVersion) return
        setStatus(error instanceof Error ? error.message : 'Replay history could not be loaded.')
      })

    return () => { cancelled = true }
  }, [identity, memory.demo, memory.id, memory.ownerId, mutable])

  const retryPending = useCallback(async () => {
    if (!mutable) return
    operationVersion.current += 1
    const requestedIdentity = identity
    setStatus('Retrying pending Replay changes...')
    const next = await flushReplayOperationQueue({
      storage: window.localStorage,
      transport,
      ownerId: memory.ownerId,
      memoryId: memory.id,
    })
    if (activeIdentity.current !== requestedIdentity) return
    setOperations(next)
    setStatus(next.pending.length ? `${next.pending.length} change${next.pending.length === 1 ? '' : 's'} still needs attention.` : 'All Replay changes are synchronized.')
  }, [identity, memory.id, memory.ownerId, mutable, transport])

  useEffect(() => {
    if (!mutable) return
    let cancelled = false
    const onOnline = () => { setOnline(true); if (!cancelled) void retryPending() }
    const onOffline = () => setOnline(false)
    setOnline(navigator.onLine)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => { cancelled = true; window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  }, [mutable, retryPending])

  const submit = useCallback(async (kind: ReplayOperation['kind'], options: { correction?: ReplayCorrection; hidden?: boolean } = {}) => {
    if (!mutable) {
      setStatus(memory.demo ? 'Demo Replays cannot be changed.' : 'Sign in as the owner to change this Replay.')
      return false
    }

    operationVersion.current += 1
    const requestedIdentity = identity
    const operation: ReplayOperation = {
      id: crypto.randomUUID(),
      memoryId: memory.id,
      manifestId: memory.replayManifest.id,
      ownerId: memory.ownerId,
      kind,
      createdAt: new Date().toISOString(),
      ...(options.correction ? { correction: options.correction } : {}),
      ...(options.hidden === undefined ? {} : { hidden: options.hidden }),
    }

    if (!navigator.onLine) {
      const queued = applyReplayOperation(readReplayOperationState(window.localStorage, memory.ownerId, memory.id), operation)
      writeReplayOperationState(window.localStorage, memory.ownerId, memory.id, queued)
      setOperations(queued)
      setStatus(`${kind === 'hide' && options.hidden === false ? 'restore' : kind} queued offline. It will retry when the connection returns.`)
      return true
    }

    setStatus(`Saving ${kind === 'hide' && options.hidden === false ? 'restore' : kind}...`)
    const applyIfCurrent = (state: ReplayOperationState) => {
      if (activeIdentity.current === requestedIdentity) setOperations(state)
    }
    const next = await executeReplayOperation({
      storage: window.localStorage,
      transport,
      operation,
      onOptimistic: applyIfCurrent,
      onSettled: applyIfCurrent,
    })
    if (activeIdentity.current !== requestedIdentity) return false
    if (next.error) {
      setStatus(`${kind} failed. ${next.error}`)
      return false
    }
    setStatus(`${kind === 'hide' ? options.hidden === false ? 'Replay restored.' : 'Replay hidden.' : kind === 'save' ? 'Replay saved.' : 'Correction saved.'}`)
    return true
  }, [identity, memory.demo, memory.id, memory.ownerId, memory.replayManifest.id, mutable, transport])

  const openCorrection = () => {
    const existing = safeReadDraft(memory.ownerId, memory.id)
    const corrected = operations.correction?.nextValue
    setCorrectionText(existing || (typeof corrected === 'string' ? corrected : memory.summary))
    setCorrecting(true)
  }

  const pendingSave = operations.pending.some((item) => item.kind === 'save')
  const pendingHide = operations.pending.some((item) => item.kind === 'hide')
  const pendingCorrection = operations.pending.some((item) => item.kind === 'correct')

  return <>
    <section className="replayProduct" aria-label="Replay memory controls" data-replay-saved={operations.saved ? 'true' : 'false'} data-replay-hidden={operations.hidden ? 'true' : 'false'} data-pending-operations={operations.pending.length}>
      <details className="replayActions">
        <summary>Memory actions</summary>
        <div className="replayActionPanel">
          <button type="button" disabled={!mutable || operations.saved || pendingSave} aria-pressed={operations.saved} onClick={() => void submit('save')}>{pendingSave ? 'Saving...' : operations.saved ? 'Saved' : 'Save'}</button>
          <button type="button" disabled={!mutable || pendingHide} aria-pressed={operations.hidden} onClick={() => void submit('hide', { hidden: !operations.hidden })}>{pendingHide ? 'Updating...' : operations.hidden ? 'Unhide' : 'Hide'}</button>
          <button type="button" disabled={!mutable || pendingCorrection} aria-expanded={correcting} onClick={openCorrection}>{pendingCorrection ? 'Correcting...' : 'Correct'}</button>
          <details className="replayHistory"><summary>History</summary>{operations.audit.length ? <ol>{operations.audit.slice().reverse().map((item) => <li key={item.id}><span>{operationLabel(item, operations.pending.some((pending) => pending.id === item.id))}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>{item.kind === 'correct' && item.correction ? <small>Original: {String(item.correction.previousValue ?? '')}<br />Corrected: {String(item.correction.nextValue ?? '')}</small> : null}</li>)}</ol> : <p>No Replay changes yet.</p>}</details>
          {operations.pending.length || operations.error ? <button className="retry" type="button" disabled={!mutable || !online} onClick={() => void retryPending()}>Retry</button> : null}
        </div>
      </details>
    </section>
    <p className="replayOperationStatus" role="status" aria-live="polite">{status}</p>
    {correcting ? <section className="replayCorrection" role="dialog" aria-modal="true" aria-labelledby="replay-correction-title" onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); setCorrecting(false) } }}>
      <h2 id="replay-correction-title">Correct the interpretation</h2>
      <p>The original memory remains unchanged. Your correction updates only URAI's interpretation.</p>
      <label htmlFor="replay-correction-summary">Corrected summary</label>
      <textarea id="replay-correction-summary" autoFocus value={correctionText} maxLength={1000} onChange={(event) => { const value = event.currentTarget.value; setCorrectionText(value); safeWriteDraft(memory.ownerId, memory.id, value) }} />
      <small>{correctionText.length}/1000</small>
      <div><button type="button" onClick={() => setCorrecting(false)}>Keep draft and close</button><button type="button" disabled={correctionText.trim().length < 3 || pendingCorrection} onClick={async () => {
        const saved = await submit('correct', { correction: { field: 'summary', previousValue: memory.summary, nextValue: correctionText.trim(), reason: 'owner correction' } })
        if (saved) { safeWriteDraft(memory.ownerId, memory.id, ''); setCorrecting(false) }
      }}>Save correction</button></div>
    </section> : null}
    <style>{productCss}</style>
  </>
}

const productCss = `.replayProduct{position:absolute;z-index:9;right:max(16px,env(safe-area-inset-right));bottom:max(86px,calc(env(safe-area-inset-bottom) + 78px));max-width:min(460px,calc(100vw - 32px));color:#fff}.replayActions{position:relative}.replayActions>summary{display:flex;align-items:center;justify-content:center;min-height:44px;padding:0 14px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(2,7,12,.5);backdrop-filter:blur(10px);cursor:pointer;font-size:11px;font-weight:850;letter-spacing:.02em;list-style:none}.replayActions>summary::-webkit-details-marker{display:none}.replayActions[open]>summary{background:rgba(2,7,12,.88)}.replayActionPanel{position:absolute;right:0;bottom:52px;display:grid;grid-template-columns:repeat(3,minmax(88px,1fr));gap:6px;width:min(410px,calc(100vw - 32px));padding:8px;border:1px solid rgba(255,255,255,.18);border-radius:18px;background:rgba(2,7,14,.94);box-shadow:0 18px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px)}.replayActionPanel>button{min-height:44px;padding:0 12px;border:1px solid rgba(255,255,255,.2);border-radius:999px;background:linear-gradient(145deg,#102735,#07131e);color:#fff;font-weight:850}.replayActionPanel>button[aria-pressed=true]{border-color:var(--replay-light);box-shadow:0 0 18px color-mix(in srgb,var(--replay-accent) 28%,transparent)}.replayActionPanel button:disabled{opacity:.48}.replayHistory{position:relative;grid-column:1/-1}.replayHistory summary{display:flex;align-items:center;min-height:44px;padding:0 12px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:800}.replayHistory ol,.replayHistory>p{box-sizing:border-box;max-height:230px;overflow:auto;margin:0;padding:12px 12px 12px 30px;border-top:1px solid rgba(255,255,255,.12);background:rgba(6,16,26,.72)}.replayHistory>p{padding:12px}.replayHistory li{margin:0 0 12px}.replayHistory span,.replayHistory time,.replayHistory small{display:block}.replayHistory time,.replayHistory small{margin-top:3px;color:rgba(255,255,255,.7);font-size:11px}.replayOperationStatus{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));bottom:max(138px,calc(env(safe-area-inset-bottom) + 130px));max-width:min(360px,calc(100vw - 32px));margin:0;padding:5px 10px;border-radius:999px;background:rgba(2,7,14,.58);color:rgba(255,255,255,.8);font-size:11px;text-align:right;opacity:.78}.replayCorrection{position:absolute;z-index:30;left:50%;top:50%;transform:translate(-50%,-50%);box-sizing:border-box;width:min(540px,calc(100vw - 28px));max-height:calc(100svh - 28px);overflow:auto;padding:22px;border:1px solid rgba(255,255,255,.35);border-radius:24px;background:#030912fa;box-shadow:0 30px 120px #000}.replayCorrection h2{margin:0 0 8px}.replayCorrection p{color:#c8d7e6;line-height:1.45}.replayCorrection label{display:block;margin:16px 0 7px;font-weight:800}.replayCorrection textarea{box-sizing:border-box;width:100%;min-height:150px;padding:13px;border:1px solid rgba(255,255,255,.32);border-radius:14px;background:#07101b;color:#fff;resize:vertical}.replayCorrection>small{display:block;margin-top:5px;color:#a9bed1;text-align:right}.replayCorrection div{display:flex;justify-content:flex-end;gap:8px;margin-top:15px}.replayCorrection button{min-height:44px;padding:0 15px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:#0b1d2b;color:#fff;font-weight:800}.replayProduct :is(button,summary):focus-visible,.replayCorrection :is(button,textarea):focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.replayProduct{right:12px;bottom:max(66px,calc(env(safe-area-inset-bottom) + 58px))}.replayActionPanel{grid-template-columns:1fr 1fr;width:min(330px,calc(100vw - 24px))}.replayHistory{grid-column:1/-1}.replayActionPanel .retry{grid-column:1/-1}.replayOperationStatus{right:12px;bottom:max(118px,calc(env(safe-area-inset-bottom) + 110px));max-width:calc(100vw - 24px)}.replayCorrection{padding:18px}.replayCorrection div{flex-direction:column-reverse}.replayCorrection button{width:100%}}@media(prefers-reduced-motion:reduce){.replayActions>summary,.replayCorrection{scroll-behavior:auto;backdrop-filter:none}}@media(forced-colors:active){.replayActions>summary,.replayActionPanel,.replayCorrection{border:2px solid CanvasText}}`
