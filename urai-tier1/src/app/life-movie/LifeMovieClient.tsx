'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, limit, query } from 'firebase/firestore'
import { useSearchParams } from 'next/navigation'
import { app, firebasePublicEnvReady, getFirebaseDb } from '@/lib/firebase/client'
import { parseSelectedMemory, sanitizeMemoryId, type SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'

type MovieState =
  | { kind: 'auth-loading'; message: string }
  | { kind: 'unauthenticated'; message: string }
  | { kind: 'loading'; message: string }
  | { kind: 'ready'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'error'; message: string }

function mediaFor(memory: SelectedMemory) {
  return memory.sourceMedia.find((item) => item.kind === 'video')
    ?? memory.sourceMedia.find((item) => item.kind === 'image')
    ?? memory.sourceMedia.find((item) => item.kind === 'audio')
    ?? null
}

function safeOccurredAt(memory: SelectedMemory) {
  const timestamp = Date.parse(memory.occurredAt)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export default function LifeMovieClient() {
  const params = useSearchParams()
  const requestedMemoryId = sanitizeMemoryId(params.get('memoryId'))
  const reducedMotion = useReducedMotion()
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [memories, setMemories] = useState<SelectedMemory[]>([])
  const [state, setState] = useState<MovieState>({ kind: 'auth-loading', message: 'Checking private identity…' })
  const [activeIndex, setActiveIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!firebasePublicEnvReady) {
      setUser(null)
      setState({ kind: 'error', message: 'Private memory authority is unavailable.' })
      return
    }
    return onAuthStateChanged(getAuth(app), (nextUser) => {
      setUser(nextUser)
      setState(nextUser
        ? { kind: 'loading', message: 'Assembling your Life Movie from permitted memories…' }
        : { kind: 'unauthenticated', message: 'Sign in to open your private Life Movie.' })
    })
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setMemories([])
    setActiveIndex(0)
    setPlaying(false)
    setState({ kind: 'loading', message: 'Assembling your Life Movie from permitted memories…' })

    void (async () => {
      try {
        const snapshot = await getDocs(query(collection(getFirebaseDb(), 'users', user.uid, 'memories'), limit(36)))
        if (cancelled) return
        const parsed = snapshot.docs.flatMap((item) => {
          const result = parseSelectedMemory(item.data(), user.uid, item.id)
          return result.memory && result.status === 'ready' ? [result.memory] : []
        })
        parsed.sort((left, right) => safeOccurredAt(right) - safeOccurredAt(left))
        if (requestedMemoryId) {
          parsed.sort((left, right) => Number(right.id === requestedMemoryId) - Number(left.id === requestedMemoryId))
        }
        setMemories(parsed)
        setState(parsed.length
          ? { kind: 'ready', message: `${parsed.length} private memor${parsed.length === 1 ? 'y' : 'ies'} available for this Life Movie.` }
          : { kind: 'empty', message: 'No complete private memories are available for a Life Movie yet.' })
      } catch (error) {
        if (cancelled) return
        setState({ kind: 'error', message: error instanceof Error ? error.message : 'Your Life Movie could not be assembled.' })
      }
    })()

    return () => { cancelled = true }
  }, [requestedMemoryId, user])

  const active = memories[activeIndex] ?? null
  const media = active ? mediaFor(active) : null
  const chapterDurationMs = useMemo(() => {
    if (!active) return 8000
    const derived = Math.round(active.replayManifest.durationMs / Math.max(1, active.replayManifest.segments.length))
    return Math.max(6000, Math.min(15000, derived))
  }, [active])

  useEffect(() => {
    if (!playing || !active || memories.length < 1) return
    const timer = window.setTimeout(() => {
      setActiveIndex((index) => {
        if (index >= memories.length - 1) {
          setPlaying(false)
          return index
        }
        return index + 1
      })
    }, reducedMotion ? Math.max(9000, chapterDurationMs) : chapterDurationMs)
    return () => window.clearTimeout(timer)
  }, [active, chapterDurationMs, memories.length, playing, reducedMotion])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,video,audio')) return
      if (event.key === ' ' && memories.length) {
        event.preventDefault()
        setPlaying((value) => !value)
      }
      if (event.key === 'ArrowRight' && memories.length) {
        event.preventDefault()
        setPlaying(false)
        setActiveIndex((index) => Math.min(memories.length - 1, index + 1))
      }
      if (event.key === 'ArrowLeft' && memories.length) {
        event.preventDefault()
        setPlaying(false)
        setActiveIndex((index) => Math.max(0, index - 1))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [memories.length])

  if (user === undefined || state.kind === 'auth-loading' || state.kind === 'loading') {
    return <main className="lifeMovieState" data-testid="life-movie-runtime" data-state={state.kind}><p role="status">{state.message}</p><style>{css}</style></main>
  }

  if (!user || state.kind === 'unauthenticated') {
    return <main className="lifeMovieState" data-testid="life-movie-runtime" data-state="unauthenticated"><section><h1>Life Movie</h1><p>{state.message}</p><a href="/login?returnTo=%2Flife-movie">Continue securely</a></section><style>{css}</style></main>
  }

  if (!active) {
    return <main className="lifeMovieState" data-testid="life-movie-runtime" data-state={state.kind}><section><h1>Life Movie</h1><p>{state.message}</p><div className="lifeMovieStateActions"><a href="/life-map">Open Life Map</a><a href="/home">Return Home</a></div></section><style>{css}</style></main>
  }

  const currentSegment = active.replayManifest.segments[0]
  return (
    <main
      className="lifeMovie"
      data-testid="life-movie-runtime"
      data-state="ready"
      data-source="authenticated-owner-memories"
      data-provider-render="not-required"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
    >
      <header className="lifeMovieHeader">
        <div><p>URAI · LIFE MOVIE</p><h1>Your life, played as a private film.</h1></div>
        <nav aria-label="Life Movie destinations"><a href="/life-map">Life Map</a><a href="/replay?memoryId=${encodeURIComponent(active.id)}">Replay</a><a href="/passport">Passport</a></nav>
      </header>

      <section className="lifeMovieStage" aria-label="Current Life Movie chapter">
        <div className="lifeMovieMedia">
          {media?.kind === 'image' ? <img src={media.url} alt={media.caption || active.title} /> : null}
          {media?.kind === 'video' ? <video key={media.url} src={media.url} controls playsInline preload="metadata" aria-label={media.caption || active.title} /> : null}
          {media?.kind === 'audio' ? <div className="lifeMovieAudio"><div aria-hidden="true" className="lifeMovieAudioField" /><audio key={media.url} src={media.url} controls preload="metadata" aria-label={media.caption || active.title} /></div> : null}
          {!media ? <div className="lifeMovieMemoryField" aria-hidden="true"><span /><span /><span /></div> : null}
        </div>
        <div className="lifeMovieCaption" aria-live="polite">
          <p>Chapter {activeIndex + 1} of {memories.length}</p>
          <h2>{active.title}</h2>
          <time dateTime={active.occurredAt}>{new Date(active.occurredAt).toLocaleDateString()}</time>
          <p>{active.summary}</p>
          <blockquote>{currentSegment?.caption || active.narrator.replay}</blockquote>
          <small>Private owner memory · {active.privacy} · no synthetic provider render required for this playback</small>
        </div>
      </section>

      <section className="lifeMovieControls" aria-label="Life Movie playback controls">
        <button type="button" onClick={() => { setPlaying(false); setActiveIndex((index) => Math.max(0, index - 1)) }} disabled={activeIndex === 0}>Previous</button>
        <button type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause film' : 'Play film'}</button>
        <button type="button" onClick={() => { setPlaying(false); setActiveIndex((index) => Math.min(memories.length - 1, index + 1)) }} disabled={activeIndex === memories.length - 1}>Next</button>
      </section>

      <ol className="lifeMovieChapters" aria-label="Life Movie chapters">
        {memories.map((memory, index) => (
          <li key={memory.id}>
            <button type="button" aria-current={index === activeIndex ? 'step' : undefined} onClick={() => { setPlaying(false); setActiveIndex(index) }}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{memory.title}</strong>
            </button>
          </li>
        ))}
      </ol>
      <p className="lifeMovieDisclosure">This runtime assembles only memories authorized to the signed-in owner. External generation is not silently substituted. Provider-rendered exports can be added only when an exact render job is separately authorized and receipted.</p>
      <style>{css}</style>
    </main>
  )
}

const css = `
.lifeMovie,.lifeMovieState{min-height:100svh;box-sizing:border-box;background:radial-gradient(circle at 50% 20%,#17273c 0,#07101b 38%,#02050a 78%);color:#f7fbff;font-family:Inter,ui-sans-serif,system-ui}
.lifeMovieState{display:grid;place-items:center;padding:24px;text-align:center}.lifeMovieState section{max-width:620px}.lifeMovieState h1{font:600 clamp(2.5rem,8vw,5.5rem)/.9 Georgia,serif}.lifeMovieState p{color:#b8c8d6;line-height:1.6}.lifeMovieState a,.lifeMovieStateActions a{display:inline-flex;min-height:48px;align-items:center;padding:0 18px;border:1px solid #b9ecff55;border-radius:999px;color:#effbff;text-decoration:none}.lifeMovieStateActions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.lifeMovie{padding:clamp(18px,3vw,42px);display:grid;gap:22px}.lifeMovieHeader{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.lifeMovieHeader p{margin:0;color:#9ee9ff;font-size:11px;font-weight:900;letter-spacing:.26em}.lifeMovieHeader h1{max-width:760px;margin:8px 0 0;font:500 clamp(2.2rem,6vw,5.7rem)/.92 Georgia,serif}.lifeMovieHeader nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.lifeMovieHeader a{display:grid;place-items:center;min-height:48px;padding:0 16px;border:1px solid #ffffff24;border-radius:999px;color:#fff;text-decoration:none}
.lifeMovieStage{position:relative;min-height:min(64svh,760px);overflow:hidden;border:1px solid #ffffff24;border-radius:32px;background:#03070c;box-shadow:0 40px 120px #0008}.lifeMovieMedia{position:absolute;inset:0;display:grid;place-items:center;overflow:hidden}.lifeMovieMedia img,.lifeMovieMedia video{width:100%;height:100%;object-fit:cover}.lifeMovieMedia:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,#0001 30%,#02050be8 100%);pointer-events:none}.lifeMovieAudio{width:100%;height:100%;display:grid;place-items:center;gap:18px}.lifeMovieAudioField,.lifeMovieMemoryField{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,#8adfff33,transparent 24%),radial-gradient(circle at 25% 68%,#a980ff24,transparent 20%),linear-gradient(180deg,#07182a,#02050a)}.lifeMovieAudio audio{position:relative;z-index:2;width:min(620px,calc(100% - 48px))}.lifeMovieMemoryField span{position:absolute;border:1px solid #a7efff44;border-radius:50%;left:50%;top:50%;transform:translate(-50%,-50%)}.lifeMovieMemoryField span:nth-child(1){width:18vmin;height:18vmin;box-shadow:0 0 80px #8adfff55}.lifeMovieMemoryField span:nth-child(2){width:36vmin;height:36vmin}.lifeMovieMemoryField span:nth-child(3){width:58vmin;height:58vmin;opacity:.45}
.lifeMovieCaption{position:absolute;z-index:3;left:clamp(18px,4vw,54px);right:clamp(18px,4vw,54px);bottom:clamp(18px,4vw,46px);max-width:780px}.lifeMovieCaption>p:first-child{margin:0;color:#9ee9ff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.lifeMovieCaption h2{margin:8px 0 4px;font:500 clamp(2rem,5vw,5rem)/.95 Georgia,serif}.lifeMovieCaption time,.lifeMovieCaption small{color:#a9bac9}.lifeMovieCaption>p{max-width:62ch;color:#d8e4ee;line-height:1.55}.lifeMovieCaption blockquote{margin:14px 0;padding-left:14px;border-left:2px solid #9ee9ff88;color:#eefaff;font-size:clamp(1rem,2vw,1.3rem)}
.lifeMovieControls{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.lifeMovieControls button,.lifeMovieChapters button{min-height:48px;border:1px solid #ffffff26;border-radius:999px;background:#091522;color:#fff;font-weight:800;cursor:pointer}.lifeMovieControls button{padding:0 20px}.lifeMovieControls button[aria-pressed=true]{border-color:#9ee9ff;box-shadow:0 0 24px #8adfff33}.lifeMovieControls button:disabled{opacity:.38}
.lifeMovieChapters{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:9px;margin:0;padding:0;list-style:none}.lifeMovieChapters button{width:100%;display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center;padding:0 14px;text-align:left}.lifeMovieChapters button[aria-current=step]{border-color:#9ee9ff;background:#0d2634}.lifeMovieChapters span{color:#8adfff;font-size:11px}.lifeMovieChapters strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lifeMovieDisclosure{max-width:80ch;margin:0 auto;color:#89a0b3;font-size:12px;line-height:1.55;text-align:center}
.lifeMovie :is(button,a,audio,video):focus-visible,.lifeMovieState a:focus-visible{outline:3px solid #fff;outline-offset:3px}
@media(max-width:760px){.lifeMovieHeader{align-items:flex-start;flex-direction:column}.lifeMovieHeader nav{justify-content:flex-start}.lifeMovieStage{min-height:66svh;border-radius:24px}.lifeMovieCaption{bottom:22px}.lifeMovieChapters{grid-template-columns:1fr 1fr}}
@media(prefers-reduced-motion:reduce){.lifeMovie *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
@media(forced-colors:active){.lifeMovieStage,.lifeMovieControls button,.lifeMovieChapters button,.lifeMovieHeader a{border:2px solid CanvasText}}
`
