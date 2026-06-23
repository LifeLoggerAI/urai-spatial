'use client'

import Link from 'next/link'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useMemo, useState } from 'react'

type MemoryState = 'core' | 'healing' | 'storm' | 'legacy' | 'locked' | 'forming'

type MemoryStar = {
  id: string
  title: string
  chapter: string
  era: string
  date: string
  body: string
  emotion: string
  people: string
  place: string
  state: MemoryState
  x: number
  y: number
  z: number
  hue: number
  scale: number
  links: string[]
}

type EraRegion = {
  name: string
  detail: string
  x: number
  y: number
  w: number
  h: number
  hue: number
  tilt: number
}

type RelationshipBody = {
  name: string
  role: string
  x: number
  y: number
  gravity: number
  hue: number
}

type WorkforceAgent = {
  name: string
  action: string
  x: number
  y: number
  hue: number
  delay: number
}

type RawConstellationLink = {
  from: string
  to: string
  label: string
  hue: number
  strength: number
}

const memoryStars: MemoryStar[] = [
  {
    id: 'seed-threshold-storm',
    title: 'Chapter of Becoming',
    chapter: 'Threshold',
    era: 'Becoming',
    date: 'Mar 15, 2026',
    body: 'The scattered stars began to read as one life arc.',
    emotion: 'pressure clearing into purpose',
    people: 'self, future self',
    place: 'threshold room',
    state: 'core',
    x: 46,
    y: 43,
    z: 1.18,
    hue: 214,
    scale: 1.14,
    links: ['seed-first-light', 'seed-recovery-arc', 'seed-quiet-reset', 'seed-future-horizon'],
  },
  {
    id: 'seed-memory-bloom',
    title: 'Memory Bloom',
    chapter: 'Identity',
    era: 'Origin',
    date: 'Mar 18, 2026',
    body: 'A private image-form surfaced from the field.',
    emotion: 'recognition',
    people: 'self',
    place: 'inner archive',
    state: 'forming',
    x: 23,
    y: 35,
    z: 0.82,
    hue: 192,
    scale: 0.88,
    links: ['seed-consent-key', 'seed-mirror-thread'],
  },
  {
    id: 'seed-recovery-arc',
    title: 'Recovery Arc',
    chapter: 'Body',
    era: 'Recovery',
    date: 'Mar 21, 2026',
    body: 'A body thread held steady inside the replay path.',
    emotion: 'strain becoming steadiness',
    people: 'self, care circle',
    place: 'daily ground',
    state: 'healing',
    x: 72,
    y: 36,
    z: 0.9,
    hue: 142,
    scale: 0.94,
    links: ['seed-quiet-reset', 'seed-threshold-storm', 'seed-weather-front'],
  },
  {
    id: 'seed-quiet-reset',
    title: 'Quiet Reset',
    chapter: 'Focus',
    era: 'Recovery',
    date: 'Mar 27, 2026',
    body: 'A still point for focus, breath, and return.',
    emotion: 'calm after overload',
    people: 'self',
    place: 'bedroom window',
    state: 'healing',
    x: 52,
    y: 61,
    z: 1.02,
    hue: 102,
    scale: 0.86,
    links: ['seed-night-window', 'seed-recovery-arc', 'seed-threshold-storm'],
  },
  {
    id: 'seed-night-window',
    title: 'Night Window',
    chapter: 'Replay',
    era: 'Memory Film',
    date: 'Apr 02, 2026',
    body: 'A replay window opened above the horizon.',
    emotion: 'wonder',
    people: 'self, memory echo',
    place: 'moonlit room',
    state: 'legacy',
    x: 63,
    y: 21,
    z: 0.62,
    hue: 206,
    scale: 0.78,
    links: ['seed-quiet-reset', 'seed-legacy-lantern'],
  },
  {
    id: 'seed-consent-key',
    title: 'Consent Key',
    chapter: 'Passport',
    era: 'Ownership',
    date: 'Apr 05, 2026',
    body: 'A consent artifact stayed private by default.',
    emotion: 'protected',
    people: 'self',
    place: 'private vault',
    state: 'locked',
    x: 84,
    y: 56,
    z: 0.55,
    hue: 332,
    scale: 0.72,
    links: ['seed-memory-bloom', 'seed-legacy-lantern'],
  },
  {
    id: 'seed-first-light',
    title: 'First Light',
    chapter: 'Home',
    era: 'Origin',
    date: 'Apr 09, 2026',
    body: 'The Home World became the entry point.',
    emotion: 'arrival',
    people: 'self',
    place: 'home threshold',
    state: 'core',
    x: 35,
    y: 23,
    z: 0.7,
    hue: 50,
    scale: 0.9,
    links: ['seed-threshold-storm', 'seed-memory-bloom'],
  },
  {
    id: 'seed-mirror-thread',
    title: 'Mirror Thread',
    chapter: 'Mirror',
    era: 'Relationship',
    date: 'Apr 12, 2026',
    body: 'Identity reflected without leaving the world.',
    emotion: 'honest reflection',
    people: 'self, trusted witness',
    place: 'mirror pool',
    state: 'core',
    x: 80,
    y: 25,
    z: 0.52,
    hue: 267,
    scale: 0.66,
    links: ['seed-memory-bloom', 'seed-relationship-gravity'],
  },
  {
    id: 'seed-relationship-gravity',
    title: 'Relationship Gravity',
    chapter: 'Kinship',
    era: 'Relationship',
    date: 'Apr 18, 2026',
    body: 'The people who shaped the arc became visible as constellations.',
    emotion: 'love with boundaries',
    people: 'family, friends, mentors',
    place: 'shared orbit',
    state: 'forming',
    x: 17,
    y: 56,
    z: 0.72,
    hue: 284,
    scale: 0.82,
    links: ['seed-mirror-thread', 'seed-weather-front'],
  },
  {
    id: 'seed-weather-front',
    title: 'Emotional Weather',
    chapter: 'Weather',
    era: 'Pattern',
    date: 'Apr 22, 2026',
    body: 'Stress, relief, grief, and momentum moved like weather systems.',
    emotion: 'storm becoming signal',
    people: 'self',
    place: 'global mood sky',
    state: 'storm',
    x: 76,
    y: 66,
    z: 0.68,
    hue: 344,
    scale: 0.76,
    links: ['seed-recovery-arc', 'seed-relationship-gravity', 'seed-future-horizon'],
  },
  {
    id: 'seed-legacy-lantern',
    title: 'Legacy Lantern',
    chapter: 'Legacy',
    era: 'Ownership',
    date: 'Apr 28, 2026',
    body: 'A memory prepared itself to be kept, inherited, or sealed.',
    emotion: 'sacred responsibility',
    people: 'self, future family',
    place: 'legacy vault',
    state: 'legacy',
    x: 89,
    y: 39,
    z: 0.58,
    hue: 38,
    scale: 0.68,
    links: ['seed-night-window', 'seed-consent-key'],
  },
  {
    id: 'seed-future-horizon',
    title: 'Future Horizon',
    chapter: 'Future',
    era: 'Becoming',
    date: 'May 03, 2026',
    body: 'The next self appeared as a horizon, not a task list.',
    emotion: 'pull forward',
    people: 'self, future self',
    place: 'upper sky',
    state: 'forming',
    x: 57,
    y: 16,
    z: 0.64,
    hue: 176,
    scale: 0.74,
    links: ['seed-threshold-storm', 'seed-weather-front'],
  },
]

const eraRegions: EraRegion[] = [
  { name: 'Origin', detail: 'where the story began', x: 28, y: 29, w: 27, h: 15, hue: 48, tilt: -9 },
  { name: 'Becoming', detail: 'current self taking shape', x: 51, y: 40, w: 35, h: 19, hue: 208, tilt: 3 },
  { name: 'Recovery', detail: 'body, calm, return', x: 61, y: 58, w: 36, h: 17, hue: 126, tilt: -5 },
  { name: 'Relationship', detail: 'people with gravity', x: 23, y: 58, w: 31, h: 15, hue: 284, tilt: 7 },
  { name: 'Ownership', detail: 'private vault layer', x: 84, y: 49, w: 25, h: 16, hue: 332, tilt: -6 },
]

const relationshipBodies: RelationshipBody[] = [
  { name: 'Care Circle', role: 'support orbit', x: 25, y: 63, gravity: 1.05, hue: 280 },
  { name: 'Future Self', role: 'north pull', x: 57, y: 11, gravity: 0.82, hue: 176 },
  { name: 'Trusted Witness', role: 'reflection body', x: 82, y: 20, gravity: 0.72, hue: 267 },
]

const workforceAgents: WorkforceAgent[] = [
  { name: 'Pattern analyst', action: 'linking burnout to recovery', x: 67, y: 53, hue: 186, delay: -0.4 },
  { name: 'Memory gardener', action: 'softening the storm cluster', x: 43, y: 51, hue: 118, delay: -1.9 },
  { name: 'Privacy guardian', action: 'holding consent rings closed', x: 82, y: 52, hue: 332, delay: -3.2 },
  { name: 'Replay builder', action: 'preparing a living memory film', x: 59, y: 27, hue: 206, delay: -4.6 },
]

const constellationLinks: RawConstellationLink[] = [
  { from: 'seed-first-light', to: 'seed-threshold-storm', label: 'arrival to becoming', hue: 204, strength: 0.76 },
  { from: 'seed-threshold-storm', to: 'seed-recovery-arc', label: 'pressure to recovery', hue: 143, strength: 0.74 },
  { from: 'seed-threshold-storm', to: 'seed-quiet-reset', label: 'becoming to stillness', hue: 112, strength: 0.88 },
  { from: 'seed-quiet-reset', to: 'seed-night-window', label: 'focus opens replay', hue: 207, strength: 0.68 },
  { from: 'seed-memory-bloom', to: 'seed-consent-key', label: 'identity protected', hue: 332, strength: 0.62 },
  { from: 'seed-memory-bloom', to: 'seed-mirror-thread', label: 'identity reflection', hue: 267, strength: 0.52 },
  { from: 'seed-mirror-thread', to: 'seed-relationship-gravity', label: 'people as gravity', hue: 284, strength: 0.62 },
  { from: 'seed-relationship-gravity', to: 'seed-weather-front', label: 'relationship weather', hue: 344, strength: 0.46 },
  { from: 'seed-weather-front', to: 'seed-recovery-arc', label: 'storm to body', hue: 142, strength: 0.72 },
  { from: 'seed-night-window', to: 'seed-legacy-lantern', label: 'replay to legacy', hue: 38, strength: 0.5 },
  { from: 'seed-consent-key', to: 'seed-legacy-lantern', label: 'consent inheritance', hue: 42, strength: 0.66 },
  { from: 'seed-threshold-storm', to: 'seed-future-horizon', label: 'becoming horizon', hue: 176, strength: 0.7 },
  { from: 'seed-weather-front', to: 'seed-future-horizon', label: 'weather clears forward', hue: 176, strength: 0.56 },
]

const rail = [
  ['Home', '/home'],
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['Focus', '/focus?memoryId=seed-threshold-storm'],
  ['Replay', '/replay?memoryId=seed-threshold-storm&manifestId=replay-recovery-thread'],
  ['Mirror', '/mirror'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

function vars(values: Record<string, string | number>) {
  return values as CSSProperties
}

function getStar(id: string) {
  return memoryStars.find((star) => star.id === id)
}

export default function LifeMapAaaUniverse() {
  const [selectedId, setSelectedId] = useState(memoryStars[0].id)
  const [entered, setEntered] = useState(false)
  const index = Math.max(0, memoryStars.findIndex((star) => star.id === selectedId))
  const selected = memoryStars[index] ?? memoryStars[0]
  const focusHref = `/focus?memoryId=${selected.id}`
  const replayHref = `/replay?memoryId=${selected.id}&manifestId=replay-recovery-thread`

  const related = useMemo(
    () =>
      memoryStars
        .filter((star) => star.id !== selected.id && (star.era === selected.era || selected.links.includes(star.id)))
        .slice(0, 4),
    [selected],
  )

  const style = useMemo(
    () =>
      vars({
        '--camera-x': `${(50 - selected.x) * 0.19}vw`,
        '--camera-y': `${(46 - selected.y) * 0.16}vh`,
        '--selected-x': `${selected.x}%`,
        '--selected-y': `${selected.y}%`,
        '--selected-hue': selected.hue,
        '--selected-scale': selected.scale,
        '--selected-z': selected.z,
      }),
    [selected],
  )

  function select(id: string) {
    setSelectedId(id)
    setEntered(true)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    select(memoryStars[(index + direction + memoryStars.length) % memoryStars.length].id)
  }

  return (
    <main
      className="urai-life-map-aaa"
      data-entered={entered ? 'true' : 'false'}
      style={style}
      aria-labelledby="urai-life-map-title"
      onKeyDown={onKeyDown}
    >
      <a className="urai-life-map-aaa__skip" href="#life-map-command-rail">
        Skip to Life Map routes
      </a>

      <div className="urai-life-map-aaa__world" aria-hidden="true">
        <div className="urai-life-map-aaa__deep-sky" />
        <div className="urai-life-map-aaa__galaxy-river" />
        <div className="urai-life-map-aaa__emotional-weather urai-life-map-aaa__emotional-weather--aurora" />
        <div className="urai-life-map-aaa__emotional-weather urai-life-map-aaa__emotional-weather--storm" />
        <div className="urai-life-map-aaa__emotional-weather urai-life-map-aaa__emotional-weather--fog" />
        <div className="urai-life-map-aaa__life-plane">
          <span />
          <span />
          <span />
        </div>
        <div className="urai-life-map-aaa__horizon" />
      </div>

      <section className="urai-life-map-aaa__inscription" aria-label="Life Map introduction">
        <p>URAI Spatial · private life galaxy</p>
        <h1 id="urai-life-map-title">Life Map</h1>
        <span>
          Memories are stars. Relationships carry gravity. Emotional weather moves through the sky.
        </span>
      </section>

      <div className="urai-life-map-aaa__camera" aria-label="Navigable Life Map universe">
        <section className="urai-life-map-aaa__era-fields" aria-label="Life era regions">
          {eraRegions.map((era) => (
            <article
              key={era.name}
              className="urai-life-map-aaa__era"
              style={vars({
                '--era-x': `${era.x}%`,
                '--era-y': `${era.y}%`,
                '--era-w': `${era.w}vw`,
                '--era-h': `${era.h}vh`,
                '--era-hue': era.hue,
                '--era-tilt': `${era.tilt}deg`,
              })}
            >
              <strong>{era.name}</strong>
              <span>{era.detail}</span>
            </article>
          ))}
        </section>

        <svg className="urai-life-map-aaa__constellation-web" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <filter id="urai-life-map-aaa-glow">
              <feGaussianBlur stdDeviation="0.65" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {constellationLinks.map((link) => {
            const from = getStar(link.from)
            const to = getStar(link.to)
            if (!from || !to) return null
            const isSelected = from.id === selected.id || to.id === selected.id
            return (
              <line
                key={`${link.from}-${link.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="urai-life-map-aaa__constellation-line"
                data-selected={isSelected ? 'true' : 'false'}
                style={vars({
                  '--line-hue': link.hue,
                  '--line-strength': link.strength,
                })}
              />
            )
          })}
        </svg>

        <section className="urai-life-map-aaa__relationship-layer" aria-label="Relationship constellations">
          {relationshipBodies.map((body) => (
            <article
              key={body.name}
              className="urai-life-map-aaa__relationship-body"
              style={vars({
                '--body-x': `${body.x}%`,
                '--body-y': `${body.y}%`,
                '--body-gravity': body.gravity,
                '--body-hue': body.hue,
              })}
            >
              <span />
              <strong>{body.name}</strong>
              <em>{body.role}</em>
            </article>
          ))}
        </section>

        <section className="urai-life-map-aaa__stars" aria-label="Memory stars. Use left and right arrow keys to move through memories.">
          {memoryStars.map((star, starIndex) => {
            const isSelected = star.id === selected.id
            return (
              <button
                key={star.id}
                type="button"
                className="urai-life-map-aaa__star"
                data-selected={isSelected ? 'true' : 'false'}
                data-state={star.state}
                data-depth={star.z > 0.96 ? 'near' : star.z > 0.68 ? 'mid' : 'far'}
                aria-label={`Open ${star.title}. ${star.chapter}. ${star.emotion}.`}
                aria-pressed={isSelected}
                onClick={() => select(star.id)}
                style={vars({
                  '--x': `${star.x}%`,
                  '--y': `${star.y}%`,
                  '--z': star.z,
                  '--hue': star.hue,
                  '--scale': star.scale,
                  '--delay': `${starIndex * -0.42}s`,
                })}
              >
                <span className="urai-life-map-aaa__star-aura" />
                <span className="urai-life-map-aaa__star-ring" />
                <span className="urai-life-map-aaa__star-core" />
                <span className="urai-life-map-aaa__star-consent" />
                <span className="urai-life-map-aaa__star-label">
                  <strong>{star.title}</strong>
                  <em>{star.era} · {star.state}</em>
                </span>
              </button>
            )
          })}
        </section>

        <section className="urai-life-map-aaa__workforce-layer" aria-label="Private workforce activity">
          {workforceAgents.map((agent) => (
            <article
              key={agent.name}
              className="urai-life-map-aaa__agent"
              style={vars({
                '--agent-x': `${agent.x}%`,
                '--agent-y': `${agent.y}%`,
                '--agent-hue': agent.hue,
                '--agent-delay': `${agent.delay}s`,
              })}
            >
              <span />
              <strong>{agent.name}</strong>
              <em>{agent.action}</em>
            </article>
          ))}
        </section>

        <aside
          className="urai-life-map-aaa__memory-chamber"
          aria-live="polite"
          aria-label={`Selected memory: ${selected.title}`}
          style={vars({
            '--chamber-x': `${Math.min(Math.max(selected.x + 11, 32), 69)}%`,
            '--chamber-y': `${Math.min(Math.max(selected.y + 4, 27), 62)}%`,
            '--hue': selected.hue,
          })}
        >
          <div className="urai-life-map-aaa__chamber-core" aria-hidden="true">
            <span />
            <i />
            <b />
          </div>

          <div className="urai-life-map-aaa__chamber-copy">
            <small>{selected.chapter} · {selected.date}</small>
            <h2>{selected.title}</h2>
            <p>{selected.body}</p>
            <dl>
              <div>
                <dt>Emotion</dt>
                <dd>{selected.emotion}</dd>
              </div>
              <div>
                <dt>People</dt>
                <dd>{selected.people}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{selected.place}</dd>
              </div>
            </dl>
            <nav aria-label={`Enter ${selected.title}`}>
              <Link href={focusHref}>Enter Focus</Link>
              <Link href={replayHref}>Enter Replay</Link>
            </nav>
          </div>
        </aside>

        <aside
          className="urai-life-map-aaa__orb"
          aria-label="URAI orb companion"
          style={vars({
            '--orb-x': `${Math.min(Math.max(selected.x + 24, 44), 85)}%`,
            '--orb-y': `${Math.min(Math.max(selected.y + 17, 38), 76)}%`,
          })}
        >
          <span />
          <p>
            <strong>Orb companion</strong>
            <em>{selected.title} is open. The world is showing its links, weather, and private helper activity.</em>
          </p>
        </aside>
      </div>

      <aside className="urai-life-map-aaa__ownership" aria-label="Ownership and privacy readout">
        <p>Owned by you</p>
        <strong>Private galaxy locked</strong>
        <span>Consent rings visible · replay access user-controlled · legacy layer sealed by default</span>
      </aside>

      <aside className="urai-life-map-aaa__readout" aria-label="Life Map readout">
        <span>
          <strong>{memoryStars.length * 4 + 2}</strong>
          Memory stars
        </span>
        <span>
          <strong>{selected.era}</strong>
          Active era
        </span>
        <span>
          <strong>{related.length}</strong>
          Nearby links
        </span>
      </aside>

      <nav id="life-map-command-rail" className="urai-life-map-aaa__rail" aria-label="Spatial command rail">
        {rail.map(([label, href]) => (
          <Link key={href} href={href} data-active={label === 'Life Map' ? 'true' : 'false'}>
            {label}
          </Link>
        ))}
      </nav>
    </main>
  )
}
