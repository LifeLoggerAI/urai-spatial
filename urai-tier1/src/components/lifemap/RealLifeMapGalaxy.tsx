'use client'

import Link from 'next/link'
import { useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { assetCssStack, lifeMapAssets, uiAssets } from '@/spatial/assets/uraiAssets'

type MemoryNode = {
  id: string
  title: string
  type: string
  era: string
  x: number
  y: number
  z: number
  size: number
  hue: string
  asset: string
  replay: boolean
}

const seed = [
  ['quiet-reset', 'The Quiet Reset', 'Recovery', 'Today'],
  ['threshold-moment', 'Threshold Moment', 'Threshold', 'March'],
  ['memory-thread', 'Memory Thread', 'Memory', 'Now'],
  ['recovery-bloom', 'Recovery Bloom', 'Recovery', 'Afterward'],
  ['relationship-echo', 'Relationship Echo', 'Relationship', 'Social'],
  ['legacy-thread', 'Legacy Thread', 'Legacy', 'Long arc'],
  ['seasonal-arc', 'Seasonal Arc', 'Season', 'Spring'],
  ['ritual-marker', 'Ritual Marker', 'Ritual', 'Weekly'],
  ['forecast-path', 'Forecast Path', 'Forecast', 'Ahead'],
  ['first-light', 'First Light', 'Origin', 'Origin'],
  ['body-signal', 'Body Signal', 'Body', 'Signal'],
  ['home-anchor', 'Home Anchor', 'Ground', 'Home'],
] as const

const hues = [
  '#9ff7ff',
  '#d7b4ff',
  '#ff7bd6',
  '#cfeaff',
  '#7ddcff',
  '#f7e7b7',
  '#b68cff',
  '#66f2c4',
]

const nodeArt = [
  assetCssStack(lifeMapAssets.accents.threshold),
  assetCssStack(lifeMapAssets.accents.becoming),
  assetCssStack(lifeMapAssets.accents.studio),
]

function buildNodes(): MemoryNode[] {
  return Array.from({ length: 34 }, (_, index) => {
    const item = seed[index % seed.length]
    const ring = Math.floor(index / 7)
    const angle = index * 2.399963 + ring * 0.58
    const radius = 10 + Math.sqrt(index + 1) * 7.2
    const wide = index % 4 === 0 ? 1.34 : 1
    const x = 50 + Math.cos(angle) * radius * wide
    const y = 50 + Math.sin(angle) * radius * 0.46 + Math.sin(index * 0.74) * 7.4

    return {
      id: index === 0 ? 'quiet-reset' : `${item[0]}-${index}`,
      title: index === 0 ? 'The Quiet Reset' : item[1],
      type: item[2],
      era: item[3],
      x: Math.max(6, Math.min(94, x)),
      y: Math.max(10, Math.min(84, y)),
      z: (index % 11) - 5,
      size: 0.82 + ((index * 19) % 48) / 100,
      hue: hues[index % hues.length],
      asset: nodeArt[index % nodeArt.length],
      replay: index % 5 !== 2,
    }
  })
}

function nodeStyle(node: MemoryNode, active: boolean): CSSProperties {
  return {
    '--x': `${node.x}%`,
    '--y': `${node.y}%`,
    '--z-depth': `${node.z * 28}px`,
    '--s': `${active ? node.size * 1.18 : node.size}`,
    '--hue': node.hue,
    '--node-art': node.asset,
    '--delay': `${Math.abs(node.z) * -0.27}s`,
  } as CSSProperties
}

export default function RealLifeMapGalaxy() {
  const router = useRouter()
  const nodes = useMemo(() => buildNodes(), [])
  const [selected, setSelected] = useState<MemoryNode>(nodes[0])
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const focusHref = (memoryId: string) =>
    `/focus?memoryId=${encodeURIComponent(memoryId)}`

  const replayHref = (memoryId: string) =>
    `/replay?memoryId=${encodeURIComponent(memoryId)}&manifestId=replay-recovery-thread`

  const openFocus = () => router.push(focusHref(selected.id))
  const openReplay = () => router.push(replayHref(selected.id))

  const handleNodeKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    node: MemoryNode,
  ) => {
    if (event.key !== 'Enter') return

    event.preventDefault()
    router.push(focusHref(node.id))
  }

  const rootStyle = {
    '--life-map-art': assetCssStack(lifeMapAssets.primary),
    '--life-map-orb': assetCssStack(uiAssets.orbActive),
  } as CSSProperties

  const sceneStyle = {
    '--rx': `${tilt.y}deg`,
    '--ry': `${tilt.x}deg`,
    '--pull-x': `${(50 - selected.x) * 0.18}vw`,
    '--pull-y': `${(50 - selected.y) * 0.12}vh`,
    '--selected-x': `${selected.x}%`,
    '--selected-y': `${selected.y}%`,
    '--selected-hue': selected.hue,
  } as CSSProperties

  return (
    <main
      className="lifeGalaxy"
      style={rootStyle}
      aria-label="URAI Life Map spatial memory constellation"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const px = (event.clientX - rect.left) / rect.width - 0.5
        const py = (event.clientY - rect.top) / rect.height - 0.5

        setTilt({ x: px * 7.5, y: py * -5 })
      }}
      onPointerLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div className="deepSpace" />
      <div className="organicDust dustOne" />
      <div className="organicDust dustTwo" />
      <div className="edgeVignette" />

      <section
        className="constellation"
        style={sceneStyle}
        aria-label="Private memory constellation"
      >
        <div className="galaxyBody" />
        <div className="galaxyVeil veilA" />
        <div className="galaxyVeil veilB" />
        <div className="nucleus" />
        <div className="selectedBeam" />
        <div className="orbitPlane planeA" />
        <div className="orbitPlane planeB" />
        <div className="orbitPlane planeC" />

        <svg
          className="connectionWeb"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {nodes.slice(0, 22).map((node, index) => {
            const target = nodes[(index * 5 + 8) % nodes.length]
            const active = selected.id === node.id || selected.id === target.id

            return (
              <path
                key={`${node.id}-${target.id}`}
                className={active ? 'connection active' : 'connection'}
                d={`M ${node.x} ${node.y} C ${(node.x + target.x) / 2} ${Math.min(node.y, target.y) - 11}, ${(node.x + target.x) / 2} ${Math.max(node.y, target.y) + 8}, ${target.x} ${target.y}`}
              />
            )
          })}
        </svg>

        <section className="nodeField" aria-label="Memory stars">
          {nodes.map((node) => {
            const active = selected.id === node.id

            return (
              <button
                key={node.id}
                type="button"
                className={active ? 'memoryNode active' : 'memoryNode'}
                style={nodeStyle(node, active)}
                onClick={() => setSelected(node)}
                onDoubleClick={() => router.push(focusHref(node.id))}
                onKeyDown={(event) => handleNodeKeyDown(event, node)}
                aria-pressed={active}
                aria-label={`Select ${node.title}. Double click or press Enter to enter Focus.`}
              >
                <span className="hit" />
                <span className="glow" />
                <span className="core" />
                <span className="ray rayA" />
                <span className="ray rayB" />
                <span className="nodeLabel">
                  <strong>{node.title}</strong>
                  {active ? <em>Double click / Enter Focus</em> : null}
                </span>
              </button>
            )
          })}
        </section>
      </section>

      <header className="mapHud">
        <p>URAI · LIFE MAP</p>
        <h1>Inside your memory field.</h1>
        <span>
          Thirty-four private stars. Select one and the galaxy moves around it.
        </span>
      </header>

      <aside className="starDock">
        <p>Selected star</p>
        <h2>{selected.title}</h2>
        <span>
          {selected.type} · {selected.era}. Focus enters the star. Replay opens the
          film thread.
        </span>

        <div className="dockActions">
          <button type="button" onClick={openFocus}>
            Enter Focus
          </button>
          <button type="button" onClick={openReplay} disabled={!selected.replay}>
            Replay
          </button>
          <button type="button" onClick={() => setSelected(nodes[0])}>
            Recenter
          </button>
        </div>
      </aside>

      <div className="companionOrb" aria-hidden="true">
        <span />
      </div>

      <nav className="portalRail" aria-label="URAI route portals">
        {[
          ['Home', '/home'],
          ['Ground', '/ground'],
          ['Focus', '/focus'],
          ['Replay', '/replay'],
          ['Mirror', '/mirror'],
          ['Passport', '/passport'],
          ['XR', '/spatial/ar-vr'],
        ].map(([label, href]) => (
          <Link key={href} href={href}>
            {label}
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .lifeGalaxy {
          position: fixed;
          inset: 0;
          width: 100vw;
          height: 100svh;
          min-height: 100svh;
          max-height: 100svh;
          overflow: hidden;
          color: white;
          background: #000107;
          isolation: isolate;
          cursor: default;
          overscroll-behavior: none;
          contain: layout paint size;
        }

        .deepSpace {
          position: absolute;
          inset: 0;
          z-index: 0;
          background-image:
            linear-gradient(180deg, rgba(0, 0, 0, 0.24), rgba(0, 0, 0, 0.72)),
            var(--life-map-art),
            radial-gradient(circle at 50% 44%, rgba(255, 255, 255, 0.08), transparent 8%),
            radial-gradient(circle at 34% 45%, rgba(77, 224, 255, 0.13), transparent 30%),
            radial-gradient(circle at 73% 40%, rgba(185, 101, 255, 0.15), transparent 31%),
            linear-gradient(180deg, #00020a 0%, #02030d 54%, #000106 100%);
          background-size: cover, cover, auto, auto, auto, auto;
          background-position: center;
          opacity: 0.92;
          filter: saturate(1.08) brightness(0.82);
        }

        .organicDust {
          position: absolute;
          inset: -12%;
          z-index: 1;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.82) 0 1px, transparent 1.28px),
            radial-gradient(circle, rgba(125, 238, 255, 0.62) 0 1px, transparent 1.2px),
            radial-gradient(circle, rgba(218, 187, 255, 0.52) 0 1px, transparent 1.18px);
          background-size: 113px 113px, 181px 181px, 277px 277px;
          background-position: 0 0, 43px 61px, 109px 23px;
          opacity: 0.44;
          pointer-events: none;
        }

        .dustTwo {
          transform: scale(1.22) rotate(-5deg);
          opacity: 0.24;
          filter: blur(0.7px);
        }

        .edgeVignette {
          position: absolute;
          inset: 0;
          z-index: 30;
          pointer-events: none;
          background: radial-gradient(
            ellipse at center,
            transparent 0 48%,
            rgba(0, 0, 0, 0.58) 78%,
            rgba(0, 0, 0, 0.92) 100%
          );
        }

        .constellation {
          position: absolute;
          inset: -9vh -8vw;
          z-index: 5;
          transform-style: preserve-3d;
          transform: perspective(1300px)
            translate3d(var(--pull-x), var(--pull-y), 0)
            rotateX(var(--rx))
            rotateY(var(--ry))
            scale(1.035);
          transition: transform 620ms cubic-bezier(0.16, 0.84, 0.22, 1);
        }

        .galaxyBody {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 114vw;
          height: 42vh;
          transform: translate(-50%, -50%) rotate(-7deg) translateZ(-160px);
          border-radius: 999px;
          background:
            radial-gradient(
              ellipse at 50% 50%,
              rgba(255, 255, 255, 0.48),
              rgba(137, 235, 255, 0.24) 10%,
              rgba(139, 99, 255, 0.13) 31%,
              rgba(255, 255, 255, 0.028) 52%,
              transparent 74%
            ),
            radial-gradient(ellipse at 43% 56%, rgba(77, 224, 255, 0.25), transparent 41%),
            radial-gradient(ellipse at 66% 43%, rgba(204, 128, 255, 0.22), transparent 42%);
          filter: blur(1.2px) saturate(1.08);
          opacity: 0.82;
          mask-image: radial-gradient(ellipse at center, black 0 50%, transparent 77%);
          animation: slowDrift 22s ease-in-out infinite alternate;
          pointer-events: none;
        }

        .galaxyVeil {
          position: absolute;
          left: 50%;
          top: 52%;
          width: 76vw;
          height: 26vh;
          transform: translate(-50%, -50%) rotate(-18deg) translateZ(-70px);
          border-radius: 999px;
          background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.08),
            rgba(125, 238, 255, 0.08) 24%,
            transparent 70%
          );
          filter: blur(18px);
          opacity: 0.8;
          pointer-events: none;
        }

        .veilB {
          width: 58vw;
          height: 22vh;
          transform: translate(-50%, -50%) rotate(19deg) translateZ(20px);
          background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.07),
            rgba(255, 123, 214, 0.12) 26%,
            transparent 72%
          );
          opacity: 0.7;
        }

        .nucleus,
        .selectedBeam {
          position: absolute;
          pointer-events: none;
          border-radius: 999px;
        }

        .nucleus {
          left: 50%;
          top: 52%;
          width: 26vw;
          height: 14vh;
          transform: translate(-50%, -50%) translateZ(80px);
          background: radial-gradient(
            ellipse,
            rgba(255, 255, 255, 0.72),
            rgba(165, 243, 252, 0.28) 25%,
            rgba(185, 124, 255, 0.14) 48%,
            transparent 72%
          );
          filter: blur(9px);
          opacity: 0.72;
        }

        .selectedBeam {
          left: var(--selected-x);
          top: var(--selected-y);
          width: 240px;
          height: 240px;
          transform: translate(-50%, -50%) translateZ(140px);
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.38) 0 5%,
            var(--selected-hue) 16%,
            rgba(255, 255, 255, 0.05) 35%,
            transparent 72%
          );
          filter: blur(14px);
          opacity: 0.62;
          transition:
            left 620ms cubic-bezier(0.16, 0.84, 0.22, 1),
            top 620ms cubic-bezier(0.16, 0.84, 0.22, 1),
            background 420ms ease;
        }

        .orbitPlane {
          position: absolute;
          left: 50%;
          top: 52%;
          border: 1px solid rgba(196, 245, 255, 0.1);
          border-left-color: transparent;
          border-radius: 50%;
          filter: drop-shadow(0 0 38px rgba(103, 232, 249, 0.11));
          pointer-events: none;
        }

        .planeA {
          width: 78vw;
          height: 31vh;
          transform: translate(-50%, -50%) rotate(-8deg) translateZ(-20px);
        }

        .planeB {
          width: 106vw;
          height: 43vh;
          transform: translate(-50%, -50%) rotate(7deg) translateZ(-95px);
          opacity: 0.5;
        }

        .planeC {
          width: 52vw;
          height: 20vh;
          transform: translate(-50%, -50%) rotate(-31deg) translateZ(80px);
          opacity: 0.34;
        }

        .connectionWeb {
          position: absolute;
          inset: 0;
          z-index: 7;
          width: 100%;
          height: 100%;
          transform: translateZ(65px);
          pointer-events: none;
        }

        .connection {
          fill: none;
          stroke: rgba(190, 245, 255, 0.09);
          stroke-width: 0.07;
          stroke-dasharray: 0.45 1.6;
          filter: drop-shadow(0 0 6px rgba(125, 238, 255, 0.1));
        }

        .connection.active {
          stroke: rgba(245, 255, 255, 0.54);
          stroke-width: 0.14;
          stroke-dasharray: 0.9 1.1;
        }

        .nodeField {
          position: absolute;
          inset: 0;
          z-index: 10;
          transform-style: preserve-3d;
        }

        .memoryNode {
          position: absolute;
          left: var(--x);
          top: var(--y);
          width: calc(18px * var(--s));
          height: calc(18px * var(--s));
          padding: 0;
          border: 0;
          border-radius: 999px;
          background: transparent;
          transform: translate(-50%, -50%) translateZ(var(--z-depth));
          transform-style: preserve-3d;
          cursor: pointer;
          transition:
            transform 620ms cubic-bezier(0.16, 0.84, 0.22, 1),
            filter 240ms ease;
        }

        .memoryNode.active {
          z-index: 20;
          transform: translate(-50%, -50%)
            translateZ(calc(var(--z-depth) + 150px))
            scale(1.22);
          filter: brightness(1.24) saturate(1.25);
        }

        .memoryNode:focus-visible {
          outline: 2px solid rgba(207, 250, 254, 0.95);
          outline-offset: 18px;
        }

        .hit,
        .glow,
        .core,
        .ray,
        .nodeLabel {
          position: absolute;
          pointer-events: none;
        }

        .hit {
          inset: -28px;
          border-radius: 999px;
        }

        .glow {
          left: 50%;
          top: 50%;
          width: calc(92px * var(--s));
          height: calc(92px * var(--s));
          transform: translate(-50%, -50%);
          overflow: hidden;
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.82) 0 3%,
            var(--hue) 10%,
            rgba(255, 255, 255, 0.08) 27%,
            transparent 70%
          );
          opacity: 0.58;
          filter: blur(1.2px);
          animation: pulse 4.4s ease-in-out infinite alternate;
          animation-delay: var(--delay);
        }

        .glow::before {
          content: '';
          position: absolute;
          inset: 17%;
          border-radius: inherit;
          background-image:
            linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(0, 0, 0, 0.42)),
            var(--node-art);
          background-size: cover;
          background-position: center;
          opacity: 0;
          filter: saturate(1.18) contrast(1.08);
          transition: opacity 260ms ease;
        }

        .glow::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: radial-gradient(
            circle,
            transparent 0 34%,
            rgba(255, 255, 255, 0.2) 52%,
            transparent 72%
          );
        }

        .core {
          left: 50%;
          top: 50%;
          width: calc(9px * var(--s));
          height: calc(9px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(
            circle,
            white 0 18%,
            #eaffff 20% 40%,
            var(--hue) 43% 70%,
            transparent 72%
          );
          box-shadow:
            0 0 14px white,
            0 0 42px var(--hue),
            0 0 96px var(--hue);
        }

        .ray {
          left: 50%;
          top: 50%;
          width: calc(2px * var(--s));
          height: calc(42px * var(--s));
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            transparent,
            rgba(255, 255, 255, 0.74),
            transparent
          );
          opacity: 0.36;
        }

        .rayB {
          transform: translate(-50%, -50%) rotate(90deg);
          opacity: 0.24;
        }

        .memoryNode.active .glow {
          width: calc(145px * var(--s));
          height: calc(145px * var(--s));
          opacity: 0.9;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .memoryNode.active .glow::before {
          opacity: 0.64;
        }

        .memoryNode.active .core {
          width: calc(15px * var(--s));
          height: calc(15px * var(--s));
        }

        .nodeLabel {
          left: 50%;
          bottom: calc(100% + 18px);
          width: max-content;
          max-width: 190px;
          transform: translateX(-50%) translateZ(120px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.6);
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.5),
            0 0 46px rgba(165, 243, 252, 0.14);
          padding: 0.45rem 0.58rem;
          color: rgba(236, 254, 255, 0.94);
          font-size: 0.7rem;
          line-height: 1.1;
          opacity: 0;
          backdrop-filter: blur(16px);
          transition:
            opacity 170ms ease,
            transform 170ms ease;
        }

        .nodeLabel strong {
          display: block;
          font-weight: 950;
        }

        .nodeLabel em {
          display: block;
          margin-top: 0.25rem;
          color: rgba(165, 243, 252, 0.94);
          font-size: 0.56rem;
          font-style: normal;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .memoryNode:hover .nodeLabel,
        .memoryNode:focus-visible .nodeLabel,
        .memoryNode.active .nodeLabel {
          opacity: 1;
          transform: translateX(-50%) translateY(-4px) translateZ(120px);
        }

        .mapHud,
        .starDock {
          position: absolute;
          z-index: 40;
          max-height: min(34svh, 320px);
          overflow: auto;
          overscroll-behavior: contain;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(
            145deg,
            rgba(0, 0, 0, 0.54),
            rgba(8, 16, 30, 0.32)
          );
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.44),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(20px);
          scrollbar-width: none;
        }

        .mapHud::-webkit-scrollbar,
        .starDock::-webkit-scrollbar,
        .portalRail::-webkit-scrollbar {
          display: none;
        }

        .mapHud {
          left: 1rem;
          top: 1rem;
          width: min(285px, calc(100vw - 2rem));
          border-radius: 24px;
          padding: 0.9rem;
        }

        .mapHud p,
        .starDock p {
          margin: 0;
          color: rgba(165, 243, 252, 0.9);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.25em;
          text-transform: uppercase;
        }

        .mapHud h1 {
          margin: 0.4rem 0 0;
          max-width: 8.8ch;
          font-size: clamp(2rem, 3.4vw, 3.45rem);
          line-height: 0.84;
          letter-spacing: -0.08em;
        }

        .mapHud span,
        .starDock span {
          display: block;
          margin-top: 0.58rem;
          color: rgba(235, 252, 255, 0.74);
          font-size: 0.78rem;
          font-weight: 750;
          line-height: 1.36;
        }

        .starDock {
          right: 1rem;
          bottom: 4.9rem;
          width: min(330px, calc(100vw - 2rem));
          border-radius: 24px;
          padding: 0.9rem;
        }

        .starDock h2 {
          margin: 0.35rem 0 0;
          font-size: clamp(1.45rem, 2.5vw, 2rem);
          line-height: 0.94;
          letter-spacing: -0.055em;
        }

        .dockActions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.85rem;
        }

        .dockActions button {
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 999px;
          padding: 0.58rem 0.82rem;
          background: rgba(255, 255, 255, 0.06);
          color: white;
          font-size: 0.72rem;
          font-weight: 950;
          cursor: pointer;
        }

        .dockActions button:hover:not(:disabled),
        .dockActions button:focus-visible {
          border-color: rgba(207, 250, 254, 0.48);
          background: rgba(255, 255, 255, 0.12);
          outline: none;
        }

        .dockActions button:first-child {
          background: rgba(207, 250, 254, 0.96);
          color: #020617;
          box-shadow: 0 0 34px rgba(103, 232, 249, 0.22);
        }

        .dockActions button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .companionOrb {
          position: absolute;
          right: 1rem;
          top: 1rem;
          z-index: 42;
          width: 54px;
          height: 54px;
          border: 1px solid rgba(165, 243, 252, 0.2);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.28);
          box-shadow: 0 0 56px rgba(103, 232, 249, 0.2);
          backdrop-filter: blur(14px);
        }

        .companionOrb span {
          position: absolute;
          inset: 8px;
          border-radius: 999px;
          background-image: var(--life-map-orb);
          background-size: cover;
          background-position: center;
          box-shadow: 0 0 34px rgba(125, 240, 255, 0.7);
        }

        .portalRail {
          position: absolute;
          left: 50%;
          bottom: 1rem;
          z-index: 45;
          display: flex;
          max-width: calc(100vw - 1.5rem);
          transform: translateX(-50%);
          gap: 0.35rem;
          overflow-x: auto;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.52);
          padding: 0.42rem;
          backdrop-filter: blur(18px);
          scrollbar-width: none;
        }

        .portalRail a {
          border: 1px solid rgba(207, 250, 254, 0.12);
          border-radius: 999px;
          padding: 0.5rem 0.76rem;
          color: rgba(236, 254, 255, 0.88);
          font-size: 0.72rem;
          font-weight: 950;
          line-height: 1;
          text-decoration: none;
          white-space: nowrap;
        }

        .portalRail a:hover,
        .portalRail a:focus-visible {
          background: rgba(207, 250, 254, 0.96);
          color: #020617;
          outline: none;
        }

        @keyframes pulse {
          from {
            transform: translate(-50%, -50%) scale(0.86);
            opacity: 0.42;
          }
          to {
            transform: translate(-50%, -50%) scale(1.14);
            opacity: 0.75;
          }
        }

        @keyframes slowDrift {
          from {
            transform: translate(-50%, -50%) rotate(-9deg) translateZ(-160px)
              scale(0.98);
          }
          to {
            transform: translate(-50%, -50%) rotate(-4deg) translateZ(-160px)
              scale(1.04);
          }
        }

        @media (max-width: 760px) {
          .constellation {
            inset: -11vh -34vw;
          }

          .mapHud {
            left: 0.5rem;
            top: 0.5rem;
            width: min(226px, calc(100vw - 1rem));
            max-height: 26svh;
            padding: 0.72rem;
          }

          .mapHud h1 {
            font-size: 1.68rem;
          }

          .mapHud span {
            font-size: 0.7rem;
          }

          .companionOrb {
            display: none;
          }

          .starDock {
            left: 50%;
            right: auto;
            bottom: 5.7rem;
            width: min(350px, calc(100vw - 1rem));
            max-height: 34svh;
            transform: translateX(-50%);
          }

          .portalRail {
            bottom: 0.75rem;
            width: calc(100vw - 1rem);
            justify-content: flex-start;
          }

          .galaxyBody {
            width: 170vw;
            height: 36vh;
          }
        }

        @media (max-width: 420px), (max-height: 680px) {
          .mapHud {
            max-height: 22svh;
          }

          .mapHud span {
            display: none;
          }

          .starDock {
            bottom: 5.25rem;
            max-height: 31svh;
            padding: 0.75rem;
          }

          .starDock span {
            font-size: 0.7rem;
          }

          .dockActions {
            margin-top: 0.65rem;
          }

          .dockActions button {
            padding: 0.5rem 0.68rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .constellation,
          .selectedBeam,
          .memoryNode,
          .nodeLabel {
            transition: none;
          }

          .galaxyBody,
          .glow {
            animation: none;
          }
        }
      `}</style>
    </main>
  )
}
