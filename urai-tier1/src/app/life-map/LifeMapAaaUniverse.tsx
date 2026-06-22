'use client'

import Link from 'next/link'
import type { CSSProperties, KeyboardEvent } from 'react'
import { useMemo, useState } from 'react'

type Star = {
  id: string
  title: string
  chapter: string
  date: string
  body: string
  x: number
  y: number
  z: number
  hue: number
  scale: number
}

const stars: Star[] = [
  { id: 'seed-threshold-storm', title: 'Chapter of Becoming', chapter: 'Threshold', date: 'Mar 15, 2026', body: 'The scattered stars began to read as one life arc.', x: 42, y: 43, z: 1.12, hue: 218, scale: 1.18 },
  { id: 'seed-memory-bloom', title: 'Memory Bloom', chapter: 'Identity', date: 'Mar 18, 2026', body: 'A private image-form surfaced from the field.', x: 24, y: 36, z: .82, hue: 192, scale: .92 },
  { id: 'seed-recovery-arc', title: 'Recovery Arc', chapter: 'Body', date: 'Mar 21, 2026', body: 'A body thread held steady inside the replay path.', x: 74, y: 35, z: .78, hue: 344, scale: .92 },
  { id: 'seed-quiet-reset', title: 'Quiet Reset', chapter: 'Focus', date: 'Mar 27, 2026', body: 'A still point for focus, breath, and return.', x: 51, y: 62, z: 1.03, hue: 103, scale: .86 },
  { id: 'seed-night-window', title: 'Night Window', chapter: 'Replay', date: 'Apr 02, 2026', body: 'A replay window opened above the horizon.', x: 64, y: 22, z: .62, hue: 207, scale: .78 },
  { id: 'seed-consent-key', title: 'Consent Key', chapter: 'Passport', date: 'Apr 05, 2026', body: 'A consent artifact stayed private by default.', x: 84, y: 56, z: .55, hue: 332, scale: .72 },
  { id: 'seed-first-light', title: 'First Light', chapter: 'Home', date: 'Apr 09, 2026', body: 'The Home World became the entry point.', x: 36, y: 24, z: .7, hue: 50, scale: .88 },
  { id: 'seed-mirror-thread', title: 'Mirror Thread', chapter: 'Mirror', date: 'Apr 12, 2026', body: 'Identity reflected without leaving the world.', x: 81, y: 25, z: .5, hue: 267, scale: .66 },
]

const rail = [
  ['Home', '/home'],
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

export default function LifeMapAaaUniverse() {
  const [selectedId, setSelectedId] = useState(stars[0].id)
  const [entered, setEntered] = useState(false)
  const index = Math.max(0, stars.findIndex((star) => star.id === selectedId))
  const selected = stars[index]
  const focusHref = `/focus?memoryId=${selected.id}`
  const replayHref = `/replay?memoryId=${selected.id}&manifestId=replay-recovery-thread`

  const style = useMemo(() => vars({
    '--camera-x': `${(50 - selected.x) * .16}vw`,
    '--camera-y': `${(48 - selected.y) * .14}vh`,
    '--selected-x': `${selected.x}%`,
    '--selected-y': `${selected.y}%`,
    '--selected-hue': selected.hue,
    '--selected-scale': selected.scale,
  }), [selected])

  function select(id: string) {
    setSelectedId(id)
    setEntered(true)
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    select(stars[(index + direction + stars.length) % stars.length].id)
  }

  return (
    <main className="urai-life-map-aaa" data-entered={entered ? 'true' : 'false'} style={style} aria-labelledby="urai-life-map-title" onKeyDown={onKeyDown}>
      <a className="urai-life-map-aaa__skip" href="#life-map-command-rail">Skip to Life Map routes</a>

      <div className="urai-life-map-aaa__scene" aria-hidden="true">
        <div className="urai-life-map-aaa__sky" />
        <div className="urai-life-map-aaa__nebula urai-life-map-aaa__nebula--one" />
        <div className="urai-life-map-aaa__nebula urai-life-map-aaa__nebula--two" />
        <div className="urai-life-map-aaa__far-constellation" />
        <div className="urai-life-map-aaa__horizon-bloom" />
        <div className="urai-life-map-aaa__horizon-gates"><span /><span /><span /></div>
        <div className="urai-life-map-aaa__orbit urai-life-map-aaa__orbit--far" />
        <div className="urai-life-map-aaa__orbit urai-life-map-aaa__orbit--mid" />
        <div className="urai-life-map-aaa__orbit urai-life-map-aaa__orbit--near" />
        <div className="urai-life-map-aaa__terrain" />
        <div className="urai-life-map-aaa__terrain-grid" />
        <div className="urai-life-map-aaa__memory-dust" />
      </div>

      <section className="urai-life-map-aaa__title" aria-label="Life Map introduction">
        <p>URAI Spatial · Life Map</p>
        <h1 id="urai-life-map-title">Life Map</h1>
        <span>Click a memory star. The camera bends toward it. The memory opens in-world.</span>
      </section>

      <div className="urai-life-map-aaa__camera">
        <section className="urai-life-map-aaa__stars" aria-label="Memory constellation">
          {stars.map((star, starIndex) => (
            <button
              key={star.id}
              type="button"
              className="urai-life-map-aaa__star"
              data-selected={star.id === selected.id ? 'true' : 'false'}
              data-depth={star.z > .95 ? 'near' : star.z > .68 ? 'mid' : 'far'}
              aria-label={`Open memory star ${star.title}`}
              aria-pressed={star.id === selected.id}
              onClick={() => select(star.id)}
              style={vars({ '--x': `${star.x}%`, '--y': `${star.y}%`, '--z': star.z, '--hue': star.hue, '--scale': star.scale, '--delay': `${starIndex * -.42}s` })}
            >
              <span className="urai-life-map-aaa__star-aura" />
              <span className="urai-life-map-aaa__star-shell" />
              <span className="urai-life-map-aaa__star-core" />
              <span className="urai-life-map-aaa__star-image" />
              <span className="urai-life-map-aaa__star-label"><strong>{star.title}</strong><em>{star.chapter}</em></span>
            </button>
          ))}
        </section>

        <Link
          className="urai-life-map-aaa__portal"
          href={focusHref}
          aria-label={`Enter Focus for ${selected.title}`}
          style={vars({ '--portal-x': `${Math.min(Math.max(selected.x + 11, 34), 70)}%`, '--portal-y': `${Math.min(Math.max(selected.y + 3, 28), 58)}%`, '--hue': selected.hue })}
        >
          <span className="urai-life-map-aaa__portal-field" />
          <span className="urai-life-map-aaa__portal-image"><i /><b /></span>
          <span className="urai-life-map-aaa__portal-copy">
            <small>{selected.chapter} · {selected.date}</small>
            <strong>{selected.title}</strong>
            <em>{selected.body}</em>
            <span>Enter Focus</span>
          </span>
        </Link>

        <aside className="urai-life-map-aaa__support" aria-label={`Selected memory: ${selected.title}`}>
          <small>{selected.chapter} · {selected.date}</small>
          <strong>{selected.title}</strong>
          <p>{selected.body}</p>
          <div><Link href={focusHref}>Enter Focus</Link><Link href={replayHref}>Enter Replay</Link></div>
        </aside>

        <aside className="urai-life-map-aaa__orb" aria-label="URAI orb companion" style={vars({ '--orb-x': `${Math.min(Math.max(selected.x + 23, 45), 86)}%`, '--orb-y': `${Math.min(Math.max(selected.y + 16, 38), 76)}%` })}>
          <span />
          <p><strong>Orb companion</strong><em>{selected.title} is open. Choose Focus or Replay to enter the memory.</em></p>
        </aside>
      </div>

      <aside className="urai-life-map-aaa__readout" aria-label="Life Map readout">
        <span><strong>{stars.length * 4 + 2}</strong>Stars</span>
        <span><strong>{selected.title}</strong>Selected</span>
        <span><strong>{Math.round(selected.z * 100)}%</strong>Camera pull</span>
      </aside>

      <nav id="life-map-command-rail" className="urai-life-map-aaa__rail" aria-label="Spatial command rail">
        {rail.map(([label, href]) => <Link key={href} href={href} data-active={label === 'Life Map' ? 'true' : 'false'}>{label}</Link>)}
      </nav>
    </main>
  )
}
