'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { ReplayProductControls } from './ReplayProductControls'
import { ReplaySpatialWorld } from './ReplaySpatialWorld'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [explorationEnabled, setExplorationEnabled] = useState(false)
  const [sensoryReduced, setSensoryReduced] = useState(false)
  const [selectedAnchor, setSelectedAnchor] = useState<{ label: string; detail: string } | null>(null)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])

  useEffect(() => {
    if (!memory || !playing || explorationEnabled) return
    const tick = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setPlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [duration, explorationEnabled, memory, playing, reducedMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') {
        event.preventDefault()
        if (selectedAnchor) { setSelectedAnchor(null); return }
        if (explorationEnabled) { setExplorationEnabled(false); return }
        unwind()
        return
      }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory && !explorationEnabled) {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (!interactive && event.key.toLowerCase() === 'e' && memory) {
        event.preventDefault()
        setPlaying(false)
        setExplorationEnabled((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [explorationEnabled, memory, selectedAnchor, unwind])

  if (!memory) {
    const loading = result.status === 'loading'
    return (
      <main className="replayEntryState" data-testid="cinematic-replay-client" data-memory-status={result.status}>
        <div className="entryDepth" aria-hidden="true"><span /><span /><span /></div>
        <section role={loading ? 'status' : 'alert'}>
          <p>{loading ? 'Opening Replay' : 'Replay needs a memory'}</p>
          <h1>{result.message}</h1>
          <span className="entryExplanation">Replay opens from a selected memory so URAI can preserve its identity, privacy, sources, and return path.</span>
          <div className="entryActions">
            <button type="button" onClick={() => requestUraiWorldTravel({ destination: 'life-map', entryPortal: 'replay-memory-picker', href: '/life-map/' })}>Choose from Life Map</button>
            <button type="button" onClick={() => requestUraiWorldTravel({ destination: 'focus', entryPortal: 'replay-return', href: '/focus/' })}>Return to Focus</button>
          </div>
        </section>
        <style>{entryCss}</style>
      </main>
    )
  }

  const percent = Math.round((progressMs / duration) * 100)
  const sceneReduced = reducedMotion || sensoryReduced

  return (
    <main className="replayWorld" data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-exploration={explorationEnabled ? 'true' : 'false'}>
      <ReplaySpatialWorld
        memory={memory}
        active={active}
        progressMs={progressMs}
        durationMs={duration}
        playing={playing}
        reducedMotion={sceneReduced}
        explorationEnabled={explorationEnabled}
        onSelectAnchor={(label, detail) => setSelectedAnchor({ label, detail })}
      />
      <div className="replayVignette" aria-hidden="true" />

      <header className="replayIdentity">
        <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p>
        <h1>{memory.title}</h1>
        <span>{memory.place?.label ?? 'Private memory space'} · {new Date(memory.occurredAt).toLocaleDateString()}</span>
        <button className="unwind" type="button" onClick={unwind}>← Focus</button>
      </header>

      <section className="replayCaption" aria-live="polite">
        <small>{explorationEnabled ? 'Explore the memory' : active?.label ?? 'Replay'}</small>
        <strong>{explorationEnabled ? 'Move carefully through the reconstructed space.' : active?.caption ?? memory.narrator.replay}</strong>
        <span>{explorationEnabled ? 'WASD or arrow keys move. Drag to look. Press E or Escape to return to guided replay.' : active?.narratorLine ?? memory.narrator.replay}</span>
      </section>

      <section className="replayModeControls" aria-label="Replay mode controls">
        <button type="button" aria-pressed={!explorationEnabled} onClick={() => setExplorationEnabled(false)}>Guided</button>
        <button type="button" aria-pressed={explorationEnabled} onClick={() => { setPlaying(false); setExplorationEnabled(true) }}>Explore</button>
        <button type="button" aria-pressed={sensoryReduced} onClick={() => setSensoryReduced((value) => !value)}>Low sensory</button>
      </section>

      {!explorationEnabled ? <section className="controls" aria-label="Replay controls">
        <button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Replay timeline, ${percent} percent complete`} />
        <output>{percent}%</output>
      </section> : null}

      <ReplayProductControls memory={memory} />

      {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}

      {selectedAnchor ? <section className="anchorPanel" role="dialog" aria-modal="false" aria-labelledby="replay-anchor-title">
        <p>Memory anchor</p>
        <h2 id="replay-anchor-title">{selectedAnchor.label}</h2>
        <span>{selectedAnchor.detail}</span>
        <button type="button" onClick={() => setSelectedAnchor(null)}>Close</button>
      </section> : null}

      <style>{replayCss}</style>
    </main>
  )
}

const entryCss = `.replayEntryState{position:fixed;inset:0;display:grid;place-items:center;overflow:hidden;padding:24px;background:radial-gradient(circle at 50% 45%,#17344a 0,#07111d 34%,#01040a 78%);color:#fff}.entryDepth{position:absolute;inset:0;perspective:900px;opacity:.75}.entryDepth span{position:absolute;left:50%;top:50%;width:min(72vw,920px);aspect-ratio:1.8;border:1px solid rgba(159,234,255,.16);border-radius:50%;transform:translate(-50%,-50%) rotateX(68deg)}.entryDepth span:nth-child(2){width:min(51vw,660px);transform:translate(-50%,-46%) rotateX(68deg)}.entryDepth span:nth-child(3){width:min(31vw,400px);transform:translate(-50%,-42%) rotateX(68deg);box-shadow:0 0 90px rgba(116,224,255,.18)}.replayEntryState section{position:relative;z-index:2;max-width:680px;text-align:center}.replayEntryState section>p{margin:0;color:#aeefff;font-size:11px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.replayEntryState h1{margin:10px 0;font:500 clamp(2rem,6vw,4.5rem)/.98 Georgia,serif}.entryExplanation{display:block;max-width:560px;margin:0 auto;color:rgba(255,255,255,.72);line-height:1.55}.entryActions{display:flex;justify-content:center;flex-wrap:wrap;gap:10px;margin-top:24px}.entryActions button{min-height:48px;padding:0 20px;border:1px solid rgba(174,239,255,.55);border-radius:999px;background:rgba(8,24,36,.82);color:#fff;font-weight:850;backdrop-filter:blur(14px)}.entryActions button:first-child{background:linear-gradient(135deg,#dcfbff,#8de9f4);color:#041019}.entryActions button:focus-visible{outline:3px solid #fff;outline-offset:4px}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:#02050a;isolation:isolate}.replayVignette{position:absolute;z-index:1;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 48%,transparent 0 38%,rgba(0,0,0,.28) 64%,rgba(0,0,0,.82) 100%)}.replayIdentity{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(380px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayIdentity p{margin:0;color:#bdefff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayIdentity h1{margin:5px 0;font-size:clamp(1.3rem,4vw,2.5rem);line-height:.95}.replayIdentity span{font-size:11px;color:rgba(255,255,255,.72)}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.3);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.replayCaption{position:absolute;z-index:5;left:50%;bottom:clamp(290px,35svh,390px);transform:translateX(-50%);width:min(860px,86vw);text-align:center;text-shadow:0 3px 30px #000;pointer-events:none}.replayCaption small{display:block;color:#bdefff;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.replayCaption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 Georgia,serif}.replayCaption span{display:block;margin:8px auto 0;max-width:640px;font-size:12px;color:rgba(255,255,255,.75)}.replayModeControls{position:absolute;z-index:9;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));display:flex;gap:6px;padding:6px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:rgba(2,7,14,.78);backdrop-filter:blur(16px)}.replayModeControls button{min-height:42px;padding:0 13px;border:0;border-radius:999px;background:transparent;color:#fff;font-weight:800}.replayModeControls button[aria-pressed=true]{background:#dffbff;color:#041019}.controls{position:absolute;z-index:7;left:50%;bottom:max(180px,calc(env(safe-area-inset-bottom) + 174px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.22);border-radius:24px;background:rgba(2,7,14,.78);backdrop-filter:blur(16px)}.controls button{min-width:72px;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,#dffbff,#8adfff);color:#041019;font-weight:900}.controls input{width:100%;min-height:44px}.controls output{min-width:42px;font-size:12px}.transcript{position:absolute;z-index:8;right:max(18px,env(safe-area-inset-right));top:max(78px,calc(env(safe-area-inset-top) + 70px));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.78);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.anchorPanel{position:absolute;z-index:20;right:max(18px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);width:min(320px,calc(100vw - 36px));padding:20px;border:1px solid rgba(255,255,255,.3);border-radius:22px;background:rgba(2,7,14,.92);box-shadow:0 24px 80px #000;backdrop-filter:blur(20px)}.anchorPanel p{margin:0;color:#bdefff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.anchorPanel h2{margin:8px 0}.anchorPanel span{display:block;color:rgba(255,255,255,.72);line-height:1.5}.anchorPanel button{min-height:44px;margin-top:16px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:#dffbff;color:#041019;font-weight:850}.controls button:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible,.replayModeControls button:focus-visible,.anchorPanel button:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:760px){.replayModeControls{top:auto;bottom:max(254px,calc(env(safe-area-inset-bottom) + 248px));left:50%;right:auto;transform:translateX(-50%)}.replayIdentity{max-width:250px}.replayIdentity h1{font-size:1.35rem}.replayCaption{bottom:38svh;width:90vw}.replayCaption strong{font-size:1.35rem}.replayCaption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{display:none}.anchorPanel{left:50%;right:auto;top:auto;bottom:260px;transform:translateX(-50%)}.controls{grid-template-columns:auto 1fr auto;padding:9px 10px}.controls button{min-width:64px}}@media(max-height:720px){.replayCaption{bottom:34svh}.replayModeControls{bottom:230px}}@media(prefers-reduced-motion:reduce){.replayWorld *{scroll-behavior:auto!important}}@media(forced-colors:active){.controls,.unwind,.transcript,.replayModeControls,.anchorPanel{border:2px solid CanvasText}}`
