'use client'

import { useCallback, useMemo } from 'react'
import { assetCssStack, focusAssets } from '@/spatial/assets/uraiAssets'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

export default function FocusChamberClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const replayHref = useMemo(() => {
    if (!memory) return null
    const next = new URLSearchParams({
      memoryId: memory.id,
      manifestId: memory.replayManifest.id,
      node: memory.star.id,
      from: 'focus-artifact',
    })
    if (memory.demo) next.set('demo', '1')
    return `/replay?${next.toString()}`
  }, [memory])

  const enterReplay = useCallback(() => {
    if (!memory || !replayHref) return
    requestUraiWorldTravel({
      destination: 'replay',
      href: replayHref,
      entryPortal: 'focus-memory-aperture',
      cameraCheckpoint: `focus:${memory.star.id}`,
      context: {
        memoryId: memory.id,
        replayManifestId: memory.replayManifest.id,
        privacyMode: memory.privacy === 'private' ? 'held-private' : 'private',
      },
    })
  }, [memory, replayHref])

  const unwind = useCallback(() => requestUraiWorldReturn(), [])

  if (!memory) {
    return (
      <main
        className="focusState"
        data-testid="urai-final-focus-chamber"
        data-memory-status={result.status}
        data-canonical-asset={focusAssets.primary.src}
      >
        <section role={result.status === 'loading' ? 'status' : 'alert'}>
          <p>{result.status === 'loading' ? 'Selected memory chamber.' : 'Memory unavailable'}</p>
          <h1>{result.message}</h1>
          <button type="button" onClick={unwind}>Return to Life Map</button>
        </section>
        <style>{stateCss}</style>
      </main>
    )
  }

  const people = memory.people
    .map((person) => person.relationship ? `${person.label} · ${person.relationship}` : person.label)
    .join(', ')
  const media = memory.sourceMedia.find((item) => item.kind === 'image')
  const style = {
    '--memory-accent': memory.visuals.accent,
    '--memory-light': memory.visuals.light,
    '--memory-sky': memory.visuals.sky,
    '--memory-ground': memory.visuals.ground,
    '--memory-image': media ? `url("${media.url.replaceAll('"', '%22')}")` : 'none',
    '--focus-asset': assetCssStack(focusAssets.primary),
  } as React.CSSProperties

  return (
    <main
      className="focusWorld"
      style={style}
      data-testid="urai-final-focus-chamber"
      data-focus-composition="living-memory-chamber"
      data-memory-status={result.status}
      data-memory-id={memory.id}
      data-star-id={memory.star.id}
      data-node={memory.star.id}
      data-manifest-id={memory.replayManifest.id}
      data-canonical-asset={focusAssets.primary.src}
    >
      <div className="focusBackdrop" aria-hidden="true" />
      <div className="focusFog" aria-hidden="true" />

      <header className="focusHeading">
        <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} memory`}</p>
        <h1>{memory.title}</h1>
        <span>{dateLabel(memory.occurredAt)}</span>
        <div className="focusNarration">
          <small>Selected memory</small>
          <strong>{memory.narrator.focus}</strong>
        </div>
      </header>

      <section className="artifactStage" aria-label={`Selected memory ${memory.title}`}>
        <span className="apertureOrbit apertureOrbitOuter" aria-hidden="true" />
        <span className="apertureOrbit apertureOrbitInner" aria-hidden="true" />
        <button className="artifact" type="button" onClick={enterReplay} aria-label={`Open Replay for ${memory.title}`}>
          <span className="artifactImage" aria-hidden="true" />
          <span className="artifactCore" aria-hidden="true" />
          <span className="artifactIdentity" aria-hidden="true">Memory held in place</span>
          <strong>Enter Replay</strong>
        </button>
      </section>

      <aside className="memoryMeaning" aria-label="Selected memory context">
        <p>Held in context. Nothing leaves this chamber.</p>
        <dl>
          <div><dt>Emotion</dt><dd>{memory.emotionalState}</dd></div>
          <div><dt>Place</dt><dd>{memory.place?.label ?? 'Not recorded'}</dd></div>
          <div><dt>People</dt><dd>{people || 'Not recorded'}</dd></div>
          <div><dt>Privacy</dt><dd>{memory.privacy}</dd></div>
        </dl>
      </aside>

      <button className="unwind" type="button" onClick={unwind}>← Life Map</button>
      <style>{focusCss}</style>
    </main>
  )
}

const stateCss = `.focusState{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background-image:linear-gradient(180deg,rgba(1,4,10,.68),rgba(1,4,10,.94)),${assetCssStack(focusAssets.primary)};background-size:cover;background-position:center;color:#fff}.focusState section{max-width:540px;text-align:center}.focusState button{min-width:48px;min-height:48px;margin-top:18px;padding:0 20px;border-radius:999px;border:1px solid #aeefff;background:#dffbff;color:#041019;font-weight:800}.focusState button:focus-visible{outline:3px solid #fff;outline-offset:4px}`

const focusCss = `.focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--memory-ground);isolation:isolate}.focusBackdrop{position:absolute;inset:-3%;z-index:-4;background-image:linear-gradient(90deg,rgba(1,4,10,.92) 0%,rgba(1,4,10,.72) 34%,rgba(1,4,10,.26) 62%,rgba(1,4,10,.58) 100%),linear-gradient(180deg,rgba(1,4,10,.14),rgba(1,4,10,.18) 48%,rgba(1,4,10,.9)),var(--memory-image),var(--focus-asset);background-size:cover;background-position:center;filter:saturate(1.12) contrast(1.08);transform:scale(1.035)}.focusFog{position:absolute;inset:0;z-index:-2;background:radial-gradient(circle at 69% 46%,color-mix(in srgb,var(--memory-accent) 19%,transparent),transparent 27%),radial-gradient(circle at 68% 48%,transparent 0 19%,rgba(1,4,10,.14) 41%,rgba(1,4,10,.72) 88%),linear-gradient(180deg,rgba(1,4,10,.06),rgba(1,4,10,.46) 78%,rgba(1,4,10,.9));pointer-events:none}.focusHeading{position:absolute;z-index:5;left:max(5vw,env(safe-area-inset-left));top:max(9svh,calc(env(safe-area-inset-top) + 42px));width:min(45vw,670px);text-shadow:0 6px 34px #000}.focusHeading>p{margin:0;color:var(--memory-light);font-size:11px;font-weight:900;letter-spacing:.26em;text-transform:uppercase}.focusHeading h1{max-width:9ch;margin:16px 0 10px;font:500 clamp(4rem,7.7vw,8.6rem)/.82 Georgia,serif;letter-spacing:-.065em;text-wrap:balance}.focusHeading>span{display:block;font-size:12px;letter-spacing:.08em;color:rgba(255,255,255,.72)}.focusNarration{max-width:520px;margin-top:clamp(22px,5vh,54px);padding:16px 18px;border-left:1px solid color-mix(in srgb,var(--memory-light) 58%,transparent);background:linear-gradient(90deg,rgba(2,7,12,.72),rgba(2,7,12,.08));backdrop-filter:blur(14px)}.focusNarration small{display:block;margin-bottom:7px;color:var(--memory-light);font-size:9px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.focusNarration strong{display:block;font:500 clamp(1.15rem,2.2vw,1.85rem)/1.28 Georgia,serif}.artifactStage{position:absolute;z-index:3;left:43vw;right:2vw;top:8svh;bottom:14svh;display:grid;place-items:center;perspective:1400px}.artifact{position:relative;width:min(44vw,570px);min-width:290px;min-height:52px;aspect-ratio:1;border:0;background:transparent;color:#fff;cursor:pointer;display:grid;place-items:center;overflow:visible}.artifact:focus-visible{outline:3px solid #fff;outline-offset:18px;border-radius:42%}.artifactImage{position:absolute;inset:4%;clip-path:polygon(50% 0%,61% 34%,98% 35%,68% 57%,79% 94%,50% 73%,21% 94%,32% 57%,2% 35%,39% 34%);background-image:linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.38)),var(--memory-image),var(--focus-asset),radial-gradient(circle,var(--memory-accent),#07131f 68%);background-size:cover;background-position:center;border:1px solid color-mix(in srgb,var(--memory-light) 66%,transparent);filter:saturate(1.08) contrast(1.06);box-shadow:0 0 150px color-mix(in srgb,var(--memory-accent) 36%,transparent),inset 0 0 120px rgba(0,0,0,.48);animation:artifactFloat 6s ease-in-out infinite alternate}.artifactImage::after{content:'';position:absolute;inset:0;background:linear-gradient(145deg,rgba(255,255,255,.2),transparent 22% 72%,rgba(255,255,255,.08));mix-blend-mode:screen}.artifactCore{position:absolute;width:16%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 7%,var(--memory-light) 18%,var(--memory-accent) 48%,transparent 72%);box-shadow:0 0 70px var(--memory-accent),0 0 140px color-mix(in srgb,var(--memory-accent) 48%,transparent)}.artifactIdentity{position:absolute;top:67%;padding:7px 12px;border-radius:999px;background:rgba(1,6,12,.64);color:rgba(255,255,255,.72);font-size:9px;font-weight:900;letter-spacing:.17em;text-transform:uppercase;backdrop-filter:blur(12px)}.artifact strong{position:absolute;bottom:-52px;min-width:170px;min-height:52px;display:grid;place-items:center;padding:0 24px;border-radius:999px;background:linear-gradient(135deg,color-mix(in srgb,var(--memory-light) 86%,white),color-mix(in srgb,var(--memory-accent) 70%,white));border:1px solid rgba(255,255,255,.72);box-shadow:0 18px 54px rgba(0,0,0,.42),0 0 36px color-mix(in srgb,var(--memory-accent) 24%,transparent);color:#031019;font-size:12px;font-weight:950;letter-spacing:.12em;text-transform:uppercase}.apertureOrbit{position:absolute;border:1px solid color-mix(in srgb,var(--memory-light) 36%,transparent);border-radius:50%;pointer-events:none}.apertureOrbitOuter{width:min(49vw,650px);aspect-ratio:1;box-shadow:0 0 70px color-mix(in srgb,var(--memory-accent) 16%,transparent)}.apertureOrbitInner{width:min(37vw,480px);aspect-ratio:1;border-color:color-mix(in srgb,var(--memory-accent) 42%,transparent);transform:rotate(22deg) scaleY(.72)}.memoryMeaning{position:absolute;z-index:6;left:max(5vw,env(safe-area-inset-left));bottom:max(5svh,calc(env(safe-area-inset-bottom) + 28px));width:min(520px,37vw);padding:14px 16px;border:1px solid color-mix(in srgb,var(--memory-light) 22%,transparent);border-radius:20px;background:linear-gradient(135deg,rgba(2,7,12,.8),rgba(2,7,12,.38));box-shadow:0 24px 80px rgba(0,0,0,.34);backdrop-filter:blur(18px)}.memoryMeaning p{margin:0 0 12px;font-size:12px;font-weight:800;color:rgba(255,255,255,.82)}.memoryMeaning dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0}.memoryMeaning dt{font-size:8px;text-transform:uppercase;letter-spacing:.15em;color:var(--memory-light)}.memoryMeaning dd{margin:3px 0 0;font-size:10px;line-height:1.35;color:rgba(255,255,255,.72)}.unwind{position:absolute;z-index:9;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));min-width:48px;min-height:48px;padding:0 18px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:850;backdrop-filter:blur(16px)}.unwind:focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes artifactFloat{to{transform:translateY(-12px) rotate(.7deg) scale(1.01)}}@media(max-width:900px){.focusHeading{left:22px;top:max(76px,calc(env(safe-area-inset-top) + 64px));width:min(54vw,500px)}.focusHeading h1{font-size:clamp(3.3rem,8vw,5.8rem)}.artifactStage{left:47vw}.memoryMeaning{left:22px;width:min(46vw,460px)}}@media(max-width:700px){.focusBackdrop{background-image:linear-gradient(180deg,rgba(1,4,10,.64),rgba(1,4,10,.2) 44%,rgba(1,4,10,.82) 78%,rgba(1,4,10,.98)),var(--memory-image),var(--focus-asset);background-position:center}.focusHeading{left:18px;right:18px;top:max(74px,calc(env(safe-area-inset-top) + 62px));width:auto}.focusHeading h1{max-width:10ch;margin:10px 0 7px;font-size:clamp(2.65rem,13vw,4.4rem);line-height:.86}.focusHeading>span{font-size:10px}.focusNarration{max-width:100%;margin-top:12px;padding:11px 13px}.focusNarration strong{font-size:1rem;line-height:1.22}.artifactStage{left:0;right:0;top:31svh;bottom:30svh}.artifact{width:min(74vw,340px);min-width:230px}.apertureOrbitOuter{width:min(80vw,370px)}.apertureOrbitInner{width:min(62vw,290px)}.artifact strong{bottom:-46px;min-width:154px;min-height:50px}.artifactIdentity{display:none}.memoryMeaning{left:14px;right:14px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 66px));width:auto;padding:10px 12px;border-radius:16px}.memoryMeaning p{margin-bottom:8px;font-size:10px}.memoryMeaning dl{grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}.memoryMeaning dt{font-size:7px}.memoryMeaning dd{font-size:8px}.unwind{right:14px;top:max(14px,env(safe-area-inset-top));min-height:46px}}@media(max-width:430px){.focusHeading h1{font-size:clamp(2.4rem,12vw,3.45rem)}.focusNarration strong{font-size:.92rem}.artifactStage{top:32svh;bottom:31svh}.artifact{width:min(70vw,300px)}.memoryMeaning dl{grid-template-columns:1fr 1fr}.memoryMeaning div:nth-child(n+3){display:none}}@media(max-height:720px){.focusHeading{top:max(58px,calc(env(safe-area-inset-top) + 46px))}.focusHeading h1{font-size:clamp(2.25rem,8vh,4.5rem)}.focusNarration{margin-top:10px}.artifactStage{top:27svh;bottom:30svh}.artifact{width:min(48vh,300px)}.memoryMeaning p{display:none}}@media(prefers-reduced-motion:reduce){.artifactImage{animation:none}}@media(forced-colors:active){.artifact strong,.unwind,.memoryMeaning,.focusNarration{forced-color-adjust:auto;border:2px solid CanvasText}.artifactImage{clip-path:none}}`
