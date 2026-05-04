'use client'

import { useEffect, useMemo, useState } from 'react'

type Mode = 'home' | 'ascent' | 'lifemap' | 'focus' | 'replay' | 'mirror'

const STAR_COUNT = 160
const SKY_BANDS = 5

function modeFromLocation(): Mode {
  if (typeof window === 'undefined') return 'home'
  const url = new URL(window.location.href)
  const source = `${url.pathname} ${url.searchParams.get('phase') ?? ''}`.toLowerCase()
  if (source.includes('replay')) return 'replay'
  if (source.includes('mirror')) return 'mirror'
  if (source.includes('focus')) return 'focus'
  if (source.includes('life-map') || source.includes('lifemap')) return 'lifemap'
  if (source.includes('ascent')) return 'ascent'
  return 'home'
}

export default function SpatialScene() {
  const [mode, setMode] = useState<Mode>('home')
  const [ascentArmed, setAscentArmed] = useState(false)
  const stars = useMemo(() => Array.from({ length: STAR_COUNT }, (_, i) => ({ x: (i * 29) % 100, y: (i * 47) % 100, o: 0.15 + ((i * 17) % 70) / 100, size: 1 + ((i * 13) % 3) })), [])

  useEffect(() => {
    const sync = () => setMode(modeFromLocation())
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    if (!ascentArmed) return
    const ascent = window.setTimeout(() => setMode('ascent'), 10)
    const lift = window.setTimeout(() => {
      setMode('lifemap')
      window.history.replaceState(null, '', '/life-map')
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, 1400)
    return () => {
      window.clearTimeout(ascent)
      window.clearTimeout(lift)
    }
  }, [ascentArmed])

  return (
    <div data-testid="urai-spatial-stage" data-mode={mode} className={`spatial-stage mode-${mode}`}>
      <div data-testid="urai-home-sky" className="bg-sky" aria-hidden>
        {Array.from({ length: SKY_BANDS }, (_, idx) => <b key={idx} style={{ opacity: 0.22 - idx * 0.03 }} />)}
      </div>
      <div className="bg-nebula" />
      <div className="bg-stars" aria-hidden>
        {stars.map((s, i) => <i key={i} style={{ left: `${s.x}%`, top: `${s.y}%`, opacity: s.o, width: s.size, height: s.size }} />)}
      </div>

      {mode === 'home' ? <section data-testid="urai-home-scene" className="home-scene">
        <div data-testid="urai-home-horizon" className="home-horizon" />
        <div data-testid="urai-home-ground" className="home-ground" />
        <div data-testid="urai-home-body" className="home-body" />
        <div data-testid="urai-home-orb-shell" className="orb-shell">
          <button data-testid="urai-orb-button" className="orb-button" onClick={() => setAscentArmed(true)} aria-label="Enter LifeMap" />
          <span className="orb-ring ring-a" />
          <span className="orb-ring ring-b" />
        </div>
      </section> : null}

      {mode === 'ascent' ? <section data-testid="urai-ascent-cover" className="ascent-cover" /> : null}
      {(mode === 'lifemap' || mode === 'focus' || mode === 'replay' || mode === 'mirror') ? <section data-testid="urai-lifemap-scene" className="lifemap-scene" /> : null}

      <style jsx>{`
      .spatial-stage{position:fixed;inset:0;z-index:0;background:#020617;overflow:hidden;color:#dbeafe}
      .bg-sky,.bg-nebula,.bg-stars,.home-scene,.ascent-cover,.lifemap-scene{position:absolute;inset:0}
      .bg-sky{background:linear-gradient(180deg,#020617 0%,#0f172a 48%,#111827 70%,#020617 100%)}
      .bg-sky b{position:absolute;left:-12%;right:-12%;height:24%;border-radius:50%;background:radial-gradient(circle at center,rgba(125,211,252,.24),transparent 70%);animation:skyShift 14s ease-in-out infinite alternate}
      .bg-sky b:nth-child(1){top:-8%}.bg-sky b:nth-child(2){top:8%}.bg-sky b:nth-child(3){top:22%}.bg-sky b:nth-child(4){top:38%}.bg-sky b:nth-child(5){top:58%}
      .bg-nebula{inset:-15%;background:radial-gradient(circle at 50% 40%,rgba(125,211,252,.20),transparent 35%),radial-gradient(circle at 82% 28%,rgba(196,181,253,.20),transparent 35%),radial-gradient(circle at 18% 80%,rgba(45,212,191,.12),transparent 33%);animation:drift 16s ease-in-out infinite alternate}
      .bg-stars i{position:absolute;border-radius:999px;background:#fff;box-shadow:0 0 12px #fff;animation:twinkle 2.6s ease-in-out infinite alternate}
      .home-horizon{position:absolute;left:-8%;right:-8%;top:56%;height:26%;border-radius:50%;background:radial-gradient(ellipse at center,rgba(125,211,252,.3),rgba(30,41,59,0) 70%);filter:blur(2px)}
      .home-ground{position:absolute;left:-15%;right:-15%;bottom:-35%;height:62%;border-radius:50%;background:radial-gradient(ellipse at top,rgba(15,23,42,.92) 0%,rgba(2,6,23,.98) 58%,#000 100%);box-shadow:inset 0 30px 90px rgba(125,211,252,.18)}
      .home-body{position:absolute;left:50%;top:58%;width:min(60vw,420px);aspect-ratio:1/1;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,#1d4ed8 0,#1e1b4b 55%,transparent 75%);filter:blur(2px)}
      .orb-shell{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);display:grid;place-items:center;width:180px;height:180px}
      .orb-button{width:94px;height:94px;border:none;border-radius:50%;background:radial-gradient(circle,#fff,#7dd3fc 60%,#1d4ed8);box-shadow:0 0 34px #7dd3fc,0 0 80px rgba(125,211,252,.5);cursor:pointer;z-index:2}
      .orb-ring{position:absolute;border:1px solid rgba(191,219,254,.42);border-radius:50%;animation:orbit 5.4s linear infinite}
      .ring-a{width:128px;height:128px}.ring-b{width:160px;height:160px;animation-direction:reverse;animation-duration:8.6s}
      .ascent-cover{background:linear-gradient(180deg,rgba(2,6,23,.1),rgba(2,6,23,.9));animation:ascent 1.4s ease forwards}
      @keyframes ascent{from{opacity:.15}to{opacity:1}}
      @keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(-2%,1%,0)}}
      @keyframes twinkle{from{opacity:.3;transform:scale(.8)}to{opacity:1;transform:scale(1.2)}}
      @keyframes orbit{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      @keyframes skyShift{from{transform:translate3d(0,0,0)}to{transform:translate3d(2%,1%,0)}}
      `}</style>
    </div>
  )
}
