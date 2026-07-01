'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'

type GalaxyStar = {
  id: string
  title: string
  subtitle: string
  x: number
  y: number
  z: number
  size: number
  aura: string
  replay: boolean
  family: string
  era: string
}

const titles = [
  ['quiet-reset', 'The Quiet Reset', 'Recovery memory', 'Recovery', 'Today'],
  ['threshold-moment', 'Threshold Moment', 'Turning point', 'Threshold', 'March'],
  ['memory-thread', 'Memory Thread', 'Recent signal', 'Memory', 'Now'],
  ['recovery-bloom', 'Recovery Bloom', 'Return path', 'Recovery', 'Afterward'],
  ['relationship-echo', 'Relationship Echo', 'Social orbit', 'Relationship', 'Social'],
  ['legacy-thread', 'Legacy Thread', 'Deep time', 'Legacy', 'Long arc'],
  ['seasonal-arc', 'Seasonal Arc', 'Life weather', 'Season', 'Spring'],
  ['ritual-marker', 'Ritual Marker', 'Grounding ritual', 'Ritual', 'Weekly'],
  ['forecast-path', 'Forecast Path', 'Ahead', 'Forecast', 'Ahead'],
  ['first-light', 'First Light', 'Opening memory', 'Memory', 'Origin'],
  ['body-signal', 'Body Signal', 'Nervous system', 'Body', 'Signal'],
  ['home-anchor', 'Home Anchor', 'Safe place', 'Ground', 'Home'],
] as const

const auras = ['#9ff7ff', '#d7b4ff', '#ff7bd6', '#cfeaff', '#7ddcff', '#f7e7b7', '#b68cff', '#66f2c4']

function makeStars(): GalaxyStar[] {
  return Array.from({ length: 34 }, (_, index) => {
    const base = titles[index % titles.length]
    const ring = Math.floor(index / 6)
    const angle = index * 2.399963 + ring * 0.43
    const radius = 9 + Math.sqrt(index + 2) * 6.9
    const x = 50 + Math.cos(angle) * radius * (index % 3 === 0 ? 1.28 : 1)
    const y = 50 + Math.sin(angle) * radius * 0.46 + Math.sin(index * 0.9) * 8.5
    const z = (index % 9) - 4

    return {
      id: index === 0 ? 'quiet-reset' : `${base[0]}-${index}`,
      title: index === 0 ? 'The Quiet Reset' : base[1],
      subtitle: base[2],
      family: base[3],
      era: base[4],
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(13, Math.min(82, y)),
      z,
      size: 0.78 + ((index * 17) % 44) / 100,
      aura: auras[index % auras.length],
      replay: index % 4 !== 2,
    }
  })
}

function starStyle(star: GalaxyStar, selected: boolean): CSSProperties {
  return {
    '--x': `${star.x}%`,
    '--y': `${star.y}%`,
    '--z': star.z,
    '--s': selected ? star.size * 1.2 : star.size,
    '--aura': star.aura,
    '--delay': `${Math.abs(star.z) * -0.31}s`,
  } as CSSProperties
}

export default function RealLifeMapGalaxy() {
  const router = useRouter()
  const stars = useMemo(() => makeStars(), [])
  const [selected, setSelected] = useState<GalaxyStar>(stars[0])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const openFocus = () => router.push(`/focus?memoryId=${encodeURIComponent(selected.id)}`)
  const openReplay = () => router.push(`/replay?memoryId=${encodeURIComponent(selected.id)}&manifestId=replay-recovery-thread`)

  const sceneStyle = {
    '--rx': `${tilt.y}deg`,
    '--ry': `${tilt.x}deg`,
    '--selected-x': `${selected.x}%`,
    '--selected-y': `${selected.y}%`,
    '--selected-aura': selected.aura,
  } as CSSProperties

  return (
    <main
      className="lifeGalaxy"
      aria-label="URAI Life Map memory galaxy"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const px = (event.clientX - rect.left) / rect.width - 0.5
        const py = (event.clientY - rect.top) / rect.height - 0.5
        setTilt({ x: px * 9, y: py * -6 })
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="void" />
      <div className="cosmicNoise" />
      <div className="starDust dustA" />
      <div className="starDust dustB" />

      <section className="galaxyScene" style={sceneStyle} aria-label="Spatial memory star field">
        <div className="galaxyDisc" />
        <div className="galaxyArm armA" />
        <div className="galaxyArm armB" />
        <div className="galaxyArm armC" />
        <div className="coreGlow" />
        <div className="selectedAura" />

        <svg className="filaments" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {stars.slice(0, 25).map((star, index) => {
            const target = stars[(index * 3 + 7) % stars.length]
            const active = selected.id === star.id || selected.id === target.id
            return (
              <path
                key={`${star.id}-${target.id}`}
                d={`M ${star.x} ${star.y} C ${(star.x + target.x) / 2} ${Math.min(star.y, target.y) - 12}, ${(star.x + target.x) / 2} ${Math.max(star.y, target.y) + 8}, ${target.x} ${target.y}`}
                className={active ? 'filament active' : 'filament'}
              />
            )
          })}
        </svg>

        <div className="depthRings" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <section className="field" aria-label="Memory stars">
          {stars.map((star) => {
            const active = star.id === selected.id
            return (
              <button
                key={star.id}
                type="button"
                className={active ? 'memoryStar selected' : 'memoryStar'}
                style={starStyle(star, active)}
                onClick={() => setSelected(star)}
                onDoubleClick={() => router.push(`/focus?memoryId=${encodeURIComponent(star.id)}`)}
                aria-label={`Select ${star.title}`}
              >
                <span className="starHit" />
                <span className="starHalo" />
                <span className="starCore" />
                <span className="starSpike spikeA" />
                <span className="starSpike spikeB" />
                <span className="starLabel">{star.title}</span>
              </button>
            )
          })}
        </section>
      </section>

      <header className="titlePlate">
        <p>URAI · Life Map</p>
        <h1>Spatial memory galaxy.</h1>
        <span>34 private stars awake. Drag across the field to feel depth. Select a light to move inside the memory.</span>
      </header>

      <aside className="controlPlate">
        <p>Selected memory star</p>
        <h2>{selected.title}</h2>
        <span>{selected.subtitle}. {selected.family} · {selected.era}. Focus opens from the star. Replay becomes the memory film.</span>
        <div className="actions">
          <button type="button" onClick={openFocus}>Enter Focus</button>
          <button type="button" onClick={openReplay} disabled={!selected.replay}>Replay</button>
          <button type="button" onClick={() => setSelected(stars[0])}>Recenter</button>
        </div>
      </aside>

      <div className="companionOrb" aria-hidden="true">
        <span />
      </div>

      <nav className="routeBar" aria-label="URAI route portals">
        {[
          ['Home', '/home'],
          ['Ground', '/ground'],
          ['Focus', '/focus'],
          ['Replay', '/replay'],
          ['Mirror', '/mirror'],
          ['Passport', '/passport'],
          ['XR', '/spatial/ar-vr'],
        ].map(([label, href]) => (
          <Link key={href} href={href}>{label}</Link>
        ))}
      </nav>

      <style jsx>{`
        .lifeGalaxy {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          color: white;
          background: #000107;
          isolation: isolate;
          cursor: crosshair;
        }

        .void {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 46%, rgba(240, 255, 255, 0.1), transparent 9%),
            radial-gradient(circle at 30% 42%, rgba(72, 232, 255, 0.14), transparent 28%),
            radial-gradient(circle at 72% 46%, rgba(175, 94, 255, 0.16), transparent 31%),
            radial-gradient(circle at 55% 72%, rgba(90, 245, 210, 0.08), transparent 24%),
            linear-gradient(180deg, #00020a 0%, #02030d 50%, #000106 100%);
          z-index: 0;
        }

        .cosmicNoise {
          position: absolute;
          inset: 0;
          z-index: 1;
          opacity: 0.16;
          background-image:
            linear-gradient(115deg, transparent 0 48%, rgba(255,255,255,0.07) 49%, transparent 50% 100%),
            linear-gradient(65deg, transparent 0 48%, rgba(125,240,255,0.05) 49%, transparent 50% 100%);
          background-size: 34px 34px, 55px 55px;
          mask-image: radial-gradient(ellipse at center, black 0 44%, transparent 76%);
        }

        .starDust {
          position: absolute;
          inset: -12%;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.92) 0 1px, transparent 1.35px),
            radial-gradient(circle, rgba(140,232,255,0.72) 0 1px, transparent 1.25px),
            radial-gradient(circle, rgba(220,190,255,0.62) 0 1px, transparent 1.2px);
          background-size: 97px 97px, 151px 151px, 239px 239px;
          background-position: 0 0, 31px 57px, 81px 13px;
          opacity: 0.5;
          z-index: 2;
        }

        .dustB {
          transform: scale(1.2) rotate(4deg);
          opacity: 0.32;
          filter: blur(0.45px);
        }

        .galaxyScene {
          position: absolute;
          inset: -8vh -8vw;
          z-index: 4;
          transform-style: preserve-3d;
          transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry));
          transition: transform 180ms ease-out;
        }

        .galaxyDisc {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 126vw;
          height: 44vh;
          transform: translate(-50%, -50%) rotate(-7deg) translateZ(-120px);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(248,255,255,0.58), rgba(137,235,255,0.24) 9%, rgba(139,99,255,0.14) 28%, rgba(255,255,255,0.035) 48%, transparent 72%),
            radial-gradient(ellipse at 42% 48%, rgba(92, 243, 255, 0.22), transparent 34%),
            radial-gradient(ellipse at 62% 48%, rgba(204, 128, 255, 0.24), transparent 36%);
          filter: blur(0.3px);
          opacity: 0.78;
          mask-image: radial-gradient(ellipse at center, black 0 48%, transparent 76%);
          animation: galaxyDrift 20s ease-in-out infinite alternate;
        }

        .galaxyArm {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 82vw;
          height: 24vh;
          border: 1px solid rgba(210, 250, 255, 0.12);
          border-left-color: transparent;
          border-bottom-color: rgba(180, 140, 255, 0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%) rotate(-8deg) translateZ(-30px);
          filter: blur(0.2px) drop-shadow(0 0 28px rgba(119, 230, 255, 0.12));
          opacity: 0.52;
        }

        .armB {
          width: 98vw;
          height: 30vh;
          transform: translate(-50%, -50%) rotate(7deg) translateZ(-80px);
          opacity: 0.36;
        }

        .armC {
          width: 58vw;
          height: 18vh;
          transform: translate(-50%, -50%) rotate(-31deg) translateZ(20px);
          opacity: 0.26;
        }

        .coreGlow {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 22vw;
          height: 14vh;
          transform: translate(-50%, -50%) translateZ(40px);
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.82), rgba(166,236,255,0.34) 24%, rgba(185,124,255,0.15) 46%, transparent 70%);
          filter: blur(6px);
          opacity: 0.7;
          pointer-events: none;
        }

        .selectedAura {
          position: absolute;
          left: var(--selected-x);
          top: var(--selected-y);
          width: 190px;
          height: 190px;
          transform: translate(-50%, -50%) translateZ(90px);
          border-radius: 999px;
          background: radial-gradient(circle, color-mix(in srgb, var(--selected-aura) 42%, white) 0 4%, var(--selected-aura) 18%, rgba(255,255,255,0.05) 32%, transparent 70%);
          opacity: 0.48;
          filter: blur(10px);
          pointer-events: none;
          transition: left 460ms cubic-bezier(.2,.8,.2,1), top 460ms cubic-bezier(.2,.8,.2,1), background 460ms ease;
        }

        .filaments {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          transform: translateZ(40px);
        }

        .filament {
          fill: none;
          stroke: rgba(180, 242, 255, 0.11);
          stroke-width: 0.075;
          stroke-dasharray: 0.45 1.65;
          filter: drop-shadow(0 0 5px rgba(126, 239, 255, 0.12));
        }

        .filament.active {
          stroke: rgba(238, 255, 255, 0.54);
          stroke-width: 0.13;
          stroke-dasharray: 0.9 1.1;
        }

        .depthRings {
          position: absolute;
          left: 50%;
          top: 52%;
          z-index: 5;
          transform: translate(-50%, -50%) rotateX(68deg) rotateZ(-7deg) translateZ(-40px);
          transform-style: preserve-3d;
          pointer-events: none;
        }

        .depthRings span {
          position: absolute;
          inset: 50%;
          width: 36vw;
          height: 36vw;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(190, 244, 255, 0.11);
          border-radius: 999px;
          box-shadow: 0 0 44px rgba(125, 240, 255, 0.08);
        }

        .depthRings span:nth-child(2) { width: 56vw; height: 56vw; opacity: 0.62; }
        .depthRings span:nth-child(3) { width: 76vw; height: 76vw; opacity: 0.36; }

        .field {
          position: absolute;
          inset: 0;
          z-index: 8;
          transform-style: preserve-3d;
        }

        .memoryStar {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: calc(18px * var(--s));
          height: calc(18px * var(--s));
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: transparent;
          transform: translate(-50%, -50%) translateZ(calc(var(--z) * 26px));
          transform-style: preserve-3d;
          cursor: pointer;
          transition: transform 420ms cubic-bezier(.2,.8,.2,1), filter 260ms ease;
        }

        .memoryStar:hover,
        .memoryStar.selected {
          filter: saturate(1.3) brightness(1.15);
          z-index: 9;
        }

        .starHit,
        .starHalo,
        .starCore,
        .starSpike,
        .starLabel {
          position: absolute;
          pointer-events: none;
        }

        .starHit {
          inset: -22px;
          border-radius: 999px;
        }

        .starHalo {
          left: 50%;
          top: 50%;
          width: calc(82px * var(--s));
          height: calc(82px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, color-mix(in srgb, var(--aura) 62%, white) 0 3%, var(--aura) 8%, rgba(255,255,255,0.08) 24%, transparent 68%);
          opacity: 0.52;
          filter: blur(1px);
          animation: breathe 4.2s ease-in-out infinite alternate;
          animation-delay: var(--delay);
        }

        .starCore {
          left: 50%;
          top: 50%;
          width: calc(9px * var(--s));
          height: calc(9px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, white 0 18%, color-mix(in srgb, var(--aura) 70%, white) 19% 44%, var(--aura) 45% 66%, transparent 67%);
          box-shadow:
            0 0 12px color-mix(in srgb, var(--aura) 85%, white),
            0 0 36px var(--aura),
            0 0 94px color-mix(in srgb, var(--aura) 70%, transparent);
        }

        .starSpike {
          left: 50%;
          top: 50%;
          width: calc(2px * var(--s));
          height: calc(38px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.75), transparent);
          opacity: 0.38;
        }

        .spikeB {
          transform: translate(-50%, -50%) rotate(90deg);
          height: calc(31px * var(--s));
          opacity: 0.25;
        }

        .starLabel {
          left: 50%;
          top: calc(50% + 22px);
          transform: translateX(-50%) translateZ(80px);
          width: max-content;
          max-width: 160px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.42);
          padding: 0.22rem 0.48rem;
          color: rgba(236, 254, 255, 0.92);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.02em;
          opacity: 0;
          backdrop-filter: blur(12px);
          transition: opacity 180ms ease, transform 180ms ease;
        }

        .memoryStar:hover .starLabel,
        .memoryStar.selected .starLabel {
          opacity: 1;
          transform: translateX(-50%) translateY(2px) translateZ(80px);
        }

        .memoryStar.selected .starHalo {
          width: calc(128px * var(--s));
          height: calc(128px * var(--s));
          opacity: 0.88;
        }

        .memoryStar.selected .starCore {
          width: calc(15px * var(--s));
          height: calc(15px * var(--s));
        }

        .titlePlate,
        .controlPlate {
          position: absolute;
          z-index: 20;
          border: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(145deg, rgba(0, 0, 0, 0.42), rgba(8, 16, 30, 0.26));
          box-shadow: 0 24px 90px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.08);
          backdrop-filter: blur(20px);
        }

        .titlePlate {
          left: 1rem;
          top: 1rem;
          max-width: 335px;
          border-radius: 26px;
          padding: 1rem;
        }

        .titlePlate p,
        .controlPlate p {
          margin: 0;
          color: rgba(165, 243, 252, 0.88);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }

        .titlePlate h1 {
          margin: 0.38rem 0 0;
          font-size: clamp(2rem, 4.2vw, 4.1rem);
          line-height: 0.84;
          letter-spacing: -0.08em;
        }

        .titlePlate span,
        .controlPlate span {
          display: block;
          margin-top: 0.65rem;
          color: rgba(235, 252, 255, 0.76);
          font-size: 13px;
          font-weight: 750;
          line-height: 1.45;
        }

        .controlPlate {
          right: 1.15rem;
          bottom: 5rem;
          width: min(410px, calc(100vw - 2rem));
          border-radius: 30px;
          padding: 1.08rem;
        }

        .controlPlate h2 {
          margin: 0.35rem 0 0;
          font-size: clamp(1.7rem, 3vw, 2.35rem);
          line-height: 0.95;
          letter-spacing: -0.055em;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
          margin-top: 0.95rem;
        }

        .controlPlate button {
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          padding: 0.72rem 1rem;
          background: rgba(255,255,255,0.06);
          color: white;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
        }

        .controlPlate button:first-child {
          background: rgba(207, 250, 254, 0.96);
          color: #020617;
          box-shadow: 0 0 36px rgba(103, 232, 249, 0.26);
        }

        .controlPlate button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .companionOrb {
          position: absolute;
          right: 1.2rem;
          top: 1rem;
          z-index: 19;
          width: 54px;
          height: 54px;
          border-radius: 999px;
          border: 1px solid rgba(165, 243, 252, 0.2);
          background: rgba(0,0,0,0.28);
          box-shadow: 0 0 52px rgba(103,232,249,0.18);
          backdrop-filter: blur(14px);
        }

        .companionOrb span {
          position: absolute;
          inset: 10px;
          border-radius: 999px;
          background: radial-gradient(circle at 35% 28%, white 0 10%, rgba(255,255,255,0.48) 11% 20%, transparent 21%), radial-gradient(circle, #a7fbff 0 22%, #52bfff 46%, rgba(32,77,160,.22) 76%);
          box-shadow: 0 0 32px rgba(125,240,255,0.7);
        }

        .routeBar {
          position: absolute;
          left: 50%;
          bottom: 1rem;
          z-index: 22;
          display: flex;
          max-width: calc(100vw - 1.5rem);
          gap: 0.28rem;
          overflow-x: auto;
          transform: translateX(-50%);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(0,0,0,0.46);
          padding: 0.42rem;
          backdrop-filter: blur(18px);
        }

        .routeBar a {
          border: 1px solid rgba(207,250,254,0.12);
          border-radius: 999px;
          padding: 0.52rem 0.82rem;
          color: rgba(236,254,255,0.86);
          font-size: 11px;
          font-weight: 950;
          text-decoration: none;
          white-space: nowrap;
        }

        .routeBar a:hover {
          background: rgba(207,250,254,0.95);
          color: #020617;
        }

        @keyframes breathe {
          from { transform: translate(-50%, -50%) scale(0.86); opacity: 0.42; }
          to { transform: translate(-50%, -50%) scale(1.14); opacity: 0.72; }
        }

        @keyframes galaxyDrift {
          from { transform: translate(-50%, -50%) rotate(-9deg) translateZ(-120px) scale(0.98); }
          to { transform: translate(-50%, -50%) rotate(-4deg) translateZ(-120px) scale(1.04); }
        }

        @media (max-width: 760px) {
          .galaxyScene { inset: -10vh -32vw; }
          .titlePlate { max-width: 230px; padding: 0.85rem; }
          .titlePlate h1 { font-size: 1.85rem; }
          .controlPlate {
            left: 50%;
            right: auto;
            bottom: 4.8rem;
            transform: translateX(-50%);
          }
          .galaxyDisc { width: 170vw; height: 36vh; }
          .companionOrb { display: none; }
        }
      `}</style>
    </main>
  )
}
