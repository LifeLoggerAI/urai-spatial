'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'

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
      if (event.key === 'Escape') { event.preventDefault(); unwind() }
      if ((event.key === ' ' || event.key === 'Enter') && memory) { event.preventDefault(); setPlaying((value) => !value) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, unwind])

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

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-canonical-asset={replayAssets.primary.src}>
    <div className="replayBackdrop" aria-hidden="true" />
    <div className="replayPortal" aria-hidden="true"><span /></div>
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span></header>
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="controls" aria-label="Replay controls">
      <button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Replay timeline, ${percent} percent complete`} />
      <output>{percent}%</output>
    </section>
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    <button className="unwind" type="button" onClick={unwind}>← Focus</button>
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background-image:linear-gradient(180deg,rgba(1,4,10,.7),rgba(1,4,10,.95)),${assetCssStack(replayAssets.primary)};background-size:cover;background-position:center;color:#fff}.replayState section{text-align:center;max-width:560px}.replayState button{min-height:44px;margin-top:18px;padding:0 20px;border-radius:999px;border:1px solid #aeefff;background:#dffbff;color:#041019;font-weight:800}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:linear-gradient(180deg,var(--replay-sky),#03040b 58%,var(--replay-ground));isolation:isolate}.replayBackdrop{position:absolute;inset:-6%;background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72)),var(--replay-media),var(--replay-asset),radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--replay-accent) 28%,transparent),transparent 34%);background-size:cover;background-position:center;filter:saturate(.9) contrast(1.08);animation:drift 18s ease-in-out infinite alternate}.replayWorld:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 28%,rgba(0,0,0,.18) 55%,rgba(0,0,0,.86) 100%);pointer-events:none}.replayPortal{position:absolute;z-index:2;left:50%;top:46%;width:min(48vw,520px);aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;border:1px solid color-mix(in srgb,var(--replay-light) 24%,transparent);box-shadow:0 0 110px color-mix(in srgb,var(--replay-accent) 24%,transparent),inset 0 0 100px rgba(0,0,0,.42);display:grid;place-items:center}.replayPortal span{width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 7%,var(--replay-light) 18%,var(--replay-accent) 46%,transparent 74%);box-shadow:0 0 80px var(--replay-accent);animation:pulse 4.8s ease-in-out infinite}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:25svh;transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 Georgia,serif}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.controls{position:absolute;z-index:7;left:50%;bottom:max(18px,calc(env(safe-area-inset-bottom) + 14px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.22);border-radius:24px;background:rgba(2,7,14,.78);backdrop-filter:blur(16px)}.controls button{min-width:72px;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--replay-light),var(--replay-accent));color:#041019;font-weight:900}.controls input{width:100%;min-height:44px}.controls output{min-width:42px;font-size:12px}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.unwind{position:absolute;z-index:8;left:max(14px,env(safe-area-inset-left));bottom:max(82px,calc(env(safe-area-inset-bottom) + 74px));min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.controls button:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes drift{to{transform:scale(1.035) translate3d(1%,-1%,0)}}@keyframes pulse{50%{transform:scale(1.12);opacity:.76}}@media(max-width:700px){.replayPortal{width:min(78vw,360px);top:42%}.caption{bottom:31svh;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{top:auto;right:14px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 76px));max-width:180px}.unwind{left:14px;bottom:max(84px,calc(env(safe-area-inset-bottom) + 76px))}.controls{grid-template-columns:auto 1fr auto;padding:9px 10px}.controls button{min-width:64px}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:28svh}.replayPortal{width:min(54vh,320px)}}@media(prefers-reduced-motion:reduce){.replayBackdrop,.replayPortal span{animation:none}}@media(forced-colors:active){.controls,.unwind,.transcript{border:2px solid CanvasText}}`
