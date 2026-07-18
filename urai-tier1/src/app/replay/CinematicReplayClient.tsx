'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { applyReplayOperation, executeReplayOperation, flushReplayOperationQueue, readReplayOperationState, writeReplayOperationState, type ReplayCorrection, type ReplayOperation, type ReplayOperationState } from '@/spatial/replay/replayOperations'
import { createAuthenticatedReplayTransport, readAuthenticatedReplayServerState } from '@/spatial/replay/replayServerTransport'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

const emptyState = (): ReplayOperationState => ({ saved: false, hidden: false, pending: [], audit: [] })
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [operations, setOperations] = useState<ReplayOperationState>(emptyState)
  const [correcting, setCorrecting] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [status, setStatus] = useState('Replay controls ready.')
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const mutable = Boolean(memory && !memory.demo && memory.authorization === 'owner')

  useEffect(() => {
    if (!memory || !playing) return
    const timer = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setPlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(timer)
  }, [duration, memory, playing, reducedMotion])

  useEffect(() => {
    let activeRequest = true
    if (!memory || !mutable) {
      setOperations(emptyState())
      return () => { activeRequest = false }
    }
    const local = readReplayOperationState(window.localStorage, memory.ownerId, memory.id)
    setOperations(local)
    readAuthenticatedReplayServerState(memory.ownerId, memory.id).then((server) => {
      if (!activeRequest) return
      const current = readReplayOperationState(window.localStorage, memory.ownerId, memory.id)
      const merged = { saved: server.saved || current.saved, hidden: server.hidden || current.hidden, correction: server.correction ?? current.correction, pending: current.pending, audit: [...server.audit, ...current.audit.filter((item) => !server.audit.some((entry) => entry.id === item.id))].slice(-100) }
      writeReplayOperationState(window.localStorage, memory.ownerId, memory.id, merged)
      setOperations(merged)
    }).catch(() => undefined)
    return () => { activeRequest = false }
  }, [memory, mutable])

  useEffect(() => {
    if (!memory || !mutable) return
    let activeRequest = true
    const retry = async () => {
      if (activeRequest) setStatus('Connection restored. Retrying pending changes…')
      try {
        const next = await flushReplayOperationQueue({ storage: window.localStorage, transport: createAuthenticatedReplayTransport(), ownerId: memory.ownerId, memoryId: memory.id })
        if (!activeRequest) return
        setOperations(next)
        setStatus(next.pending.length ? 'Some changes still need attention.' : 'All Replay changes are saved.')
      } catch {
        if (activeRequest) setStatus('Replay changes are still queued. Retry when the connection is stable.')
      }
    }
    window.addEventListener('online', retry)
    if (navigator.onLine) void retry()
    return () => {
      activeRequest = false
      window.removeEventListener('online', retry)
    }
  }, [memory, mutable])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null
      if (target?.closest('button,input,textarea,summary,[contenteditable="true"]')) return
      if (event.key === 'Escape') { event.preventDefault(); unwind() }
      if ((event.key === ' ' || event.key === 'Enter') && memory) { event.preventDefault(); setPlaying((value) => !value) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, unwind])

  const submit = useCallback(async (kind: ReplayOperation['kind'], correction?: ReplayCorrection) => {
    if (!memory || !mutable) { setStatus(memory?.demo ? 'Demo Replays cannot be changed.' : 'Sign in as the owner to change this Replay.'); return }
    const operation = { id: crypto.randomUUID(), memoryId: memory.id, manifestId: memory.replayManifest.id, ownerId: memory.ownerId, kind, createdAt: new Date().toISOString(), correction }
    if (!navigator.onLine) {
      const queued = applyReplayOperation(readReplayOperationState(window.localStorage, memory.ownerId, memory.id), operation)
      writeReplayOperationState(window.localStorage, memory.ownerId, memory.id, queued)
      setOperations(queued)
      setStatus(`${kind} queued offline. It will retry when the connection returns.`)
      return
    }
    const next = await executeReplayOperation({ storage: window.localStorage, transport: createAuthenticatedReplayTransport(), operation, onOptimistic: setOperations, onSettled: setOperations })
    setStatus(next.error ? `${kind} failed. ${next.error}` : `${kind} saved.`)
  }, [memory, mutable])

  if (!memory) return <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src}><section role={result.status === 'loading' ? 'status' : 'alert'}><p>{result.status === 'loading' ? 'Opening Replay' : 'Replay unavailable'}</p><h1>{result.message}</h1><button type="button" onClick={unwind}>Return to Focus</button></section><style>{stateCss}</style></main>

  const percent = Math.round((progressMs / duration) * 100)
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image')
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
    '--replay-sky': memory.visuals.sky,
    '--replay-ground': memory.visuals.ground,
    '--replay-media': media ? `url("${media.url.replaceAll('"', '%22')}")` : 'none',
    '--replay-asset': assetCssStack(replayAssets.primary),
    '--replay-progress': `${percent}%`,
  } as React.CSSProperties

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-replay-saved={operations.saved ? 'true' : 'false'} data-replay-hidden={operations.hidden ? 'true' : 'false'} data-pending-operations={operations.pending.length} data-canonical-asset={replayAssets.primary.src}>
    <div className="replayBackdrop" aria-hidden="true" />
    <div className="replayPortal" aria-hidden="true"><span /></div>
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span></header>
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="playback" aria-label="Replay playback controls"><button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button><input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Replay timeline, ${percent} percent complete`} /><output>{percent}%</output></section>
    <section className="product" aria-label="Replay memory controls"><button type="button" disabled={!mutable || operations.pending.some((item) => item.kind === 'save')} aria-pressed={operations.saved} onClick={() => submit('save')}>{operations.saved ? 'Saved' : 'Save'}</button><button type="button" disabled={!mutable || operations.pending.some((item) => item.kind === 'hide')} aria-pressed={operations.hidden} onClick={() => submit('hide')}>{operations.hidden ? 'Hidden' : 'Hide'}</button><button type="button" disabled={!mutable} aria-expanded={correcting} onClick={() => { setCorrectionText(String(operations.correction?.nextValue ?? memory.summary ?? '')); setCorrecting(true) }}>Correct</button><details><summary>History</summary><ol>{operations.audit.slice().reverse().map((item) => <li key={item.id}>{item.kind} · {operations.pending.some((pending) => pending.id === item.id) ? 'Pending' : 'Saved'}</li>)}</ol></details></section>
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    {correcting && <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="correction-title"><h2 id="correction-title">Correct the interpretation</h2><p>The original memory is preserved. This changes only URAI’s summary.</p><textarea aria-label="Corrected summary" value={correctionText} maxLength={1000} onChange={(event) => setCorrectionText(event.currentTarget.value)} /><div><button type="button" onClick={() => setCorrecting(false)}>Cancel</button><button type="button" disabled={correctionText.trim().length < 3} onClick={async () => { await submit('correct', { field: 'summary', previousValue: memory.summary ?? '', nextValue: correctionText.trim(), reason: 'owner correction' }); setCorrecting(false) }}>Save correction</button></div></section>}
    <p className="sr" role="status" aria-live="polite">{status}</p>
    <button className="unwind" type="button" onClick={unwind}>← Focus</button>
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background-image:linear-gradient(180deg,rgba(1,4,10,.7),rgba(1,4,10,.95)),${assetCssStack(replayAssets.primary)};background-size:cover;background-position:center;color:#fff}.replayState section{text-align:center;max-width:560px}.replayState button{min-height:44px;margin-top:18px;padding:0 20px;border-radius:999px;border:1px solid #aeefff;background:#dffbff;color:#041019;font-weight:800}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:linear-gradient(180deg,var(--replay-sky),#03040b 58%,var(--replay-ground));isolation:isolate}.replayBackdrop{position:absolute;inset:-6%;background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72)),var(--replay-media),var(--replay-asset),radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--replay-accent) 28%,transparent),transparent 34%);background-size:cover;background-position:center;filter:saturate(.9) contrast(1.08);animation:drift 18s ease-in-out infinite alternate}.replayWorld:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 28%,rgba(0,0,0,.18) 55%,rgba(0,0,0,.86) 100%);pointer-events:none}.replayPortal{position:absolute;z-index:2;left:50%;top:42%;width:min(48vw,520px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid color-mix(in srgb,var(--replay-light) 24%,transparent);box-shadow:0 0 110px color-mix(in srgb,var(--replay-accent) 24%,transparent),inset 0 0 100px rgba(0,0,0,.42);display:grid;place-items:center}.replayPortal span{width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 7%,var(--replay-light) 18%,var(--replay-accent) 46%,transparent 74%);box-shadow:0 0 80px var(--replay-accent);animation:pulse 4.8s ease-in-out infinite}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:36svh;transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 Georgia,serif}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.playback,.product{position:absolute;z-index:7;left:50%;transform:translateX(-50%);width:min(680px,calc(100vw - 28px));display:flex;align-items:center;gap:8px;padding:9px;border:1px solid rgba(255,255,255,.22);border-radius:22px;background:rgba(2,7,14,.82);backdrop-filter:blur(16px)}.playback{bottom:max(84px,calc(env(safe-area-inset-bottom) + 80px))}.product{bottom:max(12px,env(safe-area-inset-bottom))}.playback input{flex:1;min-height:44px}.playback button,.product button,.dialog button,.unwind{min-height:44px;padding:0 14px;border:1px solid rgba(255,255,255,.28);border-radius:999px;background:#0b1d2b;color:#fff;font-weight:800}.playback button{background:linear-gradient(135deg,var(--replay-light),var(--replay-accent));color:#031019}.product>button{flex:1}.product button[aria-pressed=true]{border-color:var(--replay-light);box-shadow:0 0 20px var(--replay-accent)}.product button:disabled{opacity:.45}.product details{position:relative}.product summary{display:grid;place-items:center;min-height:44px;padding:0 8px;cursor:pointer}.product ol{position:absolute;right:0;bottom:52px;width:220px;max-height:220px;overflow:auto;padding:12px 12px 12px 30px;border:1px solid rgba(255,255,255,.22);border-radius:14px;background:#06101a}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.dialog{position:absolute;z-index:20;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100vw - 28px));padding:20px;border:1px solid rgba(255,255,255,.32);border-radius:24px;background:#030912f7;box-shadow:0 28px 100px #000}.dialog textarea{box-sizing:border-box;width:100%;min-height:130px;padding:12px;border:1px solid rgba(255,255,255,.25);border-radius:14px;background:#07101b;color:#fff}.dialog div{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}.unwind{position:absolute;z-index:8;left:max(14px,env(safe-area-inset-left));top:max(76px,calc(env(safe-area-inset-top) + 70px))}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.replayWorld :is(button,summary,textarea,input):focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes drift{to{transform:scale(1.035) translate3d(1%,-1%,0)}}@keyframes pulse{50%{transform:scale(1.12);opacity:.76}}@media(max-width:700px){.replayPortal{width:min(78vw,360px);top:38%}.caption{bottom:43svh;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:none}.playback{bottom:max(76px,calc(env(safe-area-inset-bottom) + 72px));padding:7px}.product{gap:4px;padding:6px}.product>button{padding:0 8px;font-size:11px}.product summary{font-size:11px}.transcript{top:max(16px,env(safe-area-inset-top));right:14px;max-width:150px}.replayWorld header{max-width:230px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:46svh}.replayPortal{width:min(48vh,300px)}}@media(prefers-reduced-motion:reduce){.replayBackdrop,.replayPortal span{animation:none}}@media(forced-colors:active){.playback,.product,.dialog,.unwind,.transcript{border:2px solid CanvasText}}`
