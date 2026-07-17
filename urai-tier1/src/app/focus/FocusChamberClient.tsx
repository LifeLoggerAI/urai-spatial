'use client'

import { useCallback, useMemo } from 'react'
import { assetCssStack, focusAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'

function dateLabel(value: string) {
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) } catch { return value }
}

export default function FocusChamberClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const replayHref = useMemo(() => {
    if (!memory) return null
    const next = new URLSearchParams({ memoryId: memory.id, manifestId: memory.replayManifest.id, node: memory.star.id, from: 'focus-artifact' })
    if (memory.demo) next.set('demo', '1')
    return `/replay?${next.toString()}`
  }, [memory])

  const enterReplay = useCallback(() => {
    if (!memory || !replayHref) return
    requestUraiWorldTravel({ destination: 'replay', href: replayHref, entryPortal: 'focus-memory-aperture', cameraCheckpoint: `focus:${memory.star.id}`, context: { memoryId: memory.id, replayManifestId: memory.replayManifest.id, privacyMode: memory.privacy === 'private' ? 'held-private' : 'private' } })
  }, [memory, replayHref])

  const unwind = useCallback(() => requestUraiWorldReturn(), [])

  if (!memory) {
    return <main className="focusState" data-testid="urai-final-focus-chamber" data-memory-status={result.status} data-canonical-asset={focusAssets.primary.src}><section role={result.status === 'loading' ? 'status' : 'alert'}><p>{result.status === 'loading' ? 'Selected memory chamber.' : 'Memory unavailable'}</p><h1>{result.message}</h1><button type="button" onClick={unwind}>Return to Life Map</button></section><style>{stateCss}</style></main>
  }

  const people = memory.people.map((person) => person.relationship ? `${person.label} · ${person.relationship}` : person.label).join(', ')
  const media = memory.sourceMedia.find((item) => item.kind === 'image')
  const style = {
    '--memory-accent': memory.visuals.accent,
    '--memory-light': memory.visuals.light,
    '--memory-sky': memory.visuals.sky,
    '--memory-ground': memory.visuals.ground,
    '--memory-image': media ? `url("${media.url.replaceAll('"', '%22')}")` : 'none',
    '--focus-asset': assetCssStack(focusAssets.primary),
  } as React.CSSProperties

  return <main className="focusWorld" style={style} data-testid="urai-final-focus-chamber" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-canonical-asset={focusAssets.primary.src}>
    <div className="focusFog" aria-hidden="true" />
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} memory`}</p><h1>{memory.title}</h1><span>{dateLabel(memory.occurredAt)}</span></header>
    <section className="artifactStage" aria-label={`Selected memory ${memory.title}`}>
      <button className="artifact" type="button" onClick={enterReplay} aria-label={`Open Replay for ${memory.title}`}>
        <span className="artifactImage" aria-hidden="true" />
        <span className="artifactCore" aria-hidden="true" />
        <strong>Replay this memory</strong>
      </button>
    </section>
    <aside className="memoryMeaning"><p>{memory.narrator.focus}</p><dl><div><dt>Emotion</dt><dd>{memory.emotionalState}</dd></div><div><dt>Place</dt><dd>{memory.place?.label ?? 'Not recorded'}</dd></div><div><dt>People</dt><dd>{people || 'Not recorded'}</dd></div><div><dt>Privacy</dt><dd>{memory.privacy}</dd></div></dl></aside>
    <button className="unwind" type="button" onClick={unwind}>← Life Map</button>
    <style>{focusCss}</style>
  </main>
}

const stateCss = `.focusState{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background-image:linear-gradient(180deg,rgba(1,4,10,.68),rgba(1,4,10,.94)),${assetCssStack(focusAssets.primary)};background-size:cover;background-position:center;color:#fff}.focusState section{max-width:540px;text-align:center}.focusState button{min-height:44px;margin-top:18px;padding:0 20px;border-radius:999px;border:1px solid #aeefff;background:#dffbff;color:#041019;font-weight:800}.focusState button:focus-visible{outline:3px solid #fff;outline-offset:4px}`

const focusCss = `.focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--memory-accent) 26%,transparent),transparent 28%),linear-gradient(180deg,var(--memory-sky),#02040a 52%,var(--memory-ground));isolation:isolate}.focusFog{position:absolute;inset:-20%;background:radial-gradient(circle at 50% 44%,transparent 0 17%,rgba(0,0,0,.18) 42%,rgba(0,0,0,.82) 100%);pointer-events:none}.focusWorld header{position:absolute;z-index:4;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.focusWorld header p{margin:0;color:var(--memory-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.focusWorld header h1{margin:5px 0;font-size:clamp(1.3rem,4vw,2.5rem);line-height:.95}.focusWorld header span{font-size:12px;color:rgba(255,255,255,.7)}.artifactStage{position:absolute;inset:10svh 0 16svh;display:grid;place-items:center;perspective:1200px}.artifact{position:relative;width:min(54vw,460px);min-width:220px;aspect-ratio:1;border:0;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center}.artifact:focus-visible{outline:3px solid #fff;outline-offset:12px;border-radius:50%}.artifactImage{position:absolute;inset:0;border-radius:38% 62% 53% 47%;background-image:linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.56)),var(--memory-image),var(--focus-asset),radial-gradient(circle,var(--memory-accent),#07131f 66%);background-size:cover;background-position:center;border:1px solid color-mix(in srgb,var(--memory-light) 60%,transparent);box-shadow:0 0 120px color-mix(in srgb,var(--memory-accent) 28%,transparent),inset 0 0 100px rgba(0,0,0,.5);animation:artifactFloat 6s ease-in-out infinite alternate}.artifactCore{position:absolute;width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 7%,var(--memory-light) 18%,var(--memory-accent) 48%,transparent 72%);box-shadow:0 0 60px var(--memory-accent)}.artifact strong{position:absolute;bottom:-52px;min-height:44px;display:grid;place-items:center;padding:0 22px;border-radius:999px;background:rgba(2,8,15,.78);border:1px solid color-mix(in srgb,var(--memory-light) 55%,transparent);font-size:12px;letter-spacing:.08em;text-transform:uppercase}.memoryMeaning{position:absolute;z-index:5;right:max(18px,env(safe-area-inset-right));bottom:max(18px,calc(env(safe-area-inset-bottom) + 16px));width:min(360px,calc(100vw - 36px));padding:14px 16px;border-left:1px solid color-mix(in srgb,var(--memory-light) 50%,transparent);background:linear-gradient(90deg,rgba(2,7,12,.72),rgba(2,7,12,.24));backdrop-filter:blur(12px)}.memoryMeaning p{margin:0 0 10px;font:500 clamp(1rem,2vw,1.3rem)/1.3 Georgia,serif}.memoryMeaning dl{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:0}.memoryMeaning dt{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:var(--memory-light)}.memoryMeaning dd{margin:2px 0 0;font-size:11px;color:rgba(255,255,255,.78)}.unwind{position:absolute;z-index:8;left:max(14px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));min-height:44px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.unwind:focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes artifactFloat{to{transform:translateY(-10px) rotate(1deg)}}@media(max-width:700px){.artifactStage{inset:15svh 0 31svh}.artifact{width:min(72vw,330px)}.memoryMeaning{left:14px;right:14px;bottom:max(72px,calc(env(safe-area-inset-bottom) + 62px));width:auto;padding:10px 12px}.memoryMeaning p{font-size:.98rem}.memoryMeaning dl{grid-template-columns:1fr 1fr}.artifact strong{bottom:-48px}.focusWorld header{max-width:260px}.focusWorld header h1{font-size:1.4rem}}@media(max-height:720px){.artifactStage{inset:12svh 0 28svh}.artifact{width:min(48vh,300px)}.memoryMeaning p{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}}@media(prefers-reduced-motion:reduce){.artifactImage{animation:none}}@media(forced-colors:active){.artifact strong,.unwind,.memoryMeaning{forced-color-adjust:auto;border:2px solid CanvasText}}`
