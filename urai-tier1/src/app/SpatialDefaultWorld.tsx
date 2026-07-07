'use client'

import Link from 'next/link'
import LifeMapScene from '@/spatial/lifemap/LifeMapScene'

const navItems = [
  ['Ground', '/ground'],
  ['Life Map', '/life-map'],
  ['World', '/world'],
  ['Passport', '/passport'],
  ['Status', '/status'],
] as const

export default function SpatialDefaultWorld() {
  return (
    <main aria-label="URAI explorable spatial world" data-urai-default-spatial-world="ground-lifemap-galaxy">
      <LifeMapScene />

      <Link className="usd-ground-entry" href="/ground" aria-label="Enter the Ground world">
        <span className="usd-ground-entry__plane" />
        <span className="usd-ground-entry__gate">
          <strong>Enter Ground</strong>
          <em>walk the real-life layer</em>
        </span>
      </Link>

      <Link className="usd-sky-entry" href="/life-map" aria-label="Open the Life Map galaxy">
        <strong>Life Map galaxy</strong>
        <span>orbit memory stars</span>
      </Link>

      <header className="usd-world-badge" aria-label="URAI spatial entry controls">
        <strong>URAI SPATIAL</strong>
        <span>Drag to orbit. Tap stars. Ground is below.</span>
      </header>

      <nav className="usd-route-rail" aria-label="URAI spatial route rail">
        {navItems.map(([label, href]) => (
          <Link key={href} href={href} data-primary={label === 'Ground' || label === 'Life Map' ? 'true' : 'false'}>
            {label}
          </Link>
        ))}
      </nav>

      <style jsx>{`
        :global(.lm3d-hero) {
          opacity: .18;
          transform: translateY(-10px) scale(.92);
          pointer-events: none;
        }

        :global(.lm3d-hero h1),
        :global(.lm3d-hero span) {
          display: none;
        }

        :global(.lm3d-status) {
          bottom: 118px;
          opacity: .7;
        }

        .usd-world-badge {
          position: fixed;
          z-index: 160;
          left: 18px;
          top: 18px;
          width: max-content;
          max-width: min(340px, calc(100vw - 36px));
          padding: 10px 13px;
          border-radius: 16px;
          border: 1px solid rgba(160, 220, 255, .2);
          background: rgba(2, 6, 18, .5);
          color: #f8fbff;
          box-shadow: 0 20px 70px rgba(0, 0, 0, .3);
          backdrop-filter: blur(16px);
        }

        .usd-world-badge strong {
          display: block;
          font-size: 13px;
          letter-spacing: .18em;
        }

        .usd-world-badge span {
          display: block;
          margin-top: 4px;
          color: rgba(235, 244, 255, .76);
          font-size: 12px;
        }

        .usd-sky-entry {
          position: fixed;
          z-index: 152;
          right: clamp(18px, 4vw, 56px);
          top: clamp(78px, 14vh, 140px);
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(160, 220, 255, .2);
          background: rgba(2, 6, 18, .42);
          color: #f8fbff;
          text-decoration: none;
          box-shadow: 0 24px 90px rgba(0, 0, 0, .28), 0 0 44px rgba(103, 232, 249, .08);
          backdrop-filter: blur(16px);
        }

        .usd-sky-entry strong {
          font-size: 12px;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .usd-sky-entry span {
          font-size: 12px;
          color: rgba(235, 244, 255, .74);
        }

        .usd-ground-entry {
          position: fixed;
          z-index: 150;
          left: 50%;
          bottom: 0;
          width: min(980px, 96vw);
          height: 35vh;
          min-height: 220px;
          transform: translateX(-50%);
          color: #f8fbff;
          text-decoration: none;
          perspective: 760px;
          pointer-events: auto;
        }

        .usd-ground-entry__plane {
          position: absolute;
          left: 50%;
          bottom: -34%;
          width: 110%;
          height: 118%;
          transform: translateX(-50%) rotateX(66deg);
          transform-origin: bottom center;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(ellipse at 50% 18%, rgba(103, 232, 249, .38), transparent 0 10%, rgba(103, 232, 249, .12) 11%, transparent 34%),
            repeating-radial-gradient(ellipse at 50% 18%, rgba(160, 220, 255, .28) 0 1px, transparent 1px 34px),
            linear-gradient(90deg, transparent 0 48%, rgba(160, 220, 255, .28) 49%, rgba(160, 220, 255, .28) 51%, transparent 52%),
            radial-gradient(ellipse at 50% 20%, rgba(14, 165, 233, .18), rgba(2, 6, 18, .02) 62%, transparent 74%);
          filter: drop-shadow(0 0 46px rgba(103, 232, 249, .18));
          opacity: .92;
          animation: usd-ground-breathe 4.8s ease-in-out infinite;
        }

        .usd-ground-entry__gate {
          position: absolute;
          left: 50%;
          bottom: 84px;
          display: grid;
          gap: 3px;
          min-width: 178px;
          padding: 14px 18px;
          transform: translateX(-50%);
          text-align: center;
          border-radius: 999px;
          border: 1px solid rgba(103, 232, 249, .38);
          background: rgba(2, 6, 18, .68);
          box-shadow: 0 0 58px rgba(103, 232, 249, .14), inset 0 1px 0 rgba(255, 255, 255, .12);
          backdrop-filter: blur(18px);
        }

        .usd-ground-entry__gate strong {
          font-size: 13px;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .usd-ground-entry__gate em {
          color: rgba(235, 244, 255, .72);
          font-size: 12px;
          font-style: normal;
        }

        .usd-route-rail {
          position: fixed;
          z-index: 165;
          left: 50%;
          bottom: 16px;
          display: flex;
          gap: 8px;
          max-width: calc(100vw - 28px);
          padding: 8px;
          transform: translateX(-50%);
          overflow-x: auto;
          border-radius: 999px;
          border: 1px solid rgba(160, 220, 255, .2);
          background: rgba(2, 6, 18, .68);
          box-shadow: 0 24px 90px rgba(0, 0, 0, .34);
          backdrop-filter: blur(18px);
        }

        .usd-route-rail a {
          min-width: max-content;
          padding: 10px 14px;
          border-radius: 999px;
          color: #f8fbff;
          text-decoration: none;
          font-size: 12px;
          font-weight: 850;
          letter-spacing: .02em;
          background: rgba(255, 255, 255, .055);
          border: 1px solid rgba(255, 255, 255, .08);
        }

        .usd-route-rail a[data-primary="true"] {
          background: rgba(103, 232, 249, .16);
          border-color: rgba(103, 232, 249, .26);
        }

        @keyframes usd-ground-breathe {
          0%, 100% { opacity: .76; filter: drop-shadow(0 0 36px rgba(103, 232, 249, .12)); }
          50% { opacity: .96; filter: drop-shadow(0 0 72px rgba(103, 232, 249, .24)); }
        }

        @media (max-width: 720px) {
          .usd-world-badge { top: 12px; left: 12px; }
          .usd-sky-entry { top: 86px; right: 12px; }
          .usd-ground-entry { width: 112vw; min-height: 190px; height: 32vh; }
          .usd-ground-entry__gate { bottom: 78px; }
          .usd-route-rail { bottom: 10px; }
        }
      `}</style>
    </main>
  )
}
