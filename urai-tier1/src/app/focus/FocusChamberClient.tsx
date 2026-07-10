'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { assetCssStack, focusAssets, uiAssets } from '@/spatial/assets/uraiAssets'

const DEFAULT_MEMORY_ID = 'quiet-reset'
const DEFAULT_MANIFEST_ID = 'replay-recovery-thread'

function safeToken(value: string | null, fallback: string) {
  if (!value) return fallback
  const trimmed = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback
}

function readableName(value: string) {
  return value
    .replace(/[-_:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function FocusChamberClient() {
  const params = useSearchParams()
  const memoryId = safeToken(params.get('memoryId'), DEFAULT_MEMORY_ID)
  const manifestId = safeToken(params.get('manifestId'), DEFAULT_MANIFEST_ID)
  const node = safeToken(params.get('node'), memoryId)
  const memoryName = readableName(node)

  const replayHref = useMemo(() => {
    const next = new URLSearchParams()
    next.set('memoryId', memoryId)
    next.set('manifestId', manifestId)
    next.set('node', node)
    next.set('from', 'focus-camera')
    return `/replay?${next.toString()}`
  }, [manifestId, memoryId, node])

  const lifeMapHref = useMemo(() => {
    const next = new URLSearchParams()
    next.set('memoryId', memoryId)
    next.set('manifestId', manifestId)
    next.set('node', node)
    next.set('unwind', 'focus')
    return `/life-map?${next.toString()}`
  }, [manifestId, memoryId, node])

  const focusHref = useMemo(() => {
    const next = new URLSearchParams()
    next.set('memoryId', memoryId)
    next.set('manifestId', manifestId)
    next.set('node', node)
    return `/focus?${next.toString()}`
  }, [manifestId, memoryId, node])

  useEffect(() => {
    window.sessionStorage.setItem('urai-focus-memory-id', memoryId)
    window.sessionStorage.setItem('urai-focus-manifest-id', manifestId)
    window.sessionStorage.setItem('urai-focus-node', node)
  }, [manifestId, memoryId, node])

  return (
    <main
      className="focusMemorySurface"
      data-testid="urai-final-focus-chamber"
      data-route-polish="selected-memory-camera-chamber"
      data-canon="camera-from-life-map-no-avatar-orb"
      data-memory-id={memoryId}
      data-manifest-id={manifestId}
      data-node={node}
      style={{
        '--focus-route-art': assetCssStack(focusAssets.primary),
        '--focus-orb-art': assetCssStack(uiAssets.orbActive),
      } as React.CSSProperties}
    >
      <div className="focusVoid" aria-hidden="true" />
      <div className="focusCloud focusCloudA" aria-hidden="true" />
      <div className="focusCloud focusCloudB" aria-hidden="true" />
      <div className="focusDust" aria-hidden="true" />
      <span className="focusOrbEcho" aria-hidden="true" />

      <section className="focusStage">
        <div className="focusTitle">
          <p>URAI · Focus</p>
          <h1>Selected memory chamber.</h1>
          <span>The Life Map camera is inside one private star. Its identity remains attached while you move into Replay and return.</span>
          <div className="focusActions">
            <Link href={replayHref}>Camera into Replay</Link>
            <Link href={lifeMapHref}>Unwind to Life Map</Link>
          </div>
        </div>

        <aside className="focusPanel">
          <div className="focusCard" aria-label={`${memoryName} selected memory image`}>
            <div className="focusStar" aria-hidden="true"><span /></div>
          </div>
          <p>Memory readout</p>
          <h2>{memoryName}</h2>
          <span>Memory <code>{memoryId}</code> is bound to manifest <code>{manifestId}</code>. Replay receives the complete identity.</span>
          <div className="focusBeatRail">
            <span data-active="true">Private star selected</span>
            <span>Identity preserved</span>
            <span>Replay ready</span>
          </div>
        </aside>
      </section>

      <nav className="focusNav" aria-label="URAI memory route chain">
        <Link href={lifeMapHref}>Life Map</Link>
        <Link href={focusHref} data-active="true">Focus</Link>
        <Link href={replayHref}>Replay</Link>
        <Link href="/mirror">Mirror</Link>
        <Link href="/passport">Passport</Link>
      </nav>

      <style>{`
        .focusMemorySurface{position:relative;min-height:100svh;overflow:hidden;color:white;background:#000107;isolation:isolate}
        .focusMemorySurface:before{content:'';position:absolute;inset:-10vh -10vw;z-index:0;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.14),transparent 10rem),radial-gradient(circle at 31% 48%,rgba(80,228,255,.14),transparent 24rem),radial-gradient(circle at 72% 38%,rgba(178,94,255,.16),transparent 24rem),linear-gradient(180deg,#00020a 0%,#020411 56%,#000106 100%)}
        .focusVoid,.focusCloud,.focusDust{position:absolute;pointer-events:none}.focusVoid{inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,255,255,.05),transparent 34%),radial-gradient(ellipse at 42% 54%,rgba(80,228,255,.12),transparent 38%),radial-gradient(ellipse at 66% 42%,rgba(178,94,255,.13),transparent 38%)}
        .focusCloud{z-index:1;border-radius:999px;filter:blur(36px);opacity:.42}.focusCloudA{left:8%;top:24%;width:64vw;height:42vh;background:radial-gradient(ellipse,rgba(95,232,255,.28),rgba(95,232,255,.06) 48%,transparent 74%);transform:rotate(-8deg)}.focusCloudB{right:-6%;top:18%;width:60vw;height:46vh;background:radial-gradient(ellipse,rgba(210,126,255,.28),rgba(210,126,255,.06) 48%,transparent 74%);transform:rotate(9deg)}
        .focusDust{inset:-12%;z-index:2;opacity:.42;background-image:radial-gradient(circle,rgba(255,255,255,.84) 0 1px,transparent 1.24px),radial-gradient(circle,rgba(140,232,255,.64) 0 1px,transparent 1.2px);background-size:101px 101px,163px 163px;background-position:0 0,41px 62px}
        .focusStage{position:relative;z-index:10;min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,430px);align-items:center;gap:2rem;padding:5.5rem 2rem 7.5rem}.focusTitle,.focusPanel{border:1px solid rgba(255,255,255,.12);background:linear-gradient(145deg,rgba(0,0,0,.58),rgba(8,16,30,.34));box-shadow:0 28px 90px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.08);backdrop-filter:blur(20px);border-radius:2rem;padding:1rem}.focusTitle{max-width:540px}.focusTitle p,.focusPanel p{margin:0;color:rgba(165,243,252,.9);font-size:10px;font-weight:950;letter-spacing:.25em;text-transform:uppercase}.focusTitle h1{margin:.45rem 0 0;font-size:clamp(3.2rem,8vw,7.8rem);line-height:.8;letter-spacing:-.1em}.focusTitle span,.focusPanel>span{display:block;margin-top:.75rem;color:rgba(235,252,255,.78);font-size:.94rem;font-weight:750;line-height:1.5}.focusPanel h2{margin:.45rem 0 0;font-size:clamp(1.65rem,3vw,2.4rem)}
        .focusCard{position:relative;min-height:318px;margin-bottom:1rem;overflow:hidden;border:1px solid rgba(255,255,255,.12);border-radius:1.5rem;background:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.72)),var(--focus-route-art),radial-gradient(circle at 50% 36%,rgba(255,255,255,.24),transparent 16%),linear-gradient(135deg,#09131f,#17293b 42%,#3a2445 70%,#05080f);background-size:cover;background-position:center}.focusStar{position:absolute;left:50%;top:25%;width:180px;height:180px;transform:translate(-50%,-50%);border-radius:999px;background:radial-gradient(circle,rgba(255,255,255,.9) 0 3%,#9ff7ff 12%,rgba(159,247,255,.12) 34%,transparent 70%);filter:blur(4px);animation:focusBreath 4.6s ease-in-out infinite alternate}.focusStar span{position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);border-radius:999px;background:white;box-shadow:0 0 18px white,0 0 52px #7df8ff,0 0 120px rgba(125,248,255,.42)}
        .focusActions{display:flex;flex-wrap:wrap;gap:.55rem;margin-top:1rem}.focusActions a,.focusNav a{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:.72rem 1rem;background:rgba(255,255,255,.06);color:white;font-size:12px;font-weight:950;text-decoration:none}.focusActions a:first-child,.focusNav a[data-active='true']{background:rgba(207,250,254,.96);color:#020617}.focusBeatRail{display:grid;gap:.5rem;margin-top:1rem}.focusBeatRail span{border:1px solid rgba(255,255,255,.12);border-radius:1rem;background:rgba(255,255,255,.055);padding:.65rem .8rem;color:rgba(236,254,255,.84);font-size:12px;font-weight:900}.focusBeatRail span[data-active='true']{background:rgba(207,250,254,.92);color:#020617}.focusOrbEcho{position:absolute;right:1rem;top:1rem;z-index:30;width:58px;height:58px;border-radius:999px;background-image:var(--focus-orb-art);background-size:cover;box-shadow:0 0 60px rgba(103,232,249,.28)}
        .focusNav{position:fixed;left:50%;bottom:1rem;z-index:40;display:flex;max-width:calc(100vw - 1.5rem);transform:translateX(-50%);gap:.35rem;overflow-x:auto;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(0,0,0,.52);padding:.42rem;backdrop-filter:blur(18px)}.focusNav a{padding:.52rem .82rem;font-size:11px;white-space:nowrap}
        @keyframes focusBreath{from{transform:translate(-50%,-50%) scale(.9);opacity:.62}to{transform:translate(-50%,-50%) scale(1.1);opacity:.88}}
        @media(max-width:850px){.focusStage{grid-template-columns:1fr;padding:4.75rem .75rem 9rem;align-items:start}.focusTitle{max-width:330px}.focusTitle h1{font-size:2.6rem}.focusPanel{margin-top:min(33vh,240px)}.focusCard{min-height:230px}.focusOrbEcho{display:none}.focusNav{width:calc(100vw - 1rem);justify-content:flex-start;bottom:.75rem}}
        @media(prefers-reduced-motion:reduce){.focusStar{animation:none}}
      `}</style>
    </main>
  )
}
