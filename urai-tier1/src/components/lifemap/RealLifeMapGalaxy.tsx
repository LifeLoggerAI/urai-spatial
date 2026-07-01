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
}

const titles = [
  ['quiet-reset', 'The Quiet Reset', 'Recovery memory'],
  ['threshold-moment', 'Threshold Moment', 'Turning point'],
  ['memory-thread', 'Memory Thread', 'Recent signal'],
  ['recovery-bloom', 'Recovery Bloom', 'Return path'],
  ['relationship-echo', 'Relationship Echo', 'Social orbit'],
  ['legacy-thread', 'Legacy Thread', 'Deep time'],
  ['seasonal-arc', 'Seasonal Arc', 'Life weather'],
  ['ritual-marker', 'Ritual Marker', 'Grounding ritual'],
  ['forecast-path', 'Forecast Path', 'Ahead'],
  ['first-light', 'First Light', 'Opening memory'],
  ['body-signal', 'Body Signal', 'Nervous system'],
  ['home-anchor', 'Home Anchor', 'Safe place'],
]

const auras = ['#9ff7ff', '#d7b4ff', '#ff7bd6', '#cfeaff', '#7ddcff', '#f7e7b7', '#b68cff']

function makeStars(): GalaxyStar[] {
  return Array.from({ length: 34 }, (_, index) => {
    const base = titles[index % titles.length]
    const ring = Math.floor(index / 6)
    const angle = index * 2.399963 + ring * 0.35
    const radius = 10 + Math.sqrt(index + 2) * 6.7
    const x = 50 + Math.cos(angle) * radius * (index % 3 === 0 ? 1.25 : 1)
    const y = 50 + Math.sin(angle) * radius * 0.48 + Math.sin(index * 0.9) * 8
    const z = index % 7
    return {
      id: index === 0 ? 'quiet-reset' : `${base[0]}-${index}`,
      title: index === 0 ? 'The Quiet Reset' : base[1],
      subtitle: base[2],
      x: Math.max(8, Math.min(92, x)),
      y: Math.max(13, Math.min(82, y)),
      z,
      size: 0.72 + ((index * 17) % 42) / 100,
      aura: auras[index % auras.length],
      replay: index % 4 !== 2,
    }
  })
}

function starStyle(star: GalaxyStar): CSSProperties {
  return {
    '--x': `${star.x}%`,
    '--y': `${star.y}%`,
    '--z': `${star.z}`,
    '--s': `${star.size}`,
    '--aura': star.aura,
  } as CSSProperties
}

export default function RealLifeMapGalaxy() {
  const router = useRouter()
  const stars = useMemo(() => makeStars(), [])
  const [selected, setSelected] = useState<GalaxyStar>(stars[0])

  const openFocus = () => router.push(`/focus?memoryId=${encodeURIComponent(selected.id)}`)
  const openReplay = () => router.push(`/replay?memoryId=${encodeURIComponent(selected.id)}&manifestId=replay-recovery-thread`)

  return (
    <main className="lifeGalaxy" aria-label="URAI Life Map memory galaxy">
      <div className="void" />
      <div className="milkyWay" />
      <div className="nebula nebulaA" />
      <div className="nebula nebulaB" />
      <div className="starDust dustA" />
      <div className="starDust dustB" />

      <svg className="filaments" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {stars.slice(0, 19).map((star, index) => {
          const target = stars[(index * 3 + 7) % stars.length]
          const active = selected.id === star.id || selected.id === target.id
          return (
            <path
              key={`${star.id}-${target.id}`}
              d={`M ${star.x} ${star.y} C ${(star.x + target.x) / 2} ${Math.min(star.y, target.y) - 10}, ${(star.x + target.x) / 2} ${Math.max(star.y, target.y) + 7}, ${target.x} ${target.y}`}
              className={active ? 'filament active' : 'filament'}
            />
          )
        })}
      </svg>

      <section className="field" aria-label="Memory stars">
        {stars.map((star) => (
          <button
            key={star.id}
            type="button"
            className={star.id === selected.id ? 'memoryStar selected' : 'memoryStar'}
            style={starStyle(star)}
            onClick={() => setSelected(star)}
            onDoubleClick={() => router.push(`/focus?memoryId=${encodeURIComponent(star.id)}`)}
            aria-label={`Select ${star.title}`}
          >
            <span className="starHalo" />
            <span className="starCore" />
            <span className="starSpike spikeA" />
            <span className="starSpike spikeB" />
          </button>
        ))}
      </section>

      <header className="titlePlate">
        <p>URAI · Life Map</p>
        <h1>Memory galaxy.</h1>
        <span>34 private stars awake. Select a light to move inside the memory field.</span>
      </header>

      <aside className="controlPlate">
        <p>Selected star</p>
        <h2>{selected.title}</h2>
        <span>{selected.subtitle}. Focus opens from the star. Replay becomes the memory film.</span>
        <div>
          <button type="button" onClick={openFocus}>Enter Focus</button>
          <button type="button" onClick={openReplay} disabled={!selected.replay}>Replay</button>
        </div>
      </aside>

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
        }

        .void {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 45%, rgba(90, 245, 255, 0.08), transparent 22%),
            radial-gradient(circle at 62% 38%, rgba(255, 90, 220, 0.07), transparent 26%),
            radial-gradient(circle at 44% 58%, rgba(130, 94, 255, 0.06), transparent 25%),
            linear-gradient(180deg, #00020a 0%, #02030d 48%, #000106 100%);
          z-index: 0;
        }

        .milkyWay {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 118vw;
          height: 42vh;
          transform: translate(-50%, -50%) rotate(-7deg);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(245,255,255,0.42), rgba(125,240,255,0.18) 8%, rgba(158,112,255,0.12) 21%, rgba(255,255,255,0.04) 38%, transparent 67%),
            repeating-radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.16) 0 1px, transparent 1px 8px);
          filter: blur(0.4px);
          opacity: 0.62;
          mask-image: radial-gradient(ellipse at center, black 0 52%, transparent 72%);
          z-index: 1;
          animation: galaxyDrift 18s ease-in-out infinite alternate;
        }

        .nebula {
          position: absolute;
          width: 44vw;
          height: 44vw;
          border-radius: 999px;
          filter: blur(52px);
          opacity: 0.18;
          z-index: 1;
        }

        .nebulaA {
          left: 12%;
          top: 16%;
          background: #55e7ff;
        }

        .nebulaB {
          right: 12%;
          top: 12%;
          background: #c16cff;
        }

        .starDust {
          position: absolute;
          inset: -10%;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.9) 0 1px, transparent 1.35px),
            radial-gradient(circle, rgba(140,232,255,0.72) 0 1px, transparent 1.25px),
            radial-gradient(circle, rgba(220,190,255,0.62) 0 1px, transparent 1.2px);
          background-size: 97px 97px, 151px 151px, 239px 239px;
          background-position: 0 0, 31px 57px, 81px 13px;
          opacity: 0.48;
          z-index: 2;
        }

        .dustB {
          transform: scale(1.15) rotate(4deg);
          opacity: 0.3;
          filter: blur(0.5px);
        }

        .filaments {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
        }

        .filament {
          fill: none;
          stroke: rgba(180, 242, 255, 0.13);
          stroke-width: 0.09;
          stroke-dasharray: 0.6 1.8;
          filter: drop-shadow(0 0 5px rgba(126, 239, 255, 0.18));
        }

        .filament.active {
          stroke: rgba(232, 255, 255, 0.46);
          stroke-width: 0.13;
        }

        .field {
          position: absolute;
          inset: 0;
          z-index: 5;
          perspective: 900px;
        }

        .memoryStar {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: calc(10px * var(--s));
          height: calc(10px * var(--s));
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: transparent;
          transform: translate(-50%, -50%) translateZ(calc(var(--z) * 14px));
          cursor: pointer;
        }

        .starHalo,
        .starCore,
        .starSpike {
          position: absolute;
          inset: 50%;
          pointer-events: none;
        }

        .starHalo {
          width: calc(76px * var(--s));
          height: calc(76px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, color-mix(in srgb, var(--aura) 62%, white) 0 3%, var(--aura) 8%, rgba(255,255,255,0.08) 24%, transparent 68%);
          opacity: 0.55;
          filter: blur(1px);
          animation: breathe 4s ease-in-out infinite alternate;
        }

        .starCore {
          width: calc(8px * var(--s));
          height: calc(8px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, white 0 18%, color-mix(in srgb, var(--aura) 70%, white) 19% 44%, var(--aura) 45% 66%, transparent 67%);
          box-shadow:
            0 0 12px color-mix(in srgb, var(--aura) 85%, white),
            0 0 34px var(--aura),
            0 0 88px color-mix(in srgb, var(--aura) 70%, transparent);
        }

        .starSpike {
          width: calc(2px * var(--s));
          height: calc(34px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: linear-gradient(180deg, transparent, rgba(255,255,255,0.75), transparent);
          opacity: 0.42;
        }

        .spikeB {
          transform: translate(-50%, -50%) rotate(90deg);
          height: calc(28px * var(--s));
          opacity: 0.28;
        }

        .memoryStar.selected .starHalo {
          width: calc(112px * var(--s));
          height: calc(112px * var(--s));
          opacity: 0.82;
        }

        .memoryStar.selected .starCore {
          width: calc(13px * var(--s));
          height: calc(13px * var(--s));
        }

        .titlePlate,
        .controlPlate {
          position: absolute;
          z-index: 10;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0, 0, 0, 0.28);
          box-shadow: 0 24px 80px rgba(0,0,0,0.42);
          backdrop-filter: blur(18px);
        }

        .titlePlate {
          left: 1rem;
          top: 1rem;
          max-width: 260px;
          border-radius: 22px;
          padding: 0.85rem;
        }

        .titlePlate p,
        .controlPlate p {
          margin: 0;
          color: rgba(165, 243, 252, 0.86);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        .titlePlate h1 {
          margin: 0.3rem 0 0;
          font-size: clamp(1.5rem, 3vw, 2.5rem);
          line-height: 0.88;
          letter-spacing: -0.07em;
        }

        .titlePlate span,
        .controlPlate span {
          display: block;
          margin-top: 0.55rem;
          color: rgba(235, 252, 255, 0.72);
          font-size: 12px;
          font-weight: 700;
          line-height: 1.45;
        }

        .controlPlate {
          right: 1rem;
          bottom: 4.8rem;
          width: min(360px, calc(100vw - 2rem));
          border-radius: 28px;
          padding: 1rem;
        }

        .controlPlate h2 {
          margin: 0.35rem 0 0;
          font-size: 1.45rem;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .controlPlate div {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.85rem;
        }

        .controlPlate button {
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 999px;
          padding: 0.65rem 0.9rem;
          background: rgba(255,255,255,0.06);
          color: white;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .controlPlate button:first-child {
          background: rgba(207, 250, 254, 0.96);
          color: #020617;
        }

        .controlPlate button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .routeBar {
          position: absolute;
          left: 50%;
          bottom: 1rem;
          z-index: 12;
          display: flex;
          max-width: calc(100vw - 1.5rem);
          gap: 0.25rem;
          overflow-x: auto;
          transform: translateX(-50%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 999px;
          background: rgba(0,0,0,0.38);
          padding: 0.35rem;
          backdrop-filter: blur(18px);
        }

        .routeBar a {
          border: 1px solid rgba(207,250,254,0.1);
          border-radius: 999px;
          padding: 0.45rem 0.7rem;
          color: rgba(236,254,255,0.82);
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .routeBar a:hover {
          background: rgba(207,250,254,0.95);
          color: #020617;
        }

        @keyframes breathe {
          from { transform: translate(-50%, -50%) scale(0.86); opacity: 0.42; }
          to { transform: translate(-50%, -50%) scale(1.12); opacity: 0.72; }
        }

        @keyframes galaxyDrift {
          from { transform: translate(-50%, -50%) rotate(-9deg) scale(0.98); }
          to { transform: translate(-50%, -50%) rotate(-4deg) scale(1.04); }
        }

        @media (max-width: 760px) {
          .titlePlate {
            max-width: 210px;
          }

          .controlPlate {
            left: 50%;
            right: auto;
            bottom: 4.5rem;
            transform: translateX(-50%);
          }

          .milkyWay {
            width: 160vw;
            height: 36vh;
          }
        }
      `}</style>
    </main>
  )
}
