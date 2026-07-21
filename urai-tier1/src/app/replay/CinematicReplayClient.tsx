'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { ReplayWorldAnchor } from '@/spatial/replay/replaySpatialModel'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { ReplayProductControls } from './ReplayProductControls'
import ReplayRecoveryState from './ReplayRecoveryState'
import type { ReplayNavigationMode } from './ReplaySpatialWorld'

const ReplaySpatialWorld = dynamic(() => import('./ReplaySpatialWorld'), {
  ssr: false,
  loading: () => <section className="replaySceneLoading" role="status">Constructing the memory space…</section>,
})

function clamp(value: number, max: number) {
  return Math.max(0, Math.min(max, value))
}

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [navigationMode, setNavigationMode] = useState<ReplayNavigationMode>('guided')
  const [selectedAnchor, setSelectedAnchor] = useState<ReplayWorldAnchor | null>(null)
  const [lowSensory, setLowSensory] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(
    () => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1),
    [progressMs, segments],
  )
  const unwind = useCallback(() => requestUraiWorldReturn(), [])

  useEffect(() => {
    if (progressMs >= duration && playing) setPlaying(false)
  }, [duration, playing, progressMs])

  useEffect(() => {
    if (!memory || !playing) return
    const step = reducedMotion || lowSensory ? 250 : 100
    const tick = window.setInterval(() => {
      setProgressMs((current) => clamp(current + step, duration))
    }, step)
    return () => window.clearInterval(tick)
  }, [duration, lowSensory, memory, playing, reducedMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape' && navigationMode !== 'explore') {
        event.preventDefault()
        unwind()
        return
      }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory && navigationMode === 'guided') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, navigationMode, unwind])

  useEffect(() => {
    setProgressMs(0)
    setPlaying(false)
    setNavigationMode('guided')
    setSelectedAnchor(null)
  }, [memory?.id])

  if (!memory) return <ReplayRecoveryState status={result.status} message={result.message} />

  const percent = Math.round((progressMs / duration) * 100)
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
  } as CSSProperties

  const togglePlayback = () => {
    if (progressMs >= duration) setProgressMs(0)
    setPlaying((value) => !value)
  }

  return (
    <main
      className="replayWorld"
      style={style}
      data-testid="cinematic-replay-client"
      data-memory-status={result.status}
      data-memory-id={memory.id}
      data-star-id={memory.star.id}
      data-manifest-id={memory.replayManifest.id}
      data-node={memory.star.id}
      data-playing={playing ? 'true' : 'false'}
      data-navigation-mode={navigationMode}
      data-low-sensory={lowSensory ? 'true' : 'false'}
    >
      <ReplaySpatialWorld
        memory={memory}
        progressMs={progressMs}
        activeSegmentId={active?.id ?? 'memory'}
        playing={playing}
        mode={navigationMode}
        reducedMotion={reducedMotion || lowSensory}
        onModeChange={(mode) => {
          setNavigationMode(mode)
          if (mode === 'explore') setPlaying(false)
        }}
        onAnchorSelect={setSelectedAnchor}
        onExit={unwind}
      />

      <header className="replayHeader">
        <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p>
        <h1>{memory.title}</h1>
        <span>{memory.place?.label ?? 'Partially reconstructed memory'} · {active?.label ?? 'Memory'}</span>
        <button className="unwind" type="button" onClick={unwind}>Exit Replay</button>
      </header>

      <section className="caption" aria-live="polite">
        <small>{active?.label ?? 'Replay'} · {navigationMode}</small>
        <strong>{active?.caption ?? memory.narrator.replay}</strong>
        <span>{active?.narratorLine ?? memory.narrator.replay}</span>
      </section>

      {selectedAnchor ? (
        <aside className="evidencePanel" aria-label="Selected Replay evidence" data-evidence-level={selectedAnchor.evidenceLevel}>
          <button type="button" aria-label="Close evidence panel" onClick={() => setSelectedAnchor(null)}>×</button>
          <p>{selectedAnchor.kind} · {selectedAnchor.evidenceLevel}</p>
          <h2>{selectedAnchor.label}</h2>
          <span>{selectedAnchor.description}</span>
          <small>{selectedAnchor.consentState === 'abstract-only' ? 'Abstract representation only. No likeness or voice is being synthesized.' : `${selectedAnchor.sourceIds.length} source reference${selectedAnchor.sourceIds.length === 1 ? '' : 's'}.`}</small>
        </aside>
      ) : null}

      <section className="controls" aria-label="Replay playback controls" data-testid="urai-replay-timeline">
        <button type="button" onClick={togglePlayback} disabled={navigationMode === 'explore'} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
        <input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => { setPlaying(false); setProgressMs(Number(event.currentTarget.value)) }} aria-label={`Replay timeline, ${percent} percent complete`} />
        <output>{percent}%</output>
      </section>

      <ReplayProductControls memory={memory} />

      <section className="sensoryControls" aria-label="Replay sensory and evidence controls">
        <button type="button" aria-pressed={lowSensory} onClick={() => setLowSensory((value) => !value)}>{lowSensory ? 'Standard sensory' : 'Reduce sensory'}</button>
        {memory.replayManifest.transcript ? <button type="button" aria-expanded={showTranscript} onClick={() => setShowTranscript((value) => !value)}>Transcript</button> : null}
      </section>

      {showTranscript && memory.replayManifest.transcript ? (
        <section className="transcript" role="dialog" aria-modal="false" aria-labelledby="replay-transcript-title">
          <button type="button" aria-label="Close transcript" onClick={() => setShowTranscript(false)}>×</button>
          <h2 id="replay-transcript-title">Replay transcript</h2>
          <p>{memory.replayManifest.transcript}</p>
        </section>
      ) : null}

      <p className="sceneSummary" data-testid="urai-replay-meta-panel">Scene summary: {memory.title}. {memory.place ? `Confirmed place: ${memory.place.label}.` : 'The place is not confirmed.'} Inferred elements are visually softened and remain correctable.</p>
      <style dangerouslySetInnerHTML={{ __html: replayCss }} />
    </main>
  )
}

const replayCss = `
.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:#02060c;isolation:isolate}.replayWorld[data-low-sensory='true']{filter:saturate(.62) contrast(.9)}
.replayHeader{position:absolute;z-index:20;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(390px,calc(100vw - 36px));padding:14px 16px;border:1px solid rgba(210,248,255,.16);border-radius:20px;background:rgba(2,9,16,.62);backdrop-filter:blur(16px);text-shadow:0 3px 24px #000}.replayHeader p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayHeader h1{margin:5px 0;font-size:clamp(1.3rem,4vw,2.5rem);line-height:.96}.replayHeader span{font-size:11px;color:rgba(255,255,255,.72)}
.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.82);color:#fff;font-weight:800}.caption{position:absolute;z-index:14;left:50%;bottom:clamp(320px,38svh,410px);transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000;pointer-events:none}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.2rem,3.5vw,2.6rem)/1.08 Georgia,serif}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.74)}
.controls{position:absolute;z-index:22;left:50%;bottom:max(180px,calc(env(safe-area-inset-bottom) + 174px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:11px 14px;box-sizing:border-box;border:1px solid rgba(255,255,255,.22);border-radius:24px;background:rgba(2,7,14,.84);backdrop-filter:blur(16px)}.controls button{min-width:72px;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--replay-light),var(--replay-accent));color:#041019;font-weight:900}.controls button:disabled{opacity:.45}.controls input{width:100%;min-height:44px}.controls output{min-width:42px;font-size:12px}
.evidencePanel{position:absolute;z-index:25;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));width:min(340px,calc(100vw - 36px));padding:18px;box-sizing:border-box;border:1px solid rgba(210,248,255,.24);border-radius:22px;background:rgba(2,9,16,.92);box-shadow:0 24px 80px #000b;backdrop-filter:blur(20px)}.evidencePanel>button,.transcript>button{position:absolute;right:10px;top:10px;width:38px;height:38px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:#07131e;color:#fff;font-size:20px}.evidencePanel p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.evidencePanel h2{margin:10px 40px 7px 0;font-size:1.25rem}.evidencePanel span,.evidencePanel small{display:block;color:#c0d1dc;font-size:12px;line-height:1.5}.evidencePanel small{margin-top:12px;color:#8da6b5}.evidencePanel[data-evidence-level='inferred'],.evidencePanel[data-evidence-level='unknown']{border-style:dashed}
.sensoryControls{position:absolute;z-index:23;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));display:flex;gap:7px}.sensoryControls button{min-height:48px;padding:0 14px;border:1px solid rgba(210,248,255,.2);border-radius:999px;background:rgba(2,12,24,.82);color:#fff;font-weight:750}.transcript{position:absolute;z-index:28;right:max(18px,env(safe-area-inset-right));bottom:max(76px,calc(env(safe-area-inset-bottom) + 70px));width:min(430px,calc(100vw - 36px));max-height:55svh;overflow:auto;padding:22px;box-sizing:border-box;border:1px solid rgba(255,255,255,.24);border-radius:22px;background:#040c14f5;box-shadow:0 24px 90px #000}.transcript h2{margin:0 40px 12px 0}.transcript p{color:#c7d8e2;line-height:1.65}.sceneSummary{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.replaySceneLoading{position:absolute;inset:0;display:grid;place-items:center;background:#02060c;color:#dffbff}
button:focus-visible,input:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.replayHeader{max-width:250px;padding:11px 13px}.replayHeader h1{font-size:1.35rem}.caption{bottom:39svh;width:92vw}.caption strong{font-size:1.3rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.controls{bottom:max(205px,calc(env(safe-area-inset-bottom) + 199px));padding:8px 10px}.controls button{min-width:62px}.evidencePanel{top:auto;bottom:max(264px,calc(env(safe-area-inset-bottom) + 258px));right:12px;left:12px;width:auto}.sensoryControls{right:max(9px,env(safe-area-inset-right));bottom:max(62px,calc(env(safe-area-inset-bottom) + 56px))}.sensoryControls button{min-height:44px;padding:0 11px;font-size:11px}.transcript{left:12px;right:12px;width:auto;bottom:max(116px,calc(env(safe-area-inset-bottom) + 110px))}}@media(max-height:720px){.caption{display:none}}@media(prefers-reduced-motion:reduce){.replayWorld{scroll-behavior:auto}}@media(forced-colors:active){.controls,.unwind,.transcript,.evidencePanel,.sensoryControls button{border:2px solid CanvasText}}
`