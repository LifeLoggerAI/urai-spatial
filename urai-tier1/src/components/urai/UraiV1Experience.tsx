'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { demoCouncilMembers, demoMemoryStars, demoPassportStatus, demoPrivacyPrinciples, demoReplayScenes } from '@/lib/urai-demo-data'

type UraiV1Mode = 'home' | 'life-map' | 'replay' | 'demo' | 'privacy'

type UraiV1ExperienceProps = {
  mode?: UraiV1Mode
  profileLabel?: string
}

const navItems = [
  { label: 'Life Map', href: '/life-map' },
  { label: 'Replay', href: '/replay' },
  { label: 'Demo', href: '/demo' }
]

function GlassPanel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`urai-glass ${className}`}>{children}</section>
}

function FloatingMemoryStars() {
  return (
    <div className="urai-floating-stars" aria-hidden="true">
      {demoMemoryStars.slice(0, 9).map((star, index) => (
        <span
          key={star.id}
          style={{
            left: `${8 + ((star.x + index * 7) % 84)}%`,
            top: `${10 + ((star.y + index * 5) % 64)}%`,
            width: `${Math.max(5, star.size - 4)}px`,
            height: `${Math.max(5, star.size - 4)}px`,
            background: star.color,
            animationDelay: `${index * 0.34}s`
          }}
        />
      ))}
    </div>
  )
}

function UraiShell({ children, profileLabel, privacyNotice }: { children: React.ReactNode; profileLabel?: string; privacyNotice?: boolean }) {
  return (
    <main className="urai-v1-shell urai-home-shell" data-urai-home-spatial-shell="true">
      <div className="urai-cosmic-bg" />
      <FloatingMemoryStars />
      <div className="urai-ground-horizon" />
      <header className="urai-v1-header">
        <div>
          <p>URAI FULL-SYSTEM LAUNCH V1.0</p>
          <h2>{profileLabel ?? 'Home Field'}</h2>
        </div>
        <nav aria-label="URAI launch navigation">
          {navItems.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
      </header>
      {privacyNotice ? <div className="urai-demo-notice">This public field uses seeded demo data. No private user data is shown.</div> : null}
      <div className="urai-v1-content">{children}</div>
    </main>
  )
}

function OrbCompanion() {
  return (
    <div className="urai-orb-row">
      <div className="urai-orb" aria-hidden="true"><span /><b /></div>
      <div>
        <p className="urai-kicker">Orb Companion</p>
        <h3>Council online</h3>
        <span>Your first signals are forming. Private by default.</span>
      </div>
    </div>
  )
}

function CouncilPanel() {
  return (
    <GlassPanel className="urai-council-panel">
      <p className="urai-kicker">Council online</p>
      <div className="urai-council-grid">
        {demoCouncilMembers.map((member) => <span key={member}>{member}</span>)}
      </div>
    </GlassPanel>
  )
}

function NarratorWhisper() {
  return (
    <GlassPanel className="urai-whisper-panel">
      <strong>Narrator whisper</strong>
      <p>Your sky is quiet, but the field is beginning to brighten. This demo uses seeded symbolic data only.</p>
    </GlassPanel>
  )
}

function CouncilChatDemo() {
  const [value, setValue] = useState('')
  const [reply, setReply] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim()) return
    setReply('In the full URAI experience, the Council reflects on your private patterns with consent. This public demo uses symbolic seed data only.')
    setValue('')
  }
  return (
    <GlassPanel className="urai-chat-panel">
      <strong>Ask the Council</strong>
      <form onSubmit={submit}>
        <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Ask what your field is noticing…" aria-label="Ask the Council" />
        <button type="submit">Ask</button>
      </form>
      {reply ? <p>{reply}</p> : null}
    </GlassPanel>
  )
}

function HomeField({ profileLabel, demo = false }: { profileLabel?: string; demo?: boolean }) {
  const cards = [
    ['Life Map', 'Memory stars, fields, and chapters', '/life-map'],
    ['Replay', 'Cinematic emotional timeline', '/replay'],
    ['Privacy', 'Export, delete, opt out', '/privacy'],
    ['Public Demo', 'Seeded launch surface', '/demo']
  ]

  return (
    <UraiShell profileLabel={profileLabel} privacyNotice={demo}>
      <section className="urai-home-grid">
        <GlassPanel className="urai-hero-card">
          <p className="urai-kicker">Passive Emotional Intelligence</p>
          <h1>Your life becomes a living map.</h1>
          <p>URAI turns private signals into mood weather, memory stars, recovery blooms, symbolic replay, and an orb companion that reflects patterns with care.</p>
          <Link href="/life-map" className="urai-sky-panel" aria-label="Tap the sky to open your life map">
            <small>Tap the sky to open your life map</small>
            {demoMemoryStars.slice(0, 7).map((star) => <i key={star.id} style={{ left: `${star.x}%`, top: `${star.y}%`, background: star.color }} />)}
          </Link>
        </GlassPanel>
        <aside className="urai-side-stack">
          <GlassPanel><OrbCompanion /></GlassPanel>
          <NarratorWhisper />
          <div className="urai-card-grid">
            {cards.map(([title, text, href]) => (
              <Link key={title} href={href} className="urai-nav-card"><strong>{title}</strong><span>{text}</span></Link>
            ))}
          </div>
          <CouncilPanel />
          <CouncilChatDemo />
        </aside>
      </section>
    </UraiShell>
  )
}

function MemoryGalaxy() {
  const [selectedId, setSelectedId] = useState(demoMemoryStars[0]?.id)
  const selected = demoMemoryStars.find((star) => star.id === selectedId) ?? demoMemoryStars[0]
  const chapterCounts = useMemo(() => demoMemoryStars.reduce<Record<string, number>>((acc, star) => {
    acc[star.chapter] = (acc[star.chapter] ?? 0) + 1
    return acc
  }, {}), [])

  return (
    <UraiShell>
      <section className="urai-page-title">
        <p className="urai-kicker">URAI Life Map</p>
        <h1>Memory Galaxy</h1>
        <span>15 memory stars • 8 timeline constellations • demo field</span>
      </section>
      <section className="urai-life-map-layout urai-spatial-stage lifemap-starfield">
        <GlassPanel className="urai-selected-memory">
          <p className="urai-kicker">Selected star</p>
          <h2>{selected.title}</h2>
          <dl>
            <div><dt>Tone</dt><dd>{selected.emotionalTone}</dd></div>
            <div><dt>Archetype</dt><dd>{selected.archetype}</dd></div>
            <div><dt>Chapter</dt><dd>{selected.chapter}</dd></div>
          </dl>
          <p>{selected.summary}</p>
          <Link href="/replay">Open Replay</Link>
        </GlassPanel>
        <GlassPanel className="urai-galaxy-panel">
          <svg className="urai-constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {demoMemoryStars.flatMap((star) => star.relatedIds.map((relatedId) => {
              const related = demoMemoryStars.find((item) => item.id === relatedId)
              if (!related) return null
              return <line key={`${star.id}-${related.id}`} x1={star.x} y1={star.y} x2={related.x} y2={related.y} />
            }))}
          </svg>
          {demoMemoryStars.map((star) => (
            <button
              type="button"
              key={star.id}
              className={`urai-memory-star ${selected.id === star.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedId(star.id)}
              style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size + 8}px`, height: `${star.size + 8}px`, background: star.color, boxShadow: `0 0 ${24 + star.intensity * 50}px ${star.color}` }}
              aria-label={`Select ${star.title}`}
            ><span>{star.title}</span></button>
          ))}
        </GlassPanel>
        <GlassPanel className="urai-chapter-panel">
          <p className="urai-kicker">Constellations</p>
          <h2>Timeline chapters</h2>
          {Object.entries(chapterCounts).map(([chapter, count]) => <div key={chapter} className="urai-chapter-row"><span>{chapter}</span><b>{count}</b></div>)}
        </GlassPanel>
      </section>
    </UraiShell>
  )
}

function ReplayPage() {
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setActive((value) => (value + 1) % demoReplayScenes.length), 2000)
    return () => window.clearInterval(timer)
  }, [playing])
  return (
    <UraiShell>
      <section className="urai-page-title">
        <p className="urai-kicker">Cinematic Timeline</p>
        <h1>Symbolic Replay</h1>
        <span>A cinematic timeline of emotional weather, memory stars, and recovery blooms.</span>
        <button type="button" onClick={() => setPlaying((value) => !value)}>{playing ? 'Pause Demo Replay' : 'Play Demo Replay'}</button>
      </section>
      <section className="urai-replay-scenes">
        {demoReplayScenes.map((scene, index) => (
          <GlassPanel key={scene.id} className={`urai-replay-card ${active === index ? 'is-active' : ''}`}>
            <div className="urai-aura-card"><span>{scene.aura}</span></div>
            <small>{scene.timestamp}</small>
            <h2>{scene.title}</h2>
            <p className="urai-kicker">{scene.mood}</p>
            <p>{scene.narratorLine}</p>
          </GlassPanel>
        ))}
      </section>
    </UraiShell>
  )
}

function PrivacyPage() {
  return (
    <UraiShell>
      <section className="urai-page-title">
        <p className="urai-kicker">Privacy foundation</p>
        <h1>Private by default. User-owned by design.</h1>
        <span>URAI’s public launch field uses seeded demo data only. Private signals stay consented, exportable, and removable.</span>
      </section>
      <section className="urai-privacy-grid">
        {demoPrivacyPrinciples.map((principle) => <GlassPanel key={principle}><h2>{principle}</h2><p>{privacyCopy(principle)}</p></GlassPanel>)}
        <GlassPanel className="urai-passport-card"><p className="urai-kicker">{demoPassportStatus.status}</p><h2>{demoPassportStatus.title}</h2><p>{demoPassportStatus.description}</p></GlassPanel>
      </section>
    </UraiShell>
  )
}

function privacyCopy(principle: string) {
  const copy: Record<string, string> = {
    'Private by default': 'The launch surface is designed to show the magic without exposing private user patterns.',
    'Exportable data': 'URAI’s V1 direction keeps user memory and signal records portable.',
    'Delete controls': 'Users must be able to remove data and opt out of public sharing surfaces.',
    'Opt-in public demo': 'Public fields should be intentional, seeded, or explicitly approved.',
    'No ads inside URAI': 'URAI remains an emotional operating system, not an advertising surface.',
    'User-owned data philosophy': 'Future data access belongs behind permission layers like URAI Passport.'
  }
  return copy[principle] ?? 'A calm, consent-aware foundation for symbolic memory.'
}

export default function UraiV1Experience({ mode = 'home', profileLabel }: UraiV1ExperienceProps) {
  if (mode === 'life-map') return <MemoryGalaxy />
  if (mode === 'replay') return <ReplayPage />
  if (mode === 'privacy') return <PrivacyPage />
  if (mode === 'demo') return <HomeField profileLabel={profileLabel ?? 'Public Demo Field'} demo />
  return <HomeField profileLabel={profileLabel} />
}
