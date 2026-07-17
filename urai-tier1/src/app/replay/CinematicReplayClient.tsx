'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildMemoryMorphology } from '@/spatial/memory/memoryMorphology'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { ReplayMetaPanel } from '@/spatial/replay/ReplayMetaPanel'
import { ReplayTimeline } from '@/spatial/replay/ReplayTimeline'
import { ReplayPhaseRings } from '@/spatial/replay/ReplayPhaseRings'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import {
  REPLAY_DURATION_MS,
  getReplayPhaseDefinition,
  getReplaySegmentAt,
  resolveReplayPhase,
  clampReplayProgress,
} from '@/spatial/scene/replayState'

const DEFAULT_REPLAY_MANIFEST_ID = 'seed-memory-bloom'
const DEFAULT_MEMORY_ID = 'quiet-reset'

function safeToken(value: string | null | undefined, fallback: string) {
  if (!value) return fallback
  const trimmed = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(trimmed) ? trimmed : fallback
}

function nodeNameFromParams(value: string | null | undefined) {
  if (!value) return 'Evening Pattern'
  return value.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function focusReturnUrl(memoryId: string, manifestId: string, node: string) {
  const next = new URLSearchParams()
  next.set('memoryId', memoryId)
  next.set('manifestId', manifestId)
  next.set('node', node)
  next.set('unwind', 'replay')
  return `/focus?${next.toString()}`
}

export default function CinematicReplayClient() {
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const [identity, setIdentity] = useState(() => ({ memoryId: DEFAULT_MEMORY_ID, manifestId: DEFAULT_REPLAY_MANIFEST_ID, node: DEFAULT_MEMORY_ID }))
  const { memoryId, manifestId, node } = identity
  const nodeName = nodeNameFromParams(node)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const nextMemoryId = safeToken(params.get('memoryId'), DEFAULT_MEMORY_ID)
    const nextManifestId = safeToken(params.get('manifestId'), DEFAULT_REPLAY_MANIFEST_ID)
    const nextNode = safeToken(params.get('node'), nextMemoryId)
    setIdentity({ memoryId: nextMemoryId, manifestId: nextManifestId, node: nextNode })
  }, [])

  const morphology = useMemo(() => buildMemoryMorphology(null, 'mirror'), [])
  const activeSegment = getReplaySegmentAt(progressMs)
  const replayPhase = resolveReplayPhase({
    mode: 'replay',
    hasReplayTarget: true,
    isManifestLoading: false,
    isGateLoading: false,
    isGateBlocked: false,
    isPlaying: playing,
    isScrubbing: scrubbing,
    progressMs,
  })
  const phaseDefinition = getReplayPhaseDefinition(replayPhase)
  const progressPercent = (clampReplayProgress(progressMs) / REPLAY_DURATION_MS) * 100

  const returnToFocus = useCallback(() => {
    const target = focusReturnUrl(memoryId, manifestId, node)
    window.sessionStorage.setItem('urai-replay-return-memory-id', memoryId)
    window.sessionStorage.setItem('urai-replay-return-manifest-id', manifestId)
    window.sessionStorage.setItem('urai-replay-return-node', node)
    window.history.pushState(null, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
    window.setTimeout(() => {
      if (window.location.pathname !== '/focus' || window.location.search !== target.slice('/focus'.length)) window.location.assign(target)
    }, 80)
  }, [manifestId, memoryId, node])

  const scrubTo = useCallback((nextProgressMs: number) => {
    const next = clampReplayProgress(nextProgressMs)
    setProgressMs(next)
    if (next >= REPLAY_DURATION_MS) setPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    setPlaying((current) => {
      if (!current && progressMs >= REPLAY_DURATION_MS) setProgressMs(0)
      return !current
    })
  }, [progressMs])

  useEffect(() => {
    if (!playing || scrubbing) return
    const interval = window.setInterval(() => {
      setProgressMs((current) => {
        const next = clampReplayProgress(current + (reducedMotion ? 250 : 120))
        if (next >= REPLAY_DURATION_MS) {
          window.clearInterval(interval)
          setPlaying(false)
        }
        return next
      })
    }, reducedMotion ? 250 : 120)
    return () => window.clearInterval(interval)
  }, [playing, reducedMotion, scrubbing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        returnToFocus()
        return
      }
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    document.addEventListener('keydown', onKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', onKey, { capture: true })
      document.removeEventListener('keydown', onKey, { capture: true })
    }
  }, [returnToFocus, togglePlay])

  return (
    <main
      className="replayWorld"
      data-testid="cinematic-replay-client"
      data-mode="replay"
      data-memory-id={memoryId}
      data-manifest-id={manifestId}
      data-node={node}
      data-replay-phase={replayPhase}
      data-playing={playing ? 'true' : 'false'}
      data-replay-segment={activeSegment.id}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      data-canonical-asset={replayAssets.primary.src}
      style={{ '--replay-route-art': assetCssStack(replayAssets.primary), '--replay-progress': `${progressPercent}%` } as React.CSSProperties}
    >
      <div className="replayEntryVeil" aria-hidden="true" />
      <div className="replayWorldArt" aria-hidden="true" />
      <div className="replayWorldDepth replayWorldDepthBack" aria-hidden="true" />
      <div className="replayWorldDepth replayWorldDepthMid" aria-hidden="true" />
      <div className="replayWorldDepth replayWorldDepthFront" aria-hidden="true" />
      <div className="replayLightField" aria-hidden="true" />
      <div className="replayMemoryParticles" aria-hidden="true" />
      <div className="replayVignette" aria-hidden="true" />

      <header className="replayIdentity" aria-label="Replay location">
        <p>Inside memory</p>
        <h1>{nodeName}</h1>
        <span>{phaseDefinition.userVisibleUi}</span>
      </header>

      <section className="replaySpatialCaption" aria-live="polite">
        <small>{activeSegment.label}</small>
        <strong>{activeSegment.caption}</strong>
      </section>

      <div className="replayPhaseStage" aria-hidden="true" data-phase={replayPhase}>
        <span className="replayPhasePulse" />
        <span className="replayPhasePortal" />
      </div>

      <ReplayPhaseRings activeSegment={activeSegment} progressPercent={progressPercent} reducedMotion={reducedMotion} />
      <ReplayTimeline
        phase={replayPhase}
        activeSegment={activeSegment}
        progressMs={progressMs}
        durationMs={REPLAY_DURATION_MS}
        playing={playing}
        reducedMotion={reducedMotion}
        onPlayPause={togglePlay}
        onScrub={scrubTo}
        onScrubbingChange={setScrubbing}
      />
      <ReplayMetaPanel
        morphology={morphology}
        phase={replayPhase}
        phaseDefinition={phaseDefinition}
        activeSegment={activeSegment}
        sourceLabel={`Replay · ${nodeName}`}
        manifestId={manifestId}
        onReturnToFocus={returnToFocus}
      />

      <button type="button" className="replayUnwind" onClick={returnToFocus} aria-label="Unwind replay to Focus">← Unwind to Focus</button>

      <style>{`
        .replayWorld{position:fixed;inset:0;overflow:hidden;color:#eef3ff;background:#010208;isolation:isolate;perspective:1500px}
        .replayWorldArt{position:absolute;inset:-5%;z-index:0;background-image:linear-gradient(180deg,rgba(2,4,10,.05),rgba(0,0,0,.72)),var(--replay-route-art);background-size:cover;background-position:center;filter:saturate(.9) contrast(1.08);animation:replayCameraDrift 18s ease-in-out infinite alternate}
        .replayEntryVeil{position:absolute;inset:-20%;z-index:40;pointer-events:none;background:radial-gradient(circle at 50% 48%,transparent 0 8%,rgba(255,193,116,.34) 11%,#03060d 24%,#000 62%);animation:replayEnter 1.1s cubic-bezier(.2,.72,.16,1) both}
        .replayWorldDepth{position:absolute;inset:-10%;pointer-events:none;transform-style:preserve-3d}.replayWorldDepth:before,.replayWorldDepth:after{content:'';position:absolute;border-radius:50%;border:1px solid rgba(203,232,255,.1);box-shadow:0 0 70px rgba(109,191,255,.08)}.replayWorldDepthBack{z-index:1;transform:translateZ(-240px) scale(1.18)}.replayWorldDepthBack:before{width:70vw;height:70vw;left:-20vw;top:8vh}.replayWorldDepthBack:after{width:56vw;height:56vw;right:-18vw;bottom:3vh}.replayWorldDepthMid{z-index:2;transform:translateZ(-80px) scale(1.05)}.replayWorldDepthMid:before{width:40vw;height:40vw;left:8vw;bottom:-10vw}.replayWorldDepthMid:after{width:34vw;height:34vw;right:4vw;top:-8vw}.replayWorldDepthFront{z-index:3;transform:translateZ(120px)}.replayWorldDepthFront:before{width:28vw;height:28vw;left:-12vw;top:35vh}.replayWorldDepthFront:after{width:22vw;height:22vw;right:-9vw;top:24vh}
        .replayLightField{position:absolute;inset:-20%;z-index:4;pointer-events:none;background:radial-gradient(circle at 50% 55%,rgba(255,202,133,.18),transparent 17%),radial-gradient(circle at 43% 38%,rgba(91,222,255,.11),transparent 31%),radial-gradient(circle at 72% 61%,rgba(178,98,255,.13),transparent 35%);mix-blend-mode:screen;animation:replayLightBreathe 7s ease-in-out infinite alternate}
        .replayMemoryParticles{position:absolute;inset:-10%;z-index:5;pointer-events:none;background-image:radial-gradient(circle,rgba(255,255,255,.64) 0 1px,transparent 1.5px),radial-gradient(circle,rgba(255,194,121,.45) 0 1px,transparent 1.4px);background-size:127px 127px,191px 191px;background-position:0 0,61px 39px;opacity:.46;animation:replayParticles 26s linear infinite}
        .replayVignette{position:absolute;inset:0;z-index:8;pointer-events:none;background:radial-gradient(circle at 50% 46%,transparent 0 35%,rgba(0,0,0,.1) 58%,rgba(0,0,0,.84) 100%),linear-gradient(180deg,rgba(0,0,0,.3),transparent 24%,transparent 70%,rgba(0,0,0,.78))}
        .replayIdentity{position:absolute;z-index:14;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(330px,calc(100vw - 36px));padding:8px 0 8px 13px;border-left:1px solid rgba(166,229,255,.42);text-shadow:0 2px 22px #000}.replayIdentity p{margin:0;color:#9be7ff;font-size:9px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayIdentity h1{margin:4px 0 2px;font-size:clamp(1.05rem,3vw,1.7rem);letter-spacing:-.03em}.replayIdentity span{display:block;color:rgba(238,243,255,.64);font-size:10px;line-height:1.4}
        .replaySpatialCaption{position:absolute;z-index:15;left:50%;bottom:25svh;transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.replaySpatialCaption small{display:block;margin-bottom:8px;color:#ffd49b;font-size:9px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replaySpatialCaption strong{display:block;font-family:Georgia,serif;font-size:clamp(1.3rem,4vw,2.8rem);font-weight:500;line-height:1.08}
        .replayPhaseStage{position:absolute;z-index:6;left:50%;top:48%;width:min(52vw,540px);aspect-ratio:1;transform:translate(-50%,-50%);display:grid;place-items:center;pointer-events:none}.replayPhasePulse{position:absolute;inset:12%;border-radius:50%;border:1px solid rgba(255,210,151,.18);box-shadow:0 0 80px rgba(255,167,73,.12),inset 0 0 80px rgba(99,206,255,.08);animation:replayPulse 4.8s ease-in-out infinite}.replayPhasePortal{position:absolute;width:18%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#fff 0 5%,#ffd397 15%,rgba(255,172,79,.48) 32%,rgba(94,203,255,.1) 58%,transparent 72%);box-shadow:0 0 34px rgba(255,226,181,.88),0 0 100px rgba(255,155,54,.42)}
        .replayUnwind{position:absolute;z-index:30;left:max(16px,env(safe-area-inset-left));bottom:max(14px,env(safe-area-inset-bottom));min-height:44px;border:0;background:transparent;color:rgba(235,248,255,.78);font-size:9px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;text-shadow:0 2px 18px #000}.replayUnwind:focus-visible{outline:2px solid white;outline-offset:5px}
        @keyframes replayEnter{0%{opacity:1;transform:scale(.72)}65%{opacity:.42}100%{opacity:0;transform:scale(2.45)}}
        @keyframes replayCameraDrift{from{transform:scale(1.03) translate3d(-.8%,.3%,0)}to{transform:scale(1.1) translate3d(.9%,-.8%,0)}}
        @keyframes replayLightBreathe{to{opacity:.66;transform:scale(1.04)}}
        @keyframes replayParticles{to{transform:translate3d(2%,4%,0)}}
        @keyframes replayPulse{50%{transform:scale(1.08);opacity:.55}}
        @media(max-width:700px){.replayIdentity{left:12px;top:max(12px,env(safe-area-inset-top));max-width:210px}.replaySpatialCaption{bottom:24svh;width:90vw}.replaySpatialCaption strong{font-size:clamp(1.18rem,6vw,2rem)}.replayPhaseStage{width:78vw;top:47%}.replayUnwind{left:10px;bottom:max(8px,env(safe-area-inset-bottom))}.replayWorldDepthFront{opacity:.45}}
        @media(prefers-reduced-motion:reduce){.replayEntryVeil{display:none}.replayWorldArt,.replayLightField,.replayMemoryParticles,.replayPhasePulse{animation:none!important}}
      `}</style>
    </main>
  )
}
