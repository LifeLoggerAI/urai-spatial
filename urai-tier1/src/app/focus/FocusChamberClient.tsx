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
  return value.replace(/[-_:]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function FocusChamberClient() {
  const params = useSearchParams()
  const memoryId = safeToken(params?.get('memoryId'), DEFAULT_MEMORY_ID)
  const manifestId = safeToken(params?.get('manifestId'), DEFAULT_MANIFEST_ID)
  const node = safeToken(params?.get('node'), memoryId)
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

  useEffect(() => {
    window.sessionStorage.setItem('urai-focus-memory-id', memoryId)
    window.sessionStorage.setItem('urai-focus-manifest-id', manifestId)
  }, [manifestId, memoryId])

  return (
    <div
      className="focusMemorySurface"
      data-testid="urai-final-focus-chamber"
      data-route-polish="selected-memory-camera-chamber"
      data-canon="camera-from-life-map-no-avatar-orb"
      data-memory-id={memoryId}
      data-manifest-id={manifestId}
      style={{ '--focus-route-art': assetCssStack(focusAssets.primary), '--focus-orb-art': assetCssStack(uiAssets.orbActive) } as React.CSSProperties}
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
          <div className="focusCard" aria-label={`${memoryName} selected memory image`}><div className="focusStar" aria-hidden="true"><span /></div></div>
          <p>Memory readout</p>
          <h2>{memoryName}</h2>
          <span>Memory <code>{memoryId}</code> is bound to manifest <code>{manifestId}</code>. Replay receives both identifiers.</span>
        </aside>
      </section>
      <nav className="focusNav" aria-label="URAI memory route chain">
        <Link href={lifeMapHref}>Life Map</Link>
        <Link href={`/focus?memoryId=${encodeURIComponent(memoryId)}&manifestId=${encodeURIComponent(manifestId)}&node=${encodeURIComponent(node)}`} data-active="true">Focus</Link>
        <Link href={replayHref}>Replay</Link>
        <Link href="/mirror">Mirror</Link>
        <Link href="/passport">Passport</Link>
      </nav>
      <style>{`
        .focusMemorySurface{position:relative;min-height:100svh;overflow:hidden;color:white;background:#000107;isolation:isolate}
        .focusMemorySurface:before{content:'';position:absolute;inset:-10vh -10vw;z-index:0;background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.14),transparent 10rem),radial-gradient(circle at 31% 48%,rgba(80,228,255,.14),transparent 24rem),radial-gradient(circle at 72% 38%,rgba(178,94,255,.16),transparent 24rem),linear-gradient(180deg,#00020a 0%,#020411 56%,#000106 100%)}
        .focusVoid,.focusCloud,.focusDust{position:absolute;pointer-events:none}.focusVoid{inset:0}.focusCloud{z-index:1;border-radius:999px;filter:blur(36px);opacity:.42}.focusCloudA{left:8%;top:24%;width:64vw;height:42vh;background:radial-gradient(ellipse,rgba(95,232,255,.28),rgba(95,232,255,.06) 48%,transparent 74%)}.focusCloudB{right:-6%;top:18%;width:60vw;height:46vh;background:radial-gradient(ellipse,rgba(210,126,255,.28),rgba(210,126,255,.06) 48%,transparent 74%)}
        .focusDust{inset:-12%;z-index:2;opacity:.42;background-image:radial-gradient(circle,rgba(255,255,255,.84) 0 1px,transparent 1.24px);background-size:101px 101px}
        .focusStage{position:relative;z-index:10;min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,430px);align-items:center;gap:2rem;padding:5.5rem 2rem 7.5rem}.focusTitle,.focusPanel{border:1px solid rgba(255,255,255,.12);background:rgba(5,10,22,.55);backdrop-filter:blur(20px);border-radius:2rem;padding:1rem}.focusTitle{max-width:540px}.focusTitle h1{margin:.45rem 0 0;font-size:clamp(3.2rem,8vw,7.8rem);line-height:.8}.focusCard{position:relative;min-height:318px;margin-bottom:1rem;border-radius:1.5rem;background:var(--focus-route-art),linear-gradient(135deg,#09131f,#17293b);background-size:cover;background-position:center}.focusActions,.focusNav{display:flex;gap:.55rem}.focusActions a,.focusNav a{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:.72rem 1rem;background:rgba(255,255,255,.06);color:white;text-decoration:none}.focusNav{position:fixed;left:50%;bottom:1rem;z-index:40;transform:translateX(-50%);background:rgba(0,0,0,.52);padding:.42rem;backdrop-filter:blur(18px)}
        @media(max-width:850px){.focusStage{grid-template-columns:1fr;padding:4.75rem .75rem 9rem}.focusNav{width:calc(100vw - 1rem);overflow-x:auto}}
      `}</style>
    </div>
  )
}
