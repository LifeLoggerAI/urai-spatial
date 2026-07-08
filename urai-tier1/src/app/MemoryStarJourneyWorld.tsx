'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { assetCssStack, focusAssets, lifeMapAssets, replayAssets, uiAssets } from '@/spatial/assets/uraiAssets'

type JourneyMode = 'life-map' | 'focus' | 'replay'

type Props = {
  mode: JourneyMode
}

const selectedMemory = {
  id: 'quiet-reset',
  title: 'The Quiet Reset',
  date: 'May 17, 2023',
  reason: 'The moment pressure became permission to begin again.',
}

const stars = [
  { id: 'seed-memory-bloom', label: 'Memory Bloom', x: '20%', y: '34%', size: 'small' },
  { id: 'quiet-reset', label: 'The Quiet Reset', x: '50%', y: '45%', size: 'hero' },
  { id: 'recovery-arc', label: 'Recovery Arc', x: '76%', y: '31%', size: 'small' },
  { id: 'threshold-storm', label: 'Threshold Storm', x: '31%', y: '68%', size: 'small' },
  { id: 'body-return', label: 'Body Return', x: '69%', y: '70%', size: 'small' },
] as const

function copyFor(mode: JourneyMode) {
  if (mode === 'focus') {
    return {
      eyebrow: 'URAI Focus',
      title: 'Inside the selected star',
      body: 'The camera has crossed the Life Map shell. The selected memory opens as a private Focus chamber.',
      status: 'Focus layer inside star',
    }
  }
  if (mode === 'replay') {
    return {
      eyebrow: 'URAI Replay',
      title: 'Memory film inside the star',
      body: 'Replay moves deeper through the same selected star, from chamber into living memory film.',
      status: 'Replay layer inside star',
    }
  }
  return {
    eyebrow: 'URAI Life Map',
    title: 'Life Map sky',
    body: 'The city stays below. Memory stars live above it. Select a star and the camera flies inside.',
    status: 'Life Map parent world',
  }
}

function StarField({ mode }: { mode: JourneyMode }) {
  return (
    <div className="msj-stars" aria-label="Life Map memory stars">
      <svg className="msj-lines" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M20 34 C34 28 41 37 50 45 C62 53 68 39 76 31" />
        <path d="M31 68 C39 60 44 51 50 45 C58 52 63 62 69 70" />
      </svg>
      {stars.map((star) => {
        const selected = star.id === selectedMemory.id
        return (
          <Link
            key={star.id}
            className="msj-star"
            data-selected={selected ? 'true' : 'false'}
            data-size={star.size}
            href={selected ? '/focus?manifestId=seed-memory-bloom&sourceStar=quiet-reset' : `/focus?manifestId=${star.id}`}
            style={{ left: star.x, top: star.y }}
            aria-label={`Enter memory star ${star.label}`}
          >
            <span className="msj-star-halo" />
            <span className="msj-star-core" />
            <span className="msj-star-label">{star.label}</span>
          </Link>
        )
      })}
      <div className="msj-flight-path" data-active={mode !== 'life-map' ? 'true' : 'false'} />
    </div>
  )
}

function MemoryLayer({ mode }: { mode: JourneyMode }) {
  if (mode === 'life-map') return null
  const replay = mode === 'replay'
  return (
    <section className="msj-memory-layer" data-replay={replay ? 'true' : 'false'} aria-label={replay ? 'Replay inside selected memory star' : 'Focus inside selected memory star'}>
      <div className="msj-memory-glass" />
      <div className="msj-memory-copy">
        <p>{replay ? 'Memory film' : 'Selected memory'}</p>
        <h2>{selectedMemory.title}</h2>
        <span>{replay ? 'The film opens deeper inside the same star.' : `${selectedMemory.date} · ${selectedMemory.reason}`}</span>
        <div>
          {replay ? <Link href="/focus?manifestId=seed-memory-bloom&from=replay">Back to Focus</Link> : <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=star-focus">Enter Replay</Link>}
          <Link href="/life-map?returnFrom=memory-star">Back to Life Map</Link>
        </div>
      </div>
    </section>
  )
}

export default function MemoryStarJourneyWorld({ mode }: Props) {
  const current = copyFor(mode)

  return (
    <main
      className="msj-root"
      data-mode={mode}
      data-selected-memory-id={selectedMemory.id}
      data-world-state={mode === 'life-map' ? 'lifeMapIdle' : mode === 'focus' ? 'focusActive' : 'replayActive'}
      style={{
        '--life-map-art': assetCssStack(lifeMapAssets.primary),
        '--focus-art': assetCssStack(focusAssets.primary),
        '--replay-art': assetCssStack(replayAssets.primary),
        '--orb-art': assetCssStack(uiAssets.orbActive),
      } as CSSProperties}
      aria-label="URAI shared Life Map Focus Replay memory world"
    >
      <div className="msj-bg" aria-hidden="true" />
      <div className="msj-city" aria-hidden="true" />
      <div className="msj-dust" aria-hidden="true" />
      <StarField mode={mode} />
      <div className="msj-selected-shell" aria-hidden="true"><i /></div>
      <MemoryLayer mode={mode} />

      <header className="msj-card msj-hero">
        <p>{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <span>{current.body}</span>
        <div>
          {mode === 'life-map' ? <Link className="primary" href="/focus?manifestId=seed-memory-bloom&sourceStar=quiet-reset">Enter selected star</Link> : null}
          {mode === 'focus' ? <Link className="primary" href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=star-focus">Enter Replay</Link> : null}
          {mode === 'replay' ? <Link className="primary" href="/focus?manifestId=seed-memory-bloom&from=replay">Back to Focus</Link> : null}
          <Link href="/home">Home</Link>
        </div>
      </header>

      <aside className="msj-status">{current.status}</aside>
      <nav className="msj-rail" aria-label="URAI memory journey routes">
        <Link href="/life-map">Life Map</Link>
        <Link href="/focus?manifestId=seed-memory-bloom">Focus</Link>
        <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread">Replay</Link>
        <Link href="/ground">Ground</Link>
        <Link href="/home">Home</Link>
      </nav>

      <style jsx>{`
        .msj-root{position:fixed;inset:0;overflow:hidden;background:#020611;color:#f8fbff;isolation:isolate;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
        .msj-bg{position:absolute;inset:-4%;z-index:0;background:linear-gradient(180deg,rgba(1,3,10,.08),rgba(1,3,10,.52) 56%,rgba(1,3,10,.94)),var(--life-map-art),radial-gradient(circle at 50% 38%,rgba(103,232,249,.22),transparent 25%),linear-gradient(180deg,#020611,#030817);background-size:cover,cover,auto,auto;background-position:center;filter:saturate(.98) brightness(.8)}
        .msj-root[data-mode='focus'] .msj-bg{background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.62)),var(--focus-art),linear-gradient(180deg,#020611,#030817);background-size:cover;background-position:center;filter:saturate(.9) brightness(.75)}
        .msj-root[data-mode='replay'] .msj-bg{background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.72)),var(--replay-art),linear-gradient(180deg,#020611,#030817);background-size:cover;background-position:center;filter:saturate(.9) brightness(.75)}
        .msj-city{position:absolute;left:0;right:0;bottom:0;z-index:1;height:28vh;background:linear-gradient(180deg,transparent,rgba(2,6,17,.84)),linear-gradient(90deg,transparent 0 8%,rgba(8,20,34,.84) 8% 12%,transparent 12% 16%,rgba(8,20,34,.72) 16% 21%,transparent 21% 27%,rgba(8,20,34,.92) 27% 33%,transparent 33% 39%,rgba(8,20,34,.75) 39% 45%,transparent 45% 52%,rgba(8,20,34,.86) 52% 59%,transparent 59% 66%,rgba(8,20,34,.72) 66% 72%,transparent 72% 78%,rgba(8,20,34,.84) 78% 84%,transparent 84% 100%);opacity:.58}.msj-dust{position:absolute;inset:-8%;z-index:2;opacity:.5;background-image:radial-gradient(circle,rgba(255,255,255,.62) 0 1px,transparent 1.25px),radial-gradient(circle,rgba(103,232,249,.46) 0 1px,transparent 1.15px);background-size:110px 110px,180px 180px;background-position:0 0,42px 70px}
        .msj-stars{position:absolute;inset:0;z-index:5}.msj-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;opacity:.7}.msj-lines path{fill:none;stroke:rgba(103,232,249,.38);stroke-width:.13;filter:drop-shadow(0 0 10px rgba(103,232,249,.5))}.msj-star{position:absolute;z-index:7;width:22px;height:22px;transform:translate(-50%,-50%);border-radius:999px;color:#eef6ff;text-decoration:none}.msj-star[data-size='hero']{width:38px;height:38px}.msj-star-core,.msj-star-halo{position:absolute;inset:0;border-radius:999px}.msj-star-core{background:radial-gradient(circle,white 0 19%,#dffcff 21% 43%,#67e8f9 45% 65%,transparent 68%);box-shadow:0 0 24px white,0 0 70px #67e8f9,0 0 150px rgba(103,232,249,.44)}.msj-star-halo{inset:-34px;background:radial-gradient(circle,rgba(103,232,249,.34),transparent 66%);animation:msjPulse 3s ease-in-out infinite}.msj-star[data-selected='true'] .msj-star-halo{inset:-118px;opacity:.9}.msj-star-label{position:absolute;left:34px;top:50%;min-width:132px;transform:translateY(-50%);padding:7px 10px;border:1px solid rgba(160,220,255,.2);border-radius:999px;background:rgba(2,8,24,.64);font-size:11px;font-weight:850;opacity:.78;backdrop-filter:blur(14px)}.msj-star:not([data-selected='true']) .msj-star-label{opacity:0}.msj-star:hover .msj-star-label{opacity:1}
        .msj-root[data-mode='focus'] .msj-stars{transform:scale(1.7);opacity:.38;filter:blur(.3px)}.msj-root[data-mode='replay'] .msj-stars{transform:scale(2.25);opacity:.2;filter:blur(.7px)}.msj-flight-path{position:absolute;left:50%;top:45%;width:2px;height:32vh;background:linear-gradient(180deg,rgba(103,232,249,.75),transparent);transform-origin:top;transform:rotate(8deg);opacity:.42}.msj-flight-path[data-active='true']{opacity:.78}
        .msj-selected-shell{position:absolute;left:50%;top:45%;z-index:8;width:300px;height:300px;transform:translate(-50%,-50%) scale(.55);border:1px solid rgba(210,250,255,.25);border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.14),rgba(103,232,249,.08) 38%,transparent 70%);box-shadow:0 0 120px rgba(103,232,249,.3);opacity:.86}.msj-selected-shell i{position:absolute;inset:42px;border:1px solid rgba(255,255,255,.22);border-radius:999px}.msj-root[data-mode='focus'] .msj-selected-shell{transform:translate(-50%,-50%) scale(1.08)}.msj-root[data-mode='replay'] .msj-selected-shell{transform:translate(-50%,-50%) scale(1.46);opacity:.55}
        .msj-memory-layer{position:absolute;left:50%;top:51%;z-index:12;width:min(720px,calc(100vw - 44px));height:min(460px,62vh);transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.16);border-radius:32px;overflow:hidden;background:linear-gradient(180deg,rgba(0,0,0,.04),rgba(0,0,0,.72)),var(--focus-art);background-size:cover;background-position:center;box-shadow:0 40px 150px rgba(0,0,0,.56),inset 0 0 120px rgba(255,255,255,.08)}.msj-memory-layer[data-replay='true']{background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.76)),var(--replay-art);background-size:cover;background-position:center}.msj-memory-glass{position:absolute;inset:0;background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.28),transparent 16%),radial-gradient(circle at 50% 68%,rgba(103,232,249,.24),transparent 42%)}.msj-memory-copy{position:absolute;left:18px;right:18px;bottom:18px;padding:16px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(2,8,24,.6);backdrop-filter:blur(16px)}.msj-memory-copy p{margin:0 0 6px;color:#fde68a;font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:900}.msj-memory-copy h2{margin:0;font-size:clamp(24px,4vw,44px);line-height:.94}.msj-memory-copy span{display:block;margin-top:8px;color:rgba(235,244,255,.72);font-size:13px;line-height:1.4}.msj-memory-copy div{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.msj-memory-copy a{border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:9px 12px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font-size:12px;font-weight:900}.msj-memory-copy a:first-child{background:#fde68a;color:#1f1500}
        .msj-card,.msj-status,.msj-rail{position:absolute;z-index:20;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.56),rgba(10,9,31,.32));box-shadow:0 24px 90px rgba(0,0,0,.3);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.msj-hero{left:22px;top:22px;width:min(352px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}.msj-hero p{margin:0 0 8px;color:rgba(186,230,253,.7);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:900}.msj-hero h1{margin:0 0 8px;font-size:clamp(30px,3.6vw,48px);line-height:.94;font-weight:950;letter-spacing:-.045em}.msj-hero span{display:block;color:rgba(235,244,255,.7);line-height:1.45;font-size:13px}.msj-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.msj-hero a,.msj-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}.msj-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}.msj-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.msj-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}.msj-rail a{white-space:nowrap;font-size:12px;font-weight:850;letter-spacing:.04em;padding:8px 11px}
        @keyframes msjPulse{from{transform:scale(.8);opacity:.62}to{transform:scale(1.22);opacity:.16}}
        @media(max-width:760px){.msj-hero{left:14px;right:14px;top:14px;width:auto}.msj-status{display:none}.msj-memory-layer{top:56%;height:52vh}.msj-star-label{display:none}.msj-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
