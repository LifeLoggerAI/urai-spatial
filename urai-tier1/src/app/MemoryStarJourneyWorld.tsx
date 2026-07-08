'use client'

import Link from 'next/link'
import { assetCssStack, focusAssets, replayAssets, uiAssets } from '@/spatial/assets/uraiAssets'

type JourneyMode = 'life-map' | 'focus' | 'replay'

type Props = {
  mode: JourneyMode
}

const memory = {
  id: 'quiet-reset',
  title: 'The Quiet Reset',
  date: 'May 17, 2023',
  reason: 'The moment pressure became permission to begin again.',
}

function modeCopy(mode: JourneyMode) {
  if (mode === 'focus') {
    return {
      eyebrow: 'URAI Focus',
      title: 'Inside the selected star',
      body: 'Focus is the first layer inside the Life Map memory star. The constellation remains outside the shell.',
      status: 'Focus shell active',
    }
  }
  if (mode === 'replay') {
    return {
      eyebrow: 'URAI Replay',
      title: 'Deeper in the memory thread',
      body: 'Replay pushes through the same star, from the Focus shell into the living memory film.',
      status: 'Replay layer inside star',
    }
  }
  return {
    eyebrow: 'URAI Life Map',
    title: 'Select a memory star',
    body: 'The sky is the parent world. Stars are memories. Choose one and the camera enters it.',
    status: 'Life Map parent world',
  }
}

function JourneyStars({ mode }: { mode: JourneyMode }) {
  const stars = [
    ['seed-memory-bloom', 'Memory Bloom', '14%', '30%', 'small'],
    ['quiet-reset', 'The Quiet Reset', '50%', '43%', 'selected'],
    ['recovery-arc', 'Recovery Arc', '76%', '32%', 'small'],
    ['threshold-storm', 'Threshold Storm', '31%', '67%', 'small'],
    ['body-return', 'Body Return', '68%', '69%', 'small'],
  ] as const

  return (
    <div className="msj-stars" aria-label="Life Map memory stars">
      {stars.map(([id, label, left, top, variant]) => {
        const selected = id === memory.id
        return (
          <Link
            key={id}
            className="msj-star"
            data-selected={selected ? 'true' : 'false'}
            data-variant={variant}
            href={selected ? '/focus?manifestId=seed-memory-bloom&sourceStar=quiet-reset' : `/focus?manifestId=${id}`}
            style={{ left, top }}
            aria-label={`Enter memory star ${label}`}
          >
            <span className="msj-star-pulse" />
            <span className="msj-star-core" />
            <span className="msj-star-label">{label}</span>
          </Link>
        )
      })}
      <svg className="msj-lines" viewBox="0 0 100 100" aria-hidden="true">
        <path d="M14 30 C32 24 39 35 50 43 C62 50 68 40 76 32" />
        <path d="M31 67 C40 60 44 50 50 43 C57 50 62 60 68 69" />
      </svg>
      <div className="msj-camera-path" />
    </div>
  )
}

function FocusLayer({ mode }: { mode: JourneyMode }) {
  if (mode === 'life-map') return null
  const replay = mode === 'replay'
  return (
    <section className="msj-memory-layer" data-replay={replay ? 'true' : 'false'} aria-label={replay ? 'Replay inside selected memory star' : 'Focus inside selected memory star'}>
      <div className="msj-memory-art" />
      <div className="msj-memory-copy">
        <p>{replay ? 'Memory film' : 'Selected memory'}</p>
        <h2>{memory.title}</h2>
        <span>{replay ? 'Replay is the inner thread behind the Focus shell.' : `${memory.date} · ${memory.reason}`}</span>
        <div>
          {replay ? <Link href="/focus?manifestId=seed-memory-bloom&from=replay">Back to Focus</Link> : <Link href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=star-focus">Enter Replay</Link>}
          <Link href="/life-map?returnFrom=memory-star">Back to Life Map</Link>
        </div>
      </div>
    </section>
  )
}

export default function MemoryStarJourneyWorld({ mode }: Props) {
  const current = modeCopy(mode)
  return (
    <main
      className="msj-root"
      data-mode={mode}
      data-selected-memory-id={memory.id}
      data-world-state={mode === 'life-map' ? 'lifeMapIdle' : mode === 'focus' ? 'focusActive' : 'replayActive'}
      style={{
        '--focus-art': assetCssStack(focusAssets.primary),
        '--replay-art': assetCssStack(replayAssets.primary),
        '--orb-art': assetCssStack(uiAssets.orbActive),
      } as React.CSSProperties}
      aria-label="URAI shared Life Map Focus Replay memory world"
    >
      <div className="msj-bg" aria-hidden="true" />
      <div className="msj-city-horizon" aria-hidden="true" />
      <JourneyStars mode={mode} />
      <div className="msj-portal" aria-hidden="true"><i /></div>
      <FocusLayer mode={mode} />

      <header className="msj-card msj-hero">
        <p>{current.eyebrow}</p>
        <h1>{current.title}</h1>
        <span>{current.body}</span>
        <div>
          {mode === 'life-map' ? <Link className="primary" href="/focus?manifestId=seed-memory-bloom&sourceStar=quiet-reset">Enter selected star</Link> : null}
          {mode === 'focus' ? <Link className="primary" href="/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread&from=star-focus">Enter Replay</Link> : null}
          {mode === 'replay' ? <Link className="primary" href="/focus?manifestId=seed-memory-bloom&from=replay">Back to Focus</Link> : null}
          <Link href="/life-map">Life Map</Link>
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
        .msj-bg{position:absolute;inset:-8%;z-index:0;background:radial-gradient(circle at 50% 46%,rgba(103,232,249,.18),transparent 18%),radial-gradient(circle at 58% 38%,rgba(167,139,250,.18),transparent 28%),linear-gradient(180deg,#020611,#030817 48%,#01030a);transform:scale(1)}
        .msj-root[data-mode='focus'] .msj-bg{background:radial-gradient(circle at 50% 43%,rgba(255,255,255,.22),transparent 13%),var(--focus-art),linear-gradient(180deg,#020611,#030817 48%,#01030a);background-size:cover;background-position:center;filter:saturate(.85) brightness(.72)}
        .msj-root[data-mode='replay'] .msj-bg{background:linear-gradient(180deg,rgba(0,0,0,.18),rgba(0,0,0,.7)),var(--replay-art),linear-gradient(180deg,#020611,#030817);background-size:cover;background-position:center;filter:saturate(.9) brightness(.72)}
        .msj-city-horizon{position:absolute;left:0;right:0;bottom:0;height:30vh;z-index:1;background:linear-gradient(180deg,transparent,rgba(2,6,17,.8)),linear-gradient(90deg,transparent 0 8%,rgba(8,20,34,.82) 8% 12%,transparent 12% 16%,rgba(8,20,34,.72) 16% 21%,transparent 21% 27%,rgba(8,20,34,.9) 27% 33%,transparent 33% 39%,rgba(8,20,34,.75) 39% 45%,transparent 45% 52%,rgba(8,20,34,.86) 52% 59%,transparent 59% 66%,rgba(8,20,34,.7) 66% 72%,transparent 72% 78%,rgba(8,20,34,.82) 78% 84%,transparent 84% 100%);opacity:.55}
        .msj-stars{position:absolute;inset:0;z-index:5;transform:translateZ(0)}
        .msj-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;opacity:.44}.msj-lines path{fill:none;stroke:rgba(103,232,249,.34);stroke-width:.12;filter:drop-shadow(0 0 8px rgba(103,232,249,.45))}
        .msj-star{position:absolute;z-index:7;width:18px;height:18px;transform:translate(-50%,-50%);border-radius:999px;color:#eef6ff;text-decoration:none}.msj-star-core,.msj-star-pulse{position:absolute;inset:0;border-radius:999px}.msj-star-core{background:radial-gradient(circle,white 0 22%,#bffcff 24% 50%,#67e8f9 52%,transparent 72%);box-shadow:0 0 18px white,0 0 54px #67e8f9}.msj-star-pulse{inset:-32px;background:radial-gradient(circle,rgba(103,232,249,.28),transparent 64%);animation:msjPulse 3s ease-in-out infinite}.msj-star-label{position:absolute;left:26px;top:50%;min-width:118px;transform:translateY(-50%);padding:6px 8px;border:1px solid rgba(160,220,255,.16);border-radius:999px;background:rgba(2,8,24,.55);font-size:11px;font-weight:850;opacity:0;transition:.25s}.msj-star:hover .msj-star-label,.msj-star[data-selected='true'] .msj-star-label{opacity:1}.msj-star[data-selected='true']{width:28px;height:28px}.msj-star[data-selected='true'] .msj-star-pulse{inset:-84px;opacity:.78}
        .msj-root[data-mode='focus'] .msj-stars,.msj-root[data-mode='replay'] .msj-stars{transform:scale(1.9);opacity:.42;filter:blur(.2px)}.msj-root[data-mode='replay'] .msj-stars{transform:scale(2.4);opacity:.22}
        .msj-camera-path{position:absolute;left:50%;top:43%;width:2px;height:32vh;background:linear-gradient(180deg,rgba(103,232,249,.75),transparent);transform-origin:top;transform:rotate(8deg);opacity:.34}
        .msj-portal{position:absolute;left:50%;top:43%;z-index:8;width:260px;height:260px;transform:translate(-50%,-50%) scale(.4);border:1px solid rgba(210,250,255,.25);border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.18),rgba(103,232,249,.08) 38%,transparent 70%);box-shadow:0 0 100px rgba(103,232,249,.28);opacity:.65}.msj-portal i{position:absolute;inset:38px;border:1px solid rgba(255,255,255,.22);border-radius:999px}.msj-root[data-mode='focus'] .msj-portal{transform:translate(-50%,-50%) scale(1.05);opacity:.9}.msj-root[data-mode='replay'] .msj-portal{transform:translate(-50%,-50%) scale(1.42);opacity:.5}
        .msj-memory-layer{position:absolute;left:50%;top:51%;z-index:12;width:min(690px,calc(100vw - 44px));height:min(440px,62vh);transform:translate(-50%,-50%);border:1px solid rgba(255,255,255,.16);border-radius:32px;overflow:hidden;background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.72)),var(--focus-art);background-size:cover;background-position:center;box-shadow:0 40px 150px rgba(0,0,0,.56),inset 0 0 120px rgba(255,255,255,.08)}.msj-memory-layer[data-replay='true']{background:linear-gradient(180deg,rgba(0,0,0,.1),rgba(0,0,0,.72)),var(--replay-art);background-size:cover;background-position:center}.msj-memory-art{position:absolute;inset:0;background:radial-gradient(circle at 50% 34%,rgba(255,255,255,.28),transparent 16%),radial-gradient(circle at 50% 68%,rgba(103,232,249,.24),transparent 42%)}.msj-memory-copy{position:absolute;left:18px;right:18px;bottom:18px;padding:16px;border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(2,8,24,.58);backdrop-filter:blur(16px)}.msj-memory-copy p{margin:0 0 6px;color:#fde68a;font-size:10px;letter-spacing:.2em;text-transform:uppercase;font-weight:900}.msj-memory-copy h2{margin:0;font-size:clamp(24px,4vw,44px);line-height:.94}.msj-memory-copy span{display:block;margin-top:8px;color:rgba(235,244,255,.72);font-size:13px;line-height:1.4}.msj-memory-copy div{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}.msj-memory-copy a{border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:9px 12px;background:rgba(255,255,255,.07);color:#fff;text-decoration:none;font-size:12px;font-weight:900}.msj-memory-copy a:first-child{background:#fde68a;color:#1f1500}
        .msj-card,.msj-status,.msj-rail{position:absolute;z-index:20;border:1px solid rgba(160,220,255,.15);background:linear-gradient(145deg,rgba(2,8,24,.56),rgba(10,9,31,.32));box-shadow:0 24px 90px rgba(0,0,0,.3);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}.msj-hero{left:22px;top:22px;width:min(352px,calc(100vw - 44px));padding:16px 18px;border-radius:26px}.msj-hero p{margin:0 0 8px;color:rgba(186,230,253,.7);font-size:10px;letter-spacing:.22em;text-transform:uppercase;font-weight:900}.msj-hero h1{margin:0 0 8px;font-size:clamp(30px,3.6vw,48px);line-height:.94;font-weight:950;letter-spacing:-.045em}.msj-hero span{display:block;color:rgba(235,244,255,.7);line-height:1.45;font-size:13px}.msj-hero div{display:flex;gap:9px;flex-wrap:wrap;margin-top:15px}.msj-hero a,.msj-rail a{border:1px solid rgba(160,220,255,.2);border-radius:999px;padding:9px 12px;color:#eef6ff;text-decoration:none;background:rgba(2,8,24,.46)}.msj-hero a.primary{background:linear-gradient(135deg,rgba(103,232,249,.94),rgba(167,139,250,.88));color:#03101f;font-weight:900}.msj-status{right:22px;top:22px;padding:10px 13px;border-radius:999px;color:rgba(226,246,255,.78);font-size:11px;letter-spacing:.12em;text-transform:uppercase}.msj-rail{left:50%;bottom:18px;display:flex;gap:6px;max-width:calc(100vw - 32px);padding:7px;transform:translateX(-50%);overflow-x:auto;border-radius:999px}.msj-rail a{white-space:nowrap;font-size:12px;font-weight:850;letter-spacing:.04em;padding:8px 11px}
        @keyframes msjPulse{from{transform:scale(.8);opacity:.55}to{transform:scale(1.2);opacity:.18}}
        @media(max-width:760px){.msj-hero{left:14px;right:14px;top:14px;width:auto}.msj-status{display:none}.msj-memory-layer{top:56%;height:52vh}.msj-star-label{display:none}.msj-rail{bottom:12px}}
      `}</style>
    </main>
  )
}
