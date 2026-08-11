'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { ReplayProductControls } from './ReplayProductControls'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const chooseMemory = useCallback(() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/', entryPortal: 'replay-memory-horizon', cameraCheckpoint: 'life-map-overview' }), [])

  useEffect(() => {
    if (!memory || !playing) return
    const tick = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setPlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [duration, memory, playing, reducedMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') { event.preventDefault(); unwind(); return }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory) { event.preventDefault(); setPlaying((value) => !value) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, unwind])

  if (!memory) return <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src} data-replay-neutral="memory-horizon"><div className="replayStateBackdrop" aria-hidden="true" /><div className="replayStatePortal" aria-hidden="true"><span /></div><section role={result.status === 'loading' ? 'status' : 'region'} aria-label="Replay memory horizon"><p>{result.status === 'loading' ? 'Opening memory field' : 'Memory horizon'}</p><h1>{result.status === 'loading' ? 'A memory is coming into view.' : 'Choose a memory to enter its reconstruction.'}</h1><span>{result.status === 'loading' ? 'The spatial field will open as soon as the selected memory is ready.' : 'Replay begins from a memory in Life Map, so you always arrive with context.'}</span>{result.status === 'loading' ? null : <button type="button" onClick={chooseMemory}>Choose a memory</button>}</section><style>{stateCss}</style></main>

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

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-canonical-asset={replayAssets.primary.src}>
    <div className="replayBackdrop" aria-hidden="true" />
    <div className="replayPortal" aria-hidden="true"><span /></div>
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span><button className="unwind" type="button" onClick={unwind}>← Focus</button></header>
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="controls" aria-label="Replay controls">
      <button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Replay timeline, ${percent} percent complete`} />
      <output>{percent}%</output>
    </section>
    <ReplayProductControls memory={memory} />
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replayStateBackdrop{position:absolute;inset:-4%;z-index:-3;background-image:linear-gradient(180deg,rgba(1,4,10,.26),rgba(1,4,10,.9)),${assetCssStack(replayAssets.primary)},radial-gradient(circle at 50% 42%,rgba(119,218,235,.18),transparent 38%);background-size:cover;background-position:center;filter:saturate(.72) contrast(1.08);opacity:.62;animation:replayStateDrift 22s ease-in-out infinite alternate}.replayState:after{content:'';position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.34) 48%,rgba(1,5,12,.92) 100%);pointer-events:none}.replayStatePortal{position:absolute;z-index:-1;left:50%;top:44%;width:min(54vw,560px);aspect-ratio:1;transform:translate(-50%,-50%);border:1px solid rgba(206,245,255,.16);border-radius:50%;box-shadow:0 0 120px rgba(105,214,232,.14),inset 0 0 90px rgba(0,0,0,.44);display:grid;place-items:center}.replayStatePortal span{width:13%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 6%,#c9f7ff 16%,#63cfe0 42%,transparent 72%);box-shadow:0 0 70px rgba(105,224,240,.58);animation:replayStatePulse 5.4s ease-in-out infinite}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.78),rgba(2,8,16,.34));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 Georgia,serif;letter-spacing:-.035em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@keyframes replayStateDrift{to{transform:scale(1.025) translate3d(.8%,-.6%,0)}}@keyframes replayStatePulse{50%{transform:scale(1.12);opacity:.74}}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}.replayStatePortal{width:min(82vw,420px)}}@media(prefers-reduced-motion:reduce){.replayStateBackdrop,.replayStatePortal span{animation:none}.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:linear-gradient(180deg,var(--replay-sky),#03040b 58%,var(--replay-ground));isolation:isolate}.replayBackdrop{position:absolute;inset:-6%;background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72)),var(--replay-media),var(--replay-asset),radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--replay-accent) 28%,transparent),transparent 34%);background-size:cover;background-position:center;filter:saturate(.9) contrast(1.08);animation:drift 18s ease-in-out infinite alternate}.replayWorld:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 28%,rgba(0,0,0,.18) 55%,rgba(0,0,0,.86) 100%);pointer-events:none}.replayPortal{position:absolute;z-index:2;left:50%;top:46%;width:min(48vw,520px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid color-mix(in srgb,var(--replay-light) 24%,transparent);box-shadow:0 0 110px color-mix(in srgb,var(--replay-accent) 24%,transparent),inset 0 0 100px rgba(0,0,0,.42);display:grid;place-items:center}.replayPortal span{width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 7%,var(--replay-light) 18%,var(--replay-accent) 46%,transparent 74%);box-shadow:0 0 80px var(--replay-accent);animation:pulse 4.8s ease-in-out infinite}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:clamp(280px,32svh,350px);transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 Georgia,serif}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.controls{position:absolute;z-index:7;left:50%;bottom:max(180px,calc(env(safe-area-inset-bottom) + 174px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.22);border-radius:24px;background:rgba(2,7,14,.78);backdrop-filter:blur(16px)}.controls button{min-width:72px;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--replay-light),var(--replay-accent));color:#041019;font-weight:900}.controls input{width:100%;min-height:44px}.controls output{min-width:42px;font-size:12px}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.controls button:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes drift{to{transform:scale(1.035) translate3d(1%,-1%,0)}}@keyframes pulse{50%{transform:scale(1.12);opacity:.76}}@media(max-width:700px){.replayPortal{width:min(78vw,360px);top:42%}.caption{bottom:31svh;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{top:max(76px,calc(env(safe-area-inset-top) + 70px));right:14px;bottom:auto;max-width:180px}.unwind{margin-top:9px}.controls{grid-template-columns:auto 1fr auto;padding:9px 10px}.controls button{min-width:64px}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:28svh}.replayPortal{width:min(54vh,320px)}}@media(prefers-reduced-motion:reduce){.replayBackdrop,.replayPortal span{animation:none}}@media(forced-colors:active){.controls,.unwind,.transcript{border:2px solid CanvasText}}`