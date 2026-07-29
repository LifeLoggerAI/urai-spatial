'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import {
  buildReplaySpatialScene,
  filterReplayAnchorsForTruthMode,
  replayTruthModeDescription,
  type ReplayTruthMode,
  type ReplayWorldAnchor,
} from '@/spatial/replay/replaySpatialModel'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { ReplayProductControls } from './ReplayProductControls'
import ReplayRecoveryState from './ReplayRecoveryState'
import type { ReplayNavigationMode } from './ReplaySpatialWorld'

const ReplaySpatialWorld = dynamic(() => import('./ReplaySpatialWorld'), {
  ssr: false,
  loading: () => <section className="replaySceneLoading" role="status">Constructing the memory space...</section>,
})

const truthModes: ReplayTruthMode[] = ['evidence', 'reflection', 'cinematic', 'private-journal']
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value))

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const [entered, setEntered] = useState(false)
  const [truthMode, setTruthMode] = useState<ReplayTruthMode>('evidence')
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [navigationMode, setNavigationMode] = useState<ReplayNavigationMode>('guided')
  const [selectedAnchor, setSelectedAnchor] = useState<ReplayWorldAnchor | null>(null)
  const [lowSensory, setLowSensory] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const sceneModel = useMemo(() => memory ? buildReplaySpatialScene(memory) : null, [memory])
  const visibleAnchors = useMemo(
    () => sceneModel ? filterReplayAnchorsForTruthMode(sceneModel.anchors, truthMode) : [],
    [sceneModel, truthMode],
  )
  const active = useMemo(
    () => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1),
    [progressMs, segments],
  )

  useEffect(() => {
    if (progressMs >= duration && playing) setPlaying(false)
  }, [duration, playing, progressMs])

  useEffect(() => {
    if (!memory || !entered || !playing) return
    const step = reducedMotion || lowSensory ? 250 : 100
    const tick = window.setInterval(() => setProgressMs((current) => clamp(current + step, duration)), step)
    return () => window.clearInterval(tick)
  }, [duration, entered, lowSensory, memory, playing, reducedMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape' && navigationMode !== 'explore') {
        event.preventDefault()
        unwind()
      } else if (entered && !interactive && (event.key === ' ' || event.key === 'Enter') && memory && navigationMode === 'guided') {
        event.preventDefault()
        setPlaying((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [entered, memory, navigationMode, unwind])

  useEffect(() => {
    setEntered(false)
    setTruthMode('evidence')
    setProgressMs(0)
    setPlaying(false)
    setNavigationMode('guided')
    setSelectedAnchor(null)
    setShowSources(false)
    setShowTranscript(false)
  }, [memory?.id])

  useEffect(() => {
    if (selectedAnchor && !visibleAnchors.some((anchor) => anchor.id === selectedAnchor.id)) setSelectedAnchor(null)
  }, [selectedAnchor, visibleAnchors])

  if (!memory) return <ReplayRecoveryState status={result.status} message={result.message} />
  if (!sceneModel) return <ReplayRecoveryState status="loading" message="Preparing Replay truth controls." />

  const percent = Math.round((progressMs / duration) * 100)
  const sourceKinds = Array.from(new Set(memory.sourceMedia.map((source) => source.kind)))
  const sensitiveTopicLabels = sceneModel.sensitiveTopics.map((topic) => topic.label)
  const preflightDisclosures = Array.from(new Set(sceneModel.preflightDisclosures))
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
    '--replay-provider-preview': assetCssStack(replayAssets.primary),
  } as CSSProperties

  const togglePlayback = () => {
    if (!entered || navigationMode === 'explore') return
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
      data-replay-entered={entered ? 'true' : 'false'}
      data-replay-truth-mode={truthMode}
      data-sensitive-topic-count={sceneModel.sensitiveTopics.length}
      data-canonical-asset={replayAssets.primary.src}
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

      {!entered ? (
        <section className="replayPreflight" aria-labelledby="replay-preflight-title" data-testid="replay-preflight">
          <div className="providerEvidencePreview" aria-label="Verified provider evidence preview" />
          <div className="preflightBody">
            <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} Replay`}</p>
            <h1 id="replay-preflight-title">Replay preflight</h1>
            <h2>{memory.title}</h2>
            <p>This memory will not autoplay. Review its truth mode, sources, and sensitive-content disclosures before entry.</p>
            <dl>
              <div><dt>Sources</dt><dd>{memory.sourceMedia.length || 'No media'}{sourceKinds.length ? ` (${sourceKinds.join(', ')})` : ''}</dd></div>
              <div><dt>Spatial anchors</dt><dd>{visibleAnchors.length} visible in this mode</dd></div>
              <div><dt>Sensitive topics</dt><dd>{sensitiveTopicLabels.length ? sensitiveTopicLabels.join(', ') : 'None detected'}</dd></div>
            </dl>
            <div className="disclosures" role="note">
              {preflightDisclosures.map((disclosure) => <p key={disclosure}>{disclosure}</p>)}
            </div>
            <fieldset>
              <legend>Truth mode</legend>
              {truthModes.map((mode) => (
                <button key={mode} type="button" aria-pressed={truthMode === mode} onClick={() => setTruthMode(mode)}>
                  <strong>{mode.replace('-', ' ')}</strong><span>{replayTruthModeDescription(mode)}</span>
                </button>
              ))}
            </fieldset>
            <label><input type="checkbox" checked={lowSensory} onChange={(event) => setLowSensory(event.currentTarget.checked)} /> Reduce sensory intensity</label>
            <div className="preflightActions">
              <button type="button" className="enterReplay" onClick={() => setEntered(true)}>Enter Replay</button>
              <button type="button" onClick={unwind}>Return to Focus</button>
            </div>
            <small>The provider image above is an evidence preview only. The entered experience is the WebGL spatial reconstruction.</small>
          </div>
        </section>
      ) : null}

      {entered ? (
        <>
          <header className="replayHeader">
            <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p>
            <h1>{memory.title}</h1>
            <span>{memory.place?.label ?? 'Partially reconstructed memory'} - {active?.label ?? 'Memory'}</span>
            <button className="unwind" type="button" onClick={unwind}>Exit Replay</button>
          </header>

          <section className="caption" aria-live="polite">
            <small>{active?.label ?? 'Replay'} - {truthMode}</small>
            <strong>{active?.caption ?? memory.narrator.replay}</strong>
            <span>{active?.narratorLine ?? memory.narrator.replay}</span>
          </section>

          {selectedAnchor ? (
            <aside className="evidencePanel" aria-label="Selected Replay evidence" data-evidence-level={selectedAnchor.evidenceLevel}>
              <button type="button" aria-label="Close evidence panel" onClick={() => setSelectedAnchor(null)}>x</button>
              <p>{selectedAnchor.kind} - {selectedAnchor.evidenceLevel}</p>
              <h2>{selectedAnchor.label}</h2>
              <span>{selectedAnchor.description}</span>
              <small>{selectedAnchor.consentState === 'abstract-only' ? 'Abstract representation only. No likeness or voice is being synthesized.' : `Sources: ${selectedAnchor.sourceIds.join(', ') || 'none recorded'}`}</small>
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
            <button type="button" aria-expanded={showSources} onClick={() => setShowSources((value) => !value)}>Sources</button>
            {memory.replayManifest.transcript ? <button type="button" aria-expanded={showTranscript} onClick={() => setShowTranscript((value) => !value)}>Transcript</button> : null}
          </section>

          <section className="truthControls" role="group" aria-label="Replay truth mode">
            {truthModes.map((mode) => <button key={mode} type="button" aria-pressed={truthMode === mode} onClick={() => setTruthMode(mode)}>{mode.replace('-', ' ')}</button>)}
          </section>

          {showSources ? (
            <aside className="sourceLedger" aria-label="Replay source ledger">
              <button type="button" aria-label="Close source ledger" onClick={() => setShowSources(false)}>x</button>
              <h2>Source ledger</h2>
              <p>{replayTruthModeDescription(truthMode)}</p>
              <ul>{visibleAnchors.map((anchor) => <li key={anchor.id}><button type="button" onClick={() => setSelectedAnchor(anchor)}><strong>{anchor.label}</strong><span>{anchor.evidenceLevel} - {anchor.sourceIds.join(', ') || 'no source id'}</span></button></li>)}</ul>
            </aside>
          ) : null}

          {showTranscript && memory.replayManifest.transcript ? (
            <section className="transcript" role="dialog" aria-modal="false" aria-labelledby="replay-transcript-title">
              <button type="button" aria-label="Close transcript" onClick={() => setShowTranscript(false)}>x</button>
              <h2 id="replay-transcript-title">Replay transcript</h2>
              <p>{memory.replayManifest.transcript}</p>
            </section>
          ) : null}
        </>
      ) : null}

      <p className="sceneSummary" data-testid="urai-replay-meta-panel">Scene summary: {memory.title}. {memory.place ? `Confirmed place: ${memory.place.label}.` : 'The place is not confirmed.'} {visibleAnchors.length} anchors are visible in {truthMode} mode.</p>
      <style dangerouslySetInnerHTML={{ __html: replayCss }} />
    </main>
  )
}

const replayCss = `
.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:#02060c;isolation:isolate}.replayWorld[data-low-sensory='true']{filter:saturate(.62) contrast(.9)}
.replayPreflight{position:absolute;inset:0;z-index:80;display:grid;grid-template-columns:minmax(260px,38vw) 1fr;background:#02060cf5;overflow:auto}.providerEvidencePreview{min-height:260px;background-image:linear-gradient(180deg,#02060c33,#02060ccc),var(--replay-provider-preview);background-size:cover;background-position:center}.preflightBody{align-self:center;width:min(720px,calc(100vw - 36px));padding:28px;box-sizing:border-box}.preflightBody h1{margin:4px 0;font-size:clamp(2rem,5vw,4rem)}.preflightBody h2{margin:0 0 14px;color:var(--replay-light)}.preflightBody dl{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.preflightBody dl div,.disclosures{padding:12px;border:1px solid #d7f9ff22;border-radius:14px;background:#07131dcc}.preflightBody dt{font-size:10px;text-transform:uppercase;color:#9ab2bf}.preflightBody dd{margin:5px 0 0}.preflightBody fieldset{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:16px 0;padding:0;border:0}.preflightBody legend{margin-bottom:8px;font-weight:900}.preflightBody fieldset button{display:grid;gap:4px;min-height:72px;padding:12px;text-align:left}.preflightBody fieldset button span{font-size:11px;color:#b9ccd6}.preflightActions{display:flex;gap:10px;margin-top:18px}.preflightActions button,.preflightBody fieldset button,.truthControls button,.sensoryControls button,.unwind{border:1px solid #d7f9ff2b;border-radius:999px;background:#071722e8;color:#fff}.preflightActions button{min-height:48px;padding:0 20px}.preflightActions .enterReplay,.preflightBody fieldset button[aria-pressed='true'],.truthControls button[aria-pressed='true']{background:#dffcff;color:#031018}
.replayHeader{position:absolute;z-index:20;left:18px;top:18px;max-width:390px;padding:14px 16px;border:1px solid #d2f8ff29;border-radius:20px;background:#020910b8}.replayHeader p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900}.replayHeader h1{margin:5px 0}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px}.caption{position:absolute;z-index:14;left:50%;bottom:38svh;transform:translateX(-50%);width:min(820px,86vw);text-align:center;pointer-events:none}.caption strong,.caption span,.caption small{display:block}.caption strong{font:500 clamp(1.2rem,3.5vw,2.6rem)/1.08 Georgia,serif}.controls{position:absolute;z-index:22;left:50%;bottom:max(180px,calc(env(safe-area-inset-bottom) + 174px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:11px 14px;border:1px solid #fff3;border-radius:24px;background:#02070ed6}.controls button{min-height:44px}.controls input{width:100%}.evidencePanel,.sourceLedger,.transcript{position:absolute;z-index:28;right:18px;top:18px;width:min(420px,calc(100vw - 36px));max-height:70svh;overflow:auto;padding:18px;box-sizing:border-box;border:1px solid #d2f8ff3d;border-radius:22px;background:#020910f2}.sourceLedger ul{list-style:none;padding:0}.sourceLedger li button{display:grid;width:100%;padding:10px;text-align:left}.sourceLedger li span{font-size:11px}.sensoryControls{position:absolute;z-index:23;right:14px;bottom:16px;display:flex;gap:7px}.sensoryControls button,.truthControls button{min-height:44px;padding:0 12px}.truthControls{position:absolute;z-index:23;left:14px;bottom:70px;display:flex;gap:6px;flex-wrap:wrap}.sceneSummary{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}.replaySceneLoading{position:absolute;inset:0;display:grid;place-items:center;background:#02060c}button:focus-visible,input:focus-visible{outline:3px solid #fff;outline-offset:3px}
@media(max-width:760px){.replayPreflight{grid-template-columns:1fr}.providerEvidencePreview{min-height:190px}.preflightBody{padding:18px}.preflightBody dl{grid-template-columns:1fr}.preflightBody fieldset{grid-template-columns:1fr}.caption{display:block;bottom:max(294px,calc(env(safe-area-inset-bottom) + 284px));width:calc(100vw - 24px);padding:0 8px;box-sizing:border-box}.caption strong{font-size:clamp(1.05rem,5vw,1.45rem)}.caption span{font-size:12px}.controls{bottom:max(205px,calc(env(safe-area-inset-bottom) + 199px))}.truthControls{left:9px;right:9px;bottom:112px}.sensoryControls{right:9px;bottom:62px}.evidencePanel,.sourceLedger,.transcript{left:12px;right:12px;top:auto;bottom:165px;width:auto}}
@media(prefers-reduced-motion:reduce){.replayWorld{scroll-behavior:auto}}@media(forced-colors:active){.controls,.unwind,.transcript,.evidencePanel,.sourceLedger,.sensoryControls button,.truthControls button{border:2px solid CanvasText}}
`
