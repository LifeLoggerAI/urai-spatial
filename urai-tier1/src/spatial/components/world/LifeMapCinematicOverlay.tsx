'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type LifeMapStarType =
  | 'emotional_moment'
  | 'relationship_moment'
  | 'recovery_moment'
  | 'ritual_completion'
  | 'stress_spike'
  | 'grief_marker'
  | 'joy_marker'
  | 'clarity_marker'
  | 'life_chapter_marker'
  | 'important_place'
  | 'recurring_pattern'
  | 'urai_insight'
  | 'council_message'
  | 'threshold_moment'
  | 'sleep_shift'
  | 'social_silence'
  | 'repair_moment'
  | 'growth_marker'

type TimeMode = 'today' | 'week' | 'season' | 'year' | 'all_time'

type LifeMapStar = {
  id: string
  type: LifeMapStarType
  title: string
  summary: string
  why: string
  time: string
  tone: string
  x: number
  y: number
  size: number
  color: string
  halo: string
  ring: 'soft' | 'paired' | 'recovery' | 'ritual' | 'threshold' | 'none'
  timeMode: TimeMode
  related: string[]
}

type ConstellationPath = {
  id: string
  title: string
  type: 'life_chapter' | 'recovery_arc' | 'relationship_arc' | 'threshold_to_rebirth'
  starIds: string[]
  color: string
}

type Nebula = {
  id: string
  title: string
  type: 'calm' | 'recovery' | 'grief' | 'stress' | 'social_warmth' | 'transition'
  x: number
  y: number
  width: number
  height: number
  colorA: string
  colorB: string
}

const stars: LifeMapStar[] = [
  {
    id: 'you-are-here',
    type: 'life_chapter_marker',
    title: 'You Are Here',
    summary: 'The current life field is centered here. Recent signals are being held softly while older arcs orbit in the distance.',
    why: 'URAI centers this star because it represents the most recent stable home-state synthesis, not a score or diagnosis.',
    time: 'Now',
    tone: 'Current chapter',
    x: 50,
    y: 50,
    size: 36,
    color: '#f5f0e8',
    halo: 'rgba(245,240,232,.72)',
    ring: 'soft',
    timeMode: 'today',
    related: ['quiet-return', 'current-pressure', 'council-whisper'],
  },
  {
    id: 'quiet-return',
    type: 'recovery_moment',
    title: 'The Quiet Return',
    summary: 'A recovery signal formed after several lower-energy moments. URAI reads this as a small return of steadiness, not a full reset.',
    why: 'Sleep rhythm, lower app switching, and softer evening activity aligned with a recovery pattern. Confidence: medium.',
    time: 'This week',
    tone: 'Recovery',
    x: 38,
    y: 67,
    size: 27,
    color: '#8ef2c0',
    halo: 'rgba(142,242,192,.64)',
    ring: 'recovery',
    timeMode: 'week',
    related: ['you-are-here', 'ritual-breath', 'threshold-gate'],
  },
  {
    id: 'current-pressure',
    type: 'stress_spike',
    title: 'A Season of Pressure',
    summary: 'A compact warm star marks a pressure pattern. It is shown as intensity, not alarm.',
    why: 'URAI surfaced this from repeated friction signals and condensed evening focus. It avoids diagnostic language and preserves privacy.',
    time: 'Recent',
    tone: 'Pressure',
    x: 64,
    y: 55,
    size: 24,
    color: '#e58b73',
    halo: 'rgba(229,139,115,.52)',
    ring: 'soft',
    timeMode: 'week',
    related: ['you-are-here', 'clarity-line'],
  },
  {
    id: 'social-warmth',
    type: 'relationship_moment',
    title: 'Social Warmth Returning',
    summary: 'A paired glow marks a warmer relational field. It shows connection without exposing private identities.',
    why: 'Recent social tone and recurrence signals suggested warmth. URAI represents people as private gravity, not profile cards.',
    time: 'This season',
    tone: 'Relationship warmth',
    x: 23,
    y: 38,
    size: 25,
    color: '#ffd3c2',
    halo: 'rgba(255,140,163,.58)',
    ring: 'paired',
    timeMode: 'season',
    related: ['repair-bridge', 'you-are-here'],
  },
  {
    id: 'repair-bridge',
    type: 'repair_moment',
    title: 'Repair Bridge',
    summary: 'A softened path suggests reconnection. URAI frames this as repair and warmth, never surveillance.',
    why: 'A cooler social distance pattern softened over time. Confidence: medium-low, so the edge remains foggier.',
    time: 'This season',
    tone: 'Repair',
    x: 33,
    y: 29,
    size: 18,
    color: '#ffb8c8',
    halo: 'rgba(255,184,200,.48)',
    ring: 'paired',
    timeMode: 'season',
    related: ['social-warmth'],
  },
  {
    id: 'ritual-breath',
    type: 'ritual_completion',
    title: 'Ritual Completed',
    summary: 'A violet-gold ring marks a completed ritual. It is quiet, circular, and non-gamified.',
    why: 'URAI marks completed rituals as intentional transformation moments, not streak rewards.',
    time: 'This week',
    tone: 'Ritual',
    x: 29,
    y: 61,
    size: 18,
    color: '#c7a4ff',
    halo: 'rgba(199,164,255,.52)',
    ring: 'ritual',
    timeMode: 'week',
    related: ['quiet-return'],
  },
  {
    id: 'grief-thread',
    type: 'grief_marker',
    title: 'The Soft Grief Thread',
    summary: 'A blue-silver star holds a quieter emotional field. It is preserved as sacred stillness, not a problem to solve.',
    why: 'URAI detected a lower-motion, lower-social, reflective period. Confidence is medium and the language remains gentle.',
    time: 'This season',
    tone: 'Grief / reflection',
    x: 75,
    y: 33,
    size: 21,
    color: '#aab8d8',
    halo: 'rgba(170,184,216,.52)',
    ring: 'soft',
    timeMode: 'season',
    related: ['threshold-gate'],
  },
  {
    id: 'threshold-gate',
    type: 'threshold_moment',
    title: 'Threshold → Rebirth',
    summary: 'A violet-gold eclipse marker shows a transition between versions of self. It is a doorway, not a warning.',
    why: 'URAI grouped repeated life-shift signals with a later recovery arc. The marker stays symbolic and privacy-safe.',
    time: 'This year',
    tone: 'Threshold',
    x: 58,
    y: 24,
    size: 31,
    color: '#d7b16a',
    halo: 'rgba(215,177,106,.62)',
    ring: 'threshold',
    timeMode: 'year',
    related: ['grief-thread', 'quiet-return'],
  },
  {
    id: 'clarity-line',
    type: 'clarity_marker',
    title: 'Clearer Signal',
    summary: 'A crisp cyan-white star marks a clearer mental weather pocket.',
    why: 'Lower fog, steadier usage rhythm, and cleaner task cadence aligned into a clarity marker.',
    time: 'This week',
    tone: 'Clarity',
    x: 70,
    y: 69,
    size: 19,
    color: '#ddf8ff',
    halo: 'rgba(221,248,255,.5)',
    ring: 'none',
    timeMode: 'week',
    related: ['current-pressure'],
  },
  {
    id: 'council-whisper',
    type: 'council_message',
    title: 'Council Reflection Available',
    summary: 'A lavender whisper ring marks guidance without becoming a mascot or intrusive chat bubble.',
    why: 'This appears because a reflection can be attached to the current chapter. Voice remains opt-in.',
    time: 'Now',
    tone: 'Council',
    x: 82,
    y: 56,
    size: 17,
    color: '#eee7ff',
    halo: 'rgba(199,164,255,.5)',
    ring: 'ritual',
    timeMode: 'today',
    related: ['you-are-here'],
  },
]

const constellations: ConstellationPath[] = [
  { id: 'recovery-arc', title: 'Recovery Arc', type: 'recovery_arc', starIds: ['threshold-gate', 'quiet-return', 'ritual-breath'], color: 'rgba(142,242,192,.54)' },
  { id: 'current-chapter', title: 'Current Chapter', type: 'life_chapter', starIds: ['social-warmth', 'you-are-here', 'current-pressure', 'clarity-line'], color: 'rgba(191,215,255,.38)' },
  { id: 'repair-arc', title: 'Repair Arc', type: 'relationship_arc', starIds: ['repair-bridge', 'social-warmth', 'you-are-here'], color: 'rgba(255,184,200,.44)' },
  { id: 'threshold-rebirth', title: 'Threshold to Rebirth', type: 'threshold_to_rebirth', starIds: ['grief-thread', 'threshold-gate', 'quiet-return'], color: 'rgba(215,177,106,.5)' },
]

const nebulae: Nebula[] = [
  { id: 'recovery-season', title: 'Recovery Aurora', type: 'recovery', x: 34, y: 60, width: 45, height: 34, colorA: 'rgba(110,231,183,.2)', colorB: 'rgba(215,177,106,.11)' },
  { id: 'grief-season', title: 'Silver Grief Field', type: 'grief', x: 70, y: 30, width: 38, height: 30, colorA: 'rgba(170,184,216,.18)', colorB: 'rgba(83,97,125,.12)' },
  { id: 'social-season', title: 'Social Warmth', type: 'social_warmth', x: 26, y: 36, width: 36, height: 30, colorA: 'rgba(255,140,163,.16)', colorB: 'rgba(255,211,194,.09)' },
  { id: 'transition-season', title: 'Transition Field', type: 'transition', x: 56, y: 30, width: 40, height: 34, colorA: 'rgba(156,107,255,.15)', colorB: 'rgba(215,177,106,.1)' },
]

const timeModes: Array<{ id: TimeMode; label: string }> = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'season', label: 'Season' },
  { id: 'year', label: 'Year' },
  { id: 'all_time', label: 'All Time' },
]

function buildPath(starIds: string[]) {
  return starIds
    .map((id) => stars.find((star) => star.id === id))
    .filter((star): star is LifeMapStar => Boolean(star))
    .map((star, index) => `${index === 0 ? 'M' : 'L'} ${star.x} ${star.y}`)
    .join(' ')
}

function isVisibleForMode(star: LifeMapStar, mode: TimeMode) {
  if (mode === 'all_time') return true
  if (mode === 'year') return star.timeMode === 'today' || star.timeMode === 'week' || star.timeMode === 'season' || star.timeMode === 'year'
  if (mode === 'season') return star.timeMode === 'today' || star.timeMode === 'week' || star.timeMode === 'season'
  if (mode === 'week') return star.timeMode === 'today' || star.timeMode === 'week'
  return star.timeMode === 'today'
}

export default function LifeMapCinematicOverlay({ interactive }: { interactive: boolean }) {
  const router = useRouter()
  const [selectedStarId, setSelectedStarId] = useState('you-are-here')
  const [activeTimeMode, setActiveTimeMode] = useState<TimeMode>('week')
  const [whyOpen, setWhyOpen] = useState(false)
  const [replayActive, setReplayActive] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const selectedStar = stars.find((star) => star.id === selectedStarId) ?? stars[0]
  const visibleStars = useMemo(() => stars.filter((star) => isVisibleForMode(star, activeTimeMode)), [activeTimeMode])
  const relatedIds = new Set(selectedStar.related)

  const returnHome = useCallback(() => router.push('/', { scroll: false }), [router])

  useEffect(() => {
    if (!interactive) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (whyOpen) setWhyOpen(false)
        else if (selectedStarId) setSelectedStarId('')
        else returnHome()
      }

      if (event.key === 'Home' || event.key.toLowerCase() === 'h') returnHome()
      if (event.key === '+' || event.key === '=') setZoom((value) => Math.min(1.8, value + 0.12))
      if (event.key === '-') setZoom((value) => Math.max(0.72, value - 0.12))
      if (event.key === 'ArrowLeft') setOffset((value) => ({ ...value, x: value.x + 10 }))
      if (event.key === 'ArrowRight') setOffset((value) => ({ ...value, x: value.x - 10 }))
      if (event.key === 'ArrowUp') setOffset((value) => ({ ...value, y: value.y + 10 }))
      if (event.key === 'ArrowDown') setOffset((value) => ({ ...value, y: value.y - 10 }))
      if (event.key === 'Enter' && !selectedStarId) setSelectedStarId('you-are-here')
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [interactive, returnHome, selectedStarId, whyOpen])

  return (
    <section
      className="life-map-cinematic"
      data-lifemap-cinematic="true"
      data-interactive={interactive ? 'true' : 'false'}
      data-replay-active={replayActive ? 'true' : 'false'}
      aria-label="URAI Life Map, a symbolic galaxy of memories, patterns, and emotional seasons."
    >
      <div className="life-map-deep-field" aria-hidden="true">
        <span className="galaxy-haze haze-a" />
        <span className="galaxy-haze haze-b" />
        <span className="galaxy-dust dust-a" />
        <span className="galaxy-dust dust-b" />
      </div>

      <button className="life-map-return" type="button" onClick={returnHome} aria-label="Return to URAI home">
        Return Home
      </button>

      <button className="life-map-recenter" type="button" onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); setSelectedStarId('you-are-here') }} aria-label="Recenter Life Map">
        Recenter
      </button>

      <div className="life-map-world" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})` }}>
        <div className="life-map-nebulae" aria-hidden="true">
          {nebulae.map((nebula) => (
            <button
              key={nebula.id}
              type="button"
              className={`life-map-nebula life-map-nebula--${nebula.type}`}
              style={{
                left: `${nebula.x}%`,
                top: `${nebula.y}%`,
                width: `${nebula.width}%`,
                height: `${nebula.height}%`,
                background: `radial-gradient(ellipse, ${nebula.colorA}, ${nebula.colorB} 45%, transparent 72%)`,
              }}
              aria-label={`Emotional season field, ${nebula.title}`}
              onClick={() => {
                const firstStar = stars.find((star) => star.timeMode === 'season')
                if (firstStar) setSelectedStarId(firstStar.id)
                setWhyOpen(false)
              }}
            />
          ))}
        </div>

        <svg className="life-map-constellations" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {constellations.map((path) => {
            const active = path.starIds.includes(selectedStarId)
            return (
              <path
                key={path.id}
                d={buildPath(path.starIds)}
                className="constellation-path"
                data-active={active ? 'true' : 'false'}
                stroke={path.color}
              />
            )
          })}
        </svg>

        <div className="life-map-stars" role="list" aria-label="Memory stars">
          {visibleStars.map((star) => {
            const selected = selectedStarId === star.id
            const related = relatedIds.has(star.id)
            const dimmed = Boolean(selectedStarId) && !selected && !related

            return (
              <button
                key={star.id}
                type="button"
                role="listitem"
                className={`life-map-star life-map-star--${star.type} life-map-star--ring-${star.ring}`}
                data-selected={selected ? 'true' : 'false'}
                data-related={related ? 'true' : 'false'}
                data-dimmed={dimmed ? 'true' : 'false'}
                style={{
                  left: `${star.x}%`,
                  top: `${star.y}%`,
                  width: `${Math.max(44, star.size * 2.15)}px`,
                  height: `${Math.max(44, star.size * 2.15)}px`,
                  ['--star-core' as string]: star.color,
                  ['--star-halo' as string]: star.halo,
                  ['--star-size' as string]: `${star.size}px`,
                }}
                aria-label={`Memory star, ${star.title}, ${star.tone}, ${star.time}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setSelectedStarId(star.id)
                  setWhyOpen(false)
                }}
              >
                <span className="star-hit-core" aria-hidden="true" />
                <span className="star-hit-ring" aria-hidden="true" />
                <span className="star-hit-label">{star.title}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="life-map-time-lens" aria-label="Life Map time lens">
        {timeModes.map((mode) => (
          <button key={mode.id} type="button" aria-pressed={activeTimeMode === mode.id} onClick={() => setActiveTimeMode(mode.id)}>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="life-map-zoom-controls" aria-label="Life Map zoom controls">
        <button type="button" onClick={() => setZoom((value) => Math.max(0.72, value - 0.12))}>−</button>
        <output>{Math.round(zoom * 100)}%</output>
        <button type="button" onClick={() => setZoom((value) => Math.min(1.8, value + 0.12))}>+</button>
      </div>

      {selectedStar ? (
        <aside className="memory-scroll" aria-live="polite" aria-label="Selected memory detail">
          <div className="memory-scroll__eyebrow">{selectedStar.tone} · {selectedStar.time}</div>
          <h1>{selectedStar.title}</h1>
          <p>{selectedStar.summary}</p>
          {whyOpen ? <p className="memory-scroll__why">{selectedStar.why}</p> : null}
          <div className="memory-scroll__actions">
            <button type="button" onClick={() => setWhyOpen((value) => !value)}>
              {whyOpen ? 'Hide Why' : 'Why am I seeing this?'}
            </button>
            <button type="button" onClick={() => setReplayActive((value) => !value)}>
              {replayActive ? 'Pause Replay' : 'Replay this arc'}
            </button>
          </div>
        </aside>
      ) : null}

      {!interactive ? (
        <div className="life-map-loading" aria-live="polite">
          <span />
          <p>Forming your Life Map…</p>
        </div>
      ) : null}

      <p className="sr-only">
        Use arrow keys to pan the Life Map, plus and minus to zoom, Enter to open a star, Escape to close details, and Home to return to the root home screen.
      </p>

      <style jsx>{`
        .life-map-cinematic {
          position: fixed;
          inset: 0;
          z-index: 120;
          overflow: hidden;
          color: #f8fbff;
          background:
            radial-gradient(circle at 51% 48%, rgba(30, 53, 101, 0.36), transparent 22%),
            radial-gradient(circle at 22% 44%, rgba(85, 57, 145, 0.32), transparent 31%),
            radial-gradient(circle at 75% 38%, rgba(80, 37, 79, 0.2), transparent 30%),
            linear-gradient(180deg, #040712 0%, #071024 42%, #030510 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          isolation: isolate;
        }

        .life-map-cinematic::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 80;
          pointer-events: none;
          background:
            radial-gradient(ellipse at center, transparent 0%, transparent 58%, rgba(1, 4, 12, 0.34) 100%),
            linear-gradient(180deg, rgba(255,255,255,.04), transparent 12%, transparent 84%, rgba(0,0,0,.22));
        }

        .life-map-deep-field,
        .life-map-world,
        .life-map-nebulae,
        .life-map-stars,
        .life-map-constellations {
          position: absolute;
          inset: 0;
        }

        .life-map-deep-field {
          z-index: 0;
          pointer-events: none;
        }

        .galaxy-haze,
        .galaxy-dust {
          position: absolute;
          display: block;
          pointer-events: none;
          border-radius: 999px;
          mix-blend-mode: screen;
        }

        .haze-a {
          left: 8%;
          top: 12%;
          width: 78vw;
          height: 52vh;
          background: radial-gradient(ellipse, rgba(95, 127, 210, .18), rgba(23, 17, 47, .08) 44%, transparent 72%);
          filter: blur(18px);
          animation: nebulaBreath 54s ease-in-out infinite;
        }

        .haze-b {
          right: -10%;
          top: 20%;
          width: 62vw;
          height: 54vh;
          background: radial-gradient(ellipse, rgba(156, 107, 255, .14), rgba(197, 106, 90, .08) 42%, transparent 74%);
          filter: blur(24px);
          animation: nebulaBreath 68s ease-in-out infinite reverse;
        }

        .galaxy-dust {
          opacity: .34;
          filter: blur(1px);
        }

        .dust-a {
          inset: 0;
          background-image:
            radial-gradient(circle at 12% 18%, rgba(255,255,255,.7) 0 1px, transparent 2px),
            radial-gradient(circle at 34% 29%, rgba(191,215,255,.55) 0 1px, transparent 2px),
            radial-gradient(circle at 62% 20%, rgba(221,248,255,.55) 0 1px, transparent 2px),
            radial-gradient(circle at 74% 53%, rgba(255,255,255,.52) 0 1px, transparent 2px),
            radial-gradient(circle at 21% 70%, rgba(199,164,255,.5) 0 1px, transparent 2px),
            radial-gradient(circle at 91% 31%, rgba(255,255,255,.55) 0 1px, transparent 2px);
          animation: galaxyDrift 92s linear infinite;
        }

        .dust-b {
          inset: -12%;
          background-image:
            radial-gradient(circle at 18% 41%, rgba(255,255,255,.42) 0 1px, transparent 2px),
            radial-gradient(circle at 44% 12%, rgba(142,242,192,.45) 0 1px, transparent 2px),
            radial-gradient(circle at 56% 78%, rgba(221,248,255,.42) 0 1px, transparent 2px),
            radial-gradient(circle at 83% 62%, rgba(255,215,119,.42) 0 1px, transparent 2px),
            radial-gradient(circle at 8% 84%, rgba(170,184,216,.45) 0 1px, transparent 2px);
          animation: galaxyDrift 120s linear infinite reverse;
        }

        .life-map-world {
          z-index: 2;
          transform-origin: center;
          transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .life-map-nebula {
          position: absolute;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          opacity: .9;
          filter: blur(20px);
          mix-blend-mode: screen;
          pointer-events: auto;
          cursor: pointer;
          animation: nebulaBreath 48s ease-in-out infinite;
        }

        .life-map-constellations {
          z-index: 5;
          pointer-events: none;
          filter: drop-shadow(0 0 8px rgba(125,211,252,.22));
        }

        .constellation-path {
          fill: none;
          stroke-width: .16;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: .38;
          stroke-dasharray: .5 .72;
          transition: opacity 260ms ease, stroke-width 260ms ease, filter 260ms ease;
        }

        .constellation-path[data-active='true'] {
          opacity: .98;
          stroke-width: .32;
          stroke-dasharray: 1.2 .34;
          filter: drop-shadow(0 0 10px currentColor);
          animation: constellationDraw 1.8s ease-out both;
        }

        .life-map-stars {
          z-index: 10;
        }

        .life-map-star {
          position: absolute;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          background: transparent;
          pointer-events: auto;
          cursor: pointer;
          transition: opacity 220ms ease, transform 260ms cubic-bezier(.22,1,.36,1), filter 220ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .life-map-star[data-selected='true'] {
          z-index: 8;
          transform: translate(-50%, -50%) scale(1.44);
        }

        .life-map-star[data-related='true'] {
          filter: saturate(1.2) brightness(1.08);
        }

        .life-map-star[data-dimmed='true'] {
          opacity: .46;
          filter: saturate(.72) brightness(.8);
        }

        .life-map-star:focus-visible,
        .life-map-return:focus-visible,
        .life-map-recenter:focus-visible,
        .life-map-time-lens button:focus-visible,
        .life-map-zoom-controls button:focus-visible,
        .memory-scroll button:focus-visible {
          outline: 2px solid rgba(221,248,255,.95);
          outline-offset: 6px;
        }

        .star-hit-core,
        .star-hit-ring {
          position: absolute;
          left: 50%;
          top: 50%;
          display: block;
          border-radius: 999px;
          pointer-events: none;
          transform: translate(-50%, -50%);
        }

        .star-hit-core {
          width: var(--star-size);
          height: var(--star-size);
          background: radial-gradient(circle at 42% 38%, #fff 0 16%, var(--star-core) 38%, rgba(255,255,255,.08) 72%, transparent 76%);
          box-shadow: 0 0 calc(var(--star-size) * 1.8) var(--star-halo), inset 0 0 12px rgba(255,255,255,.45);
          animation: starPulse 5.8s ease-in-out infinite;
        }

        .star-hit-ring {
          width: calc(var(--star-size) * 2.4);
          height: calc(var(--star-size) * 2.4);
          border: 1px solid var(--star-halo);
          opacity: .72;
        }

        .life-map-star--ring-paired .star-hit-ring::after,
        .life-map-star--ring-ritual .star-hit-ring::after,
        .life-map-star--ring-recovery .star-hit-ring::after,
        .life-map-star--ring-threshold .star-hit-ring::after {
          content: '';
          position: absolute;
          inset: -6px;
          border-radius: inherit;
          border: 1px solid var(--star-halo);
          opacity: .6;
        }

        .life-map-star--ring-paired .star-hit-ring::after { transform: translateX(9px); }
        .life-map-star--ring-ritual .star-hit-ring::after { animation: ritualRing 9s linear infinite; }
        .life-map-star--ring-recovery .star-hit-ring::after { animation: recoveryBloom 4.8s ease-in-out infinite; }
        .life-map-star--ring-threshold .star-hit-ring::after { border-style: dashed; animation: ritualRing 14s linear infinite reverse; }

        .star-hit-label {
          position: absolute;
          left: 50%;
          top: calc(50% + 24px);
          transform: translateX(-50%);
          width: max-content;
          max-width: 180px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 999px;
          background: rgba(3,7,18,.46);
          color: rgba(248,251,255,.82);
          opacity: 0;
          padding: 6px 9px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
          backdrop-filter: blur(12px);
          transition: opacity 160ms ease, transform 160ms ease;
          pointer-events: none;
        }

        .life-map-star:hover .star-hit-label,
        .life-map-star:focus-visible .star-hit-label,
        .life-map-star[data-selected='true'] .star-hit-label {
          opacity: 1;
          transform: translateX(-50%) translateY(4px);
        }

        .life-map-return,
        .life-map-recenter,
        .life-map-time-lens,
        .life-map-zoom-controls,
        .memory-scroll,
        .life-map-loading {
          position: absolute;
          z-index: 150;
          pointer-events: auto;
        }

        .life-map-return,
        .life-map-recenter {
          top: max(18px, env(safe-area-inset-top));
          border: 1px solid rgba(221,248,255,.18);
          border-radius: 999px;
          background: rgba(3,8,22,.36);
          color: rgba(245,251,255,.84);
          backdrop-filter: blur(18px);
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .14em;
          padding: 12px 14px;
          text-transform: uppercase;
        }

        .life-map-return { left: max(18px, env(safe-area-inset-left)); }
        .life-map-recenter { right: max(18px, env(safe-area-inset-right)); }

        .life-map-time-lens {
          left: 50%;
          bottom: max(20px, env(safe-area-inset-bottom));
          display: flex;
          gap: 7px;
          transform: translateX(-50%);
          border: 1px solid rgba(221,248,255,.14);
          border-radius: 999px;
          background: rgba(3,8,22,.4);
          box-shadow: 0 24px 70px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(20px);
          padding: 8px;
        }

        .life-map-time-lens button,
        .life-map-zoom-controls button,
        .memory-scroll button {
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 999px;
          background: rgba(255,255,255,.07);
          color: rgba(248,251,255,.82);
          cursor: pointer;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .1em;
          padding: 9px 12px;
          text-transform: uppercase;
        }

        .life-map-time-lens button[aria-pressed='true'] {
          border-color: rgba(142,242,192,.45);
          background: rgba(142,242,192,.13);
          color: #ffffff;
          box-shadow: 0 0 24px rgba(142,242,192,.12);
        }

        .life-map-zoom-controls {
          right: max(18px, env(safe-area-inset-right));
          bottom: max(22px, env(safe-area-inset-bottom));
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(221,248,255,.12);
          border-radius: 999px;
          background: rgba(3,8,22,.34);
          backdrop-filter: blur(18px);
          padding: 8px;
        }

        .life-map-zoom-controls output {
          min-width: 46px;
          color: rgba(248,251,255,.76);
          font-size: 11px;
          font-weight: 900;
          text-align: center;
        }

        .memory-scroll {
          right: max(22px, env(safe-area-inset-right));
          top: 96px;
          width: min(410px, calc(100vw - 44px));
          border: 1px solid rgba(221,248,255,.15);
          border-radius: 30px;
          background: linear-gradient(180deg, rgba(7, 13, 30, .72), rgba(3, 6, 16, .62));
          box-shadow: 0 28px 90px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.06);
          backdrop-filter: blur(24px);
          padding: 22px;
        }

        .memory-scroll__eyebrow {
          color: rgba(142,242,192,.88);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .18em;
          text-transform: uppercase;
        }

        .memory-scroll h1 {
          margin: 8px 0 10px;
          color: white;
          font-size: clamp(30px, 3.2vw, 42px);
          line-height: .96;
          letter-spacing: -.058em;
        }

        .memory-scroll p {
          margin: 0;
          color: rgba(235,243,255,.78);
          font-size: 14px;
          font-weight: 650;
          line-height: 1.52;
        }

        .memory-scroll__why {
          margin-top: 14px !important;
          border-left: 2px solid rgba(142,242,192,.46);
          padding-left: 12px;
          color: rgba(221,248,255,.82) !important;
        }

        .memory-scroll__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 16px;
        }

        .life-map-loading {
          left: 50%;
          top: 50%;
          display: flex;
          align-items: center;
          gap: 12px;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(221,248,255,.14);
          border-radius: 999px;
          background: rgba(3,8,22,.48);
          backdrop-filter: blur(18px);
          padding: 12px 16px;
        }

        .life-map-loading span {
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: radial-gradient(circle, #fff, #8ef2c0 45%, transparent 72%);
          box-shadow: 0 0 28px rgba(142,242,192,.62);
          animation: starPulse 2.8s ease-in-out infinite;
        }

        .life-map-loading p {
          margin: 0;
          color: rgba(248,251,255,.78);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }

        @keyframes galaxyDrift { from { transform: translate3d(-1%, -1%, 0); } to { transform: translate3d(1%, 1%, 0); } }
        @keyframes nebulaBreath { 0%, 100% { transform: translate(-50%, -50%) scale(.96); opacity: .62; } 50% { transform: translate(-50%, -50%) scale(1.08); opacity: .92; } }
        @keyframes starPulse { 0%, 100% { transform: translate(-50%, -50%) scale(.94); opacity: .82; } 50% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; } }
        @keyframes ritualRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes recoveryBloom { 0%, 100% { transform: scale(.88); opacity: .3; } 50% { transform: scale(1.28); opacity: .72; } }
        @keyframes constellationDraw { from { stroke-dashoffset: 6; } to { stroke-dashoffset: 0; } }

        @media (max-width: 760px) {
          .life-map-world { transform-origin: center 44%; }
          .memory-scroll {
            left: 14px;
            right: 14px;
            top: auto;
            bottom: calc(max(16px, env(safe-area-inset-bottom)) + 76px);
            width: auto;
            max-height: 45vh;
            overflow: auto;
            border-radius: 26px;
            padding: 18px;
          }

          .memory-scroll h1 { font-size: 28px; }
          .memory-scroll p { font-size: 13px; }

          .life-map-time-lens {
            left: 12px;
            right: 12px;
            bottom: max(12px, env(safe-area-inset-bottom));
            transform: none;
            overflow-x: auto;
            justify-content: flex-start;
          }

          .life-map-time-lens button { flex: 0 0 auto; font-size: 10px; padding: 9px 10px; }
          .life-map-zoom-controls { display: none; }
          .life-map-return, .life-map-recenter { font-size: 10px; padding: 10px 12px; }
          .star-hit-label { display: none; }
        }

        @media (prefers-reduced-motion: reduce) {
          .galaxy-dust,
          .galaxy-haze,
          .life-map-nebula,
          .star-hit-core,
          .life-map-star--ring-ritual .star-hit-ring::after,
          .life-map-star--ring-recovery .star-hit-ring::after,
          .life-map-loading span {
            animation: none;
          }

          .life-map-world,
          .life-map-star,
          .constellation-path {
            transition-duration: 120ms;
          }
        }
      `}</style>
    </section>
  )
}
