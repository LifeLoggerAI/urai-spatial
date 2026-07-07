'use client'

import Link from 'next/link'
import LifeMapScene from '@/spatial/lifemap/LifeMapScene'

const navItems = [
  ['Ground', '/ground', 'Descend'],
  ['Life Map', '/life-map', 'Sky'],
  ['Focus', '/focus?manifestId=seed-memory-bloom', 'Star'],
  ['Replay', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', 'Film'],
  ['Passport', '/passport', 'Vault'],
  ['Status', '/status', 'Control'],
] as const

const roomItems = [
  ['Identity Vault', '/passport', 'permission room'],
  ['Proof Deck', '/status', 'launch truth room'],
  ['Memory Film', '/replay?memoryId=quiet-reset&manifestId=replay-recovery-thread', 'projection layer'],
] as const

export default function SpatialDefaultWorld() {
  return (
    <main
      aria-label="URAI explorable spatial world"
      data-urai-default-spatial-world="ground-lifemap-galaxy"
      data-cinematic-pass="spatial-world-opening-20260707"
    >
      <LifeMapScene />

      <div className="usd-boot" aria-hidden="true">
        <span className="usd-boot__core" />
        <span className="usd-boot__scan usd-boot__scan--one" />
        <span className="usd-boot__scan usd-boot__scan--two" />
        <strong>URAI SPATIAL WORLD</strong>
        <em>galaxy forming · ground resolving · memories online</em>
      </div>

      <div className="usd-depth usd-depth--far" aria-hidden="true" />
      <div className="usd-depth usd-depth--mid" aria-hidden="true" />
      <div className="usd-orbit-path usd-orbit-path--one" aria-hidden="true" />
      <div className="usd-orbit-path usd-orbit-path--two" aria-hidden="true" />

      <Link className="usd-ground-entry" href="/ground" aria-label="Enter the Ground world">
        <span className="usd-ground-entry__horizon" />
        <span className="usd-ground-entry__bridge" />
        <span className="usd-ground-entry__plane" />
        <span className="usd-ground-entry__particles" />
        <span className="usd-ground-entry__gate">
          <i aria-hidden="true" />
          <strong>Enter Ground</strong>
          <em>walk the real-life layer</em>
        </span>
      </Link>

      <Link className="usd-sky-entry" href="/life-map" aria-label="Open the Life Map galaxy">
        <strong>Life Map sky</strong>
        <span>orbit identity, memory, focus, replay, and future paths</span>
      </Link>

      <aside className="usd-focus-hint" aria-label="Focus and replay continuity">
        <span className="usd-focus-hint__star" aria-hidden="true" />
        <strong>Tap a star to fly into Focus</strong>
        <em>Replay opens as a memory film from that node.</em>
      </aside>

      <section className="usd-room-stack" aria-label="World rooms and control layers">
        {roomItems.map(([label, href, note]) => (
          <Link key={href} href={href}>
            <strong>{label}</strong>
            <span>{note}</span>
          </Link>
        ))}
      </section>

      <header className="usd-world-badge" aria-label="URAI spatial entry controls">
        <strong>URAI SPATIAL</strong>
        <span>Drag to orbit. Tap stars. Ground is below.</span>
      </header>

      <nav className="usd-route-rail" aria-label="URAI spatial route rail">
        {navItems.map(([label, href, mode]) => (
          <Link key={href} href={href} data-primary={label === 'Ground' || label === 'Life Map' ? 'true' : 'false'}>
            <span>{mode}</span>
            <strong>{label}</strong>
          </Link>
        ))}
      </nav>

      <style jsx>{`
        :global(.lm3d-root) {
          animation: usd-camera-arrival 4.8s cubic-bezier(.16, 1, .3, 1) both;
        }

        :global(.lm3d-root:after) {
          background:
            radial-gradient(circle at 50% 48%, transparent 0 28%, rgba(0,0,0,.22) 60%, rgba(0,0,0,.72) 100%),
            linear-gradient(180deg, rgba(2,6,23,.18), rgba(2,6,23,0) 42%, rgba(7,12,18,.68) 100%) !important;
        }

        :global(.lm3d-hero) {
          opacity: .12;
          transform: translateY(-14px) scale(.9);
          pointer-events: none;
        }

        :global(.lm3d-hero h1),
        :global(.lm3d-hero span) {
          display: none;
        }

        :global(.lm3d-node-label) {
          border-radius: 999px !important;
          border: 1px solid rgba(180, 235, 255, .48) !important;
          background: rgba(1, 8, 20, .72) !important;
          box-shadow: 0 0 34px rgba(103, 232, 249, .22) !important;
          backdrop-filter: blur(16px) !important;
        }

        :global(.lm3d-focus) {
          border-radius: 30px !important;
          transform-origin: center center;
          animation: usd-focus-materialize .64s cubic-bezier(.16, 1, .3, 1) both;
        }

        :global(.lm3d-focus:before) {
          content: '';
          position: absolute;
          inset: -90px;
          z-index: -1;
          pointer-events: none;
          background: radial-gradient(circle, color-mix(in srgb, var(--aura), transparent 58%), transparent 62%);
          filter: blur(14px);
        }

        :global(.lm3d-status) {
          bottom: 126px;
          opacity: .76;
        }

        .usd-boot {
          position: fixed;
          inset: 0;
          z-index: 220;
          display: grid;
          place-items: center;
          pointer-events: none;
          background:
            radial-gradient(circle at 50% 48%, rgba(103, 232, 249, .26), transparent 0 12%, rgba(2, 6, 23, .62) 42%, rgba(1, 4, 10, .92) 100%);
          color: #f8fbff;
          animation: usd-boot-exit 3.3s cubic-bezier(.16, 1, .3, 1) forwards;
        }

        .usd-boot strong,
        .usd-boot em {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          white-space: nowrap;
        }

        .usd-boot strong {
          top: calc(50% + 74px);
          font-size: clamp(13px, 2vw, 18px);
          letter-spacing: .26em;
        }

        .usd-boot em {
          top: calc(50% + 104px);
          color: rgba(219, 244, 255, .72);
          font-size: 12px;
          font-style: normal;
          letter-spacing: .08em;
        }

        .usd-boot__core {
          width: 104px;
          height: 104px;
          border-radius: 999px;
          background:
            radial-gradient(circle at 34% 28%, white 0 7%, rgba(255,255,255,.72) 8% 15%, transparent 16%),
            radial-gradient(circle, #9af8ff 0 20%, #38bdf8 34%, rgba(14, 23, 43, .96) 72%);
          box-shadow: 0 0 70px rgba(103, 232, 249, .78), 0 0 180px rgba(99, 102, 241, .28);
          animation: usd-ignite 2.6s ease-in-out both;
        }

        .usd-boot__scan {
          position: absolute;
          left: 50%;
          top: 50%;
          width: min(70vw, 620px);
          height: min(70vw, 620px);
          border: 1px solid rgba(155, 231, 255, .18);
          border-radius: 999px;
          transform: translate(-50%, -50%);
          animation: usd-scan 2.8s ease-out both;
        }

        .usd-boot__scan--two {
          width: min(86vw, 860px);
          height: min(86vw, 860px);
          animation-delay: .22s;
        }

        .usd-depth {
          position: fixed;
          inset: -20%;
          z-index: 90;
          pointer-events: none;
          opacity: .48;
          mix-blend-mode: screen;
        }

        .usd-depth--far {
          background:
            radial-gradient(circle at 12% 20%, rgba(103,232,249,.34) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 32%, rgba(192,132,252,.38) 0 1px, transparent 2px),
            radial-gradient(circle at 62% 74%, rgba(255,255,255,.28) 0 1px, transparent 2px);
          background-size: 180px 180px, 240px 240px, 310px 310px;
          animation: usd-far-drift 24s linear infinite;
        }

        .usd-depth--mid {
          background:
            radial-gradient(ellipse at 44% 38%, rgba(103,232,249,.11), transparent 44%),
            radial-gradient(ellipse at 68% 46%, rgba(168,85,247,.12), transparent 48%),
            radial-gradient(ellipse at 38% 72%, rgba(34,211,238,.08), transparent 42%);
          filter: blur(16px);
          animation: usd-nebula-drift 18s ease-in-out infinite alternate;
        }

        .usd-orbit-path {
          position: fixed;
          z-index: 91;
          left: 50%;
          top: 48%;
          width: min(92vw, 980px);
          height: min(62vw, 520px);
          border: 1px solid rgba(155, 231, 255, .12);
          border-radius: 999px;
          transform: translate(-50%, -50%) rotate(-10deg);
          pointer-events: none;
          box-shadow: 0 0 90px rgba(103,232,249,.06);
        }

        .usd-orbit-path--two {
          width: min(104vw, 1180px);
          height: min(74vw, 660px);
          transform: translate(-50%, -50%) rotate(18deg);
          border-color: rgba(192,132,252,.1);
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
          animation: usd-ui-arrive 1.2s cubic-bezier(.16, 1, .3, 1) .92s both;
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
          width: min(300px, calc(100vw - 36px));
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(160, 220, 255, .2);
          background: rgba(2, 6, 18, .42);
          color: #f8fbff;
          text-decoration: none;
          box-shadow: 0 24px 90px rgba(0, 0, 0, .28), 0 0 44px rgba(103, 232, 249, .08);
          backdrop-filter: blur(16px);
          animation: usd-ui-arrive 1.2s cubic-bezier(.16, 1, .3, 1) 1.08s both;
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

        .usd-focus-hint {
          position: fixed;
          z-index: 154;
          left: clamp(18px, 6vw, 78px);
          bottom: clamp(162px, 23vh, 246px);
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 3px 10px;
          max-width: min(360px, calc(100vw - 36px));
          padding: 12px 14px;
          border-radius: 18px;
          border: 1px solid rgba(192, 132, 252, .2);
          background: rgba(12, 8, 34, .44);
          color: #f8fbff;
          box-shadow: 0 24px 90px rgba(0,0,0,.26), 0 0 60px rgba(168,85,247,.09);
          backdrop-filter: blur(16px);
          animation: usd-ui-arrive 1.2s cubic-bezier(.16, 1, .3, 1) 1.18s both;
        }

        .usd-focus-hint__star {
          grid-row: span 2;
          width: 16px;
          height: 16px;
          align-self: center;
          border-radius: 999px;
          background: #f8fbff;
          box-shadow: 0 0 18px #fff, 0 0 42px rgba(168,85,247,.72), 0 0 80px rgba(103,232,249,.3);
          animation: usd-star-pulse 1.8s ease-in-out infinite;
        }

        .usd-focus-hint strong {
          font-size: 12px;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .usd-focus-hint em {
          color: rgba(235, 244, 255, .72);
          font-size: 12px;
          font-style: normal;
        }

        .usd-room-stack {
          position: fixed;
          z-index: 153;
          right: clamp(14px, 4vw, 52px);
          bottom: clamp(110px, 19vh, 210px);
          display: grid;
          gap: 8px;
          width: min(270px, calc(100vw - 28px));
          animation: usd-ui-arrive 1.2s cubic-bezier(.16, 1, .3, 1) 1.28s both;
        }

        .usd-room-stack a {
          display: grid;
          gap: 3px;
          padding: 11px 13px;
          border-radius: 18px;
          border: 1px solid rgba(160,220,255,.14);
          background: linear-gradient(135deg, rgba(255,255,255,.075), rgba(255,255,255,.025));
          color: #f8fbff;
          text-decoration: none;
          box-shadow: 0 18px 70px rgba(0,0,0,.22);
          backdrop-filter: blur(16px);
        }

        .usd-room-stack a:hover,
        .usd-room-stack a:focus-visible,
        .usd-sky-entry:hover,
        .usd-sky-entry:focus-visible,
        .usd-route-rail a:hover,
        .usd-route-rail a:focus-visible {
          outline: none;
          border-color: rgba(103,232,249,.5);
          box-shadow: 0 0 48px rgba(103,232,249,.15), 0 18px 70px rgba(0,0,0,.28);
        }

        .usd-room-stack strong {
          font-size: 12px;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .usd-room-stack span {
          color: rgba(235,244,255,.68);
          font-size: 11px;
        }

        .usd-ground-entry {
          position: fixed;
          z-index: 150;
          left: 50%;
          bottom: 0;
          width: min(1060px, 98vw);
          height: 39vh;
          min-height: 250px;
          transform: translateX(-50%);
          color: #f8fbff;
          text-decoration: none;
          perspective: 860px;
          pointer-events: auto;
          animation: usd-ground-arrive 1.8s cubic-bezier(.16, 1, .3, 1) .72s both;
        }

        .usd-ground-entry__horizon {
          position: absolute;
          left: 50%;
          bottom: 48%;
          width: 84%;
          height: 2px;
          transform: translateX(-50%);
          background: linear-gradient(90deg, transparent, rgba(103,232,249,.8), transparent);
          box-shadow: 0 0 44px rgba(103,232,249,.6), 0 22px 90px rgba(34,211,238,.25);
          opacity: .78;
        }

        .usd-ground-entry__bridge {
          position: absolute;
          left: 50%;
          bottom: 16%;
          width: min(34vw, 280px);
          height: 68%;
          transform: translateX(-50%) rotateX(68deg);
          transform-origin: bottom center;
          clip-path: polygon(43% 0, 57% 0, 100% 100%, 0 100%);
          background:
            repeating-linear-gradient(180deg, rgba(255,255,255,.18) 0 1px, transparent 1px 22px),
            linear-gradient(90deg, transparent, rgba(103,232,249,.18), transparent);
          filter: drop-shadow(0 0 30px rgba(103,232,249,.24));
          animation: usd-bridge-flow 2.4s linear infinite;
        }

        .usd-ground-entry__plane {
          position: absolute;
          left: 50%;
          bottom: -36%;
          width: 116%;
          height: 122%;
          transform: translateX(-50%) rotateX(66deg);
          transform-origin: bottom center;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(ellipse at 50% 18%, rgba(103, 232, 249, .42), transparent 0 10%, rgba(103, 232, 249, .14) 11%, transparent 34%),
            repeating-radial-gradient(ellipse at 50% 18%, rgba(160, 220, 255, .28) 0 1px, transparent 1px 34px),
            linear-gradient(90deg, transparent 0 48%, rgba(160, 220, 255, .28) 49%, rgba(160, 220, 255, .28) 51%, transparent 52%),
            radial-gradient(ellipse at 50% 20%, rgba(14, 165, 233, .2), rgba(2, 6, 18, .02) 62%, transparent 74%);
          filter: drop-shadow(0 0 54px rgba(103, 232, 249, .2));
          opacity: .94;
          animation: usd-ground-breathe 4.8s ease-in-out infinite;
        }

        .usd-ground-entry__particles {
          position: absolute;
          left: 50%;
          bottom: 18%;
          width: 78%;
          height: 72%;
          transform: translateX(-50%);
          background:
            radial-gradient(circle at 12% 12%, rgba(255,255,255,.72) 0 1px, transparent 2px),
            radial-gradient(circle at 32% 44%, rgba(103,232,249,.74) 0 1px, transparent 2px),
            radial-gradient(circle at 64% 22%, rgba(192,132,252,.68) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 68%, rgba(255,255,255,.6) 0 1px, transparent 2px);
          background-size: 130px 120px;
          opacity: .7;
          filter: blur(.2px);
          animation: usd-particles-descend 3.6s linear infinite;
        }

        .usd-ground-entry__gate {
          position: absolute;
          left: 50%;
          bottom: 86px;
          display: grid;
          gap: 3px;
          min-width: 202px;
          padding: 16px 20px;
          transform: translateX(-50%);
          text-align: center;
          border-radius: 999px;
          border: 1px solid rgba(103, 232, 249, .44);
          background: rgba(2, 6, 18, .68);
          box-shadow: 0 0 68px rgba(103, 232, 249, .16), inset 0 1px 0 rgba(255, 255, 255, .12);
          backdrop-filter: blur(18px);
        }

        .usd-ground-entry__gate i {
          position: absolute;
          inset: -14px;
          border: 1px solid rgba(103,232,249,.26);
          border-radius: 999px;
          box-shadow: 0 0 36px rgba(103,232,249,.14);
          animation: usd-portal-ring 2.8s ease-in-out infinite;
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

        .usd-ground-entry:hover .usd-ground-entry__gate,
        .usd-ground-entry:focus-visible .usd-ground-entry__gate {
          border-color: rgba(255,255,255,.62);
          box-shadow: 0 0 110px rgba(103,232,249,.34), inset 0 1px 0 rgba(255,255,255,.18);
        }

        .usd-ground-entry:hover .usd-ground-entry__bridge,
        .usd-ground-entry:focus-visible .usd-ground-entry__bridge {
          filter: drop-shadow(0 0 52px rgba(103,232,249,.46));
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
          animation: usd-ui-arrive 1.2s cubic-bezier(.16, 1, .3, 1) 1.36s both;
        }

        .usd-route-rail a {
          display: grid;
          gap: 2px;
          min-width: max-content;
          padding: 9px 14px;
          border-radius: 999px;
          color: #f8fbff;
          text-decoration: none;
          background: rgba(255, 255, 255, .055);
          border: 1px solid rgba(255, 255, 255, .08);
        }

        .usd-route-rail a span {
          color: rgba(190, 240, 255, .68);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
          text-transform: uppercase;
        }

        .usd-route-rail a strong {
          font-size: 12px;
          font-weight: 850;
          letter-spacing: .02em;
        }

        .usd-route-rail a[data-primary="true"] {
          background: rgba(103, 232, 249, .16);
          border-color: rgba(103, 232, 249, .26);
        }

        @keyframes usd-camera-arrival {
          0% { filter: blur(16px) brightness(.58) saturate(.78); transform: scale(1.08) translate3d(0, 18px, 0); }
          38% { filter: blur(4px) brightness(.84) saturate(1.08); transform: scale(1.035) translate3d(0, 4px, 0); }
          100% { filter: blur(0) brightness(1) saturate(1.08); transform: scale(1) translate3d(0, 0, 0); }
        }

        @keyframes usd-boot-exit {
          0%, 66% { opacity: 1; visibility: visible; }
          100% { opacity: 0; visibility: hidden; }
        }

        @keyframes usd-ignite {
          0% { transform: scale(.32); opacity: 0; }
          45% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(.9); opacity: .72; }
        }

        @keyframes usd-scan {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(.28); }
          32% { opacity: .8; }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
        }

        @keyframes usd-ui-arrive {
          0% { opacity: 0; transform: translate3d(0, 10px, 0) scale(.98); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }

        @keyframes usd-ground-arrive {
          0% { opacity: 0; transform: translateX(-50%) translateY(44px) scale(.96); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        @keyframes usd-ground-breathe {
          0%, 100% { opacity: .76; filter: drop-shadow(0 0 36px rgba(103, 232, 249, .12)); }
          50% { opacity: .98; filter: drop-shadow(0 0 78px rgba(103, 232, 249, .28)); }
        }

        @keyframes usd-bridge-flow {
          from { background-position: 0 0, 0 0; }
          to { background-position: 0 44px, 0 0; }
        }

        @keyframes usd-particles-descend {
          from { transform: translateX(-50%) translateY(-12px); opacity: .35; }
          50% { opacity: .82; }
          to { transform: translateX(-50%) translateY(34px); opacity: .28; }
        }

        @keyframes usd-portal-ring {
          0%, 100% { transform: scale(.98); opacity: .42; }
          50% { transform: scale(1.08); opacity: .82; }
        }

        @keyframes usd-star-pulse {
          0%, 100% { transform: scale(.88); opacity: .74; }
          50% { transform: scale(1.16); opacity: 1; }
        }

        @keyframes usd-far-drift {
          from { transform: translate3d(-2%, -1%, 0); }
          to { transform: translate3d(2%, 1%, 0); }
        }

        @keyframes usd-nebula-drift {
          from { transform: translate3d(-1%, 1%, 0) scale(1); opacity: .34; }
          to { transform: translate3d(1%, -1%, 0) scale(1.06); opacity: .58; }
        }

        @keyframes usd-focus-materialize {
          0% { opacity: 0; transform: translate3d(0, 28px, 0) scale(.88); filter: blur(16px); }
          100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1); filter: blur(0); }
        }

        @media (max-width: 820px) {
          :global(.lm3d-status) { bottom: 122px; max-width: calc(100vw - 32px); }
          :global(.lm3d-reset) { top: auto; bottom: 76px; right: 12px; }
          .usd-world-badge { top: 12px; left: 12px; max-width: calc(100vw - 24px); }
          .usd-sky-entry { top: 86px; right: 12px; width: min(260px, calc(100vw - 24px)); }
          .usd-focus-hint { left: 12px; bottom: 196px; max-width: min(330px, calc(100vw - 24px)); }
          .usd-room-stack { display: none; }
          .usd-ground-entry { width: 116vw; min-height: 214px; height: 34vh; }
          .usd-ground-entry__gate { bottom: 82px; min-width: 190px; }
          .usd-route-rail { bottom: 10px; width: calc(100vw - 22px); justify-content: flex-start; }
          .usd-route-rail a { padding: 8px 12px; }
        }

        @media (max-width: 480px) {
          .usd-boot strong { letter-spacing: .14em; }
          .usd-boot em { width: 92vw; white-space: normal; }
          .usd-sky-entry { top: 82px; }
          .usd-focus-hint { bottom: 174px; }
          .usd-ground-entry { min-height: 198px; }
          .usd-ground-entry__gate { bottom: 76px; }
          .usd-ground-entry__bridge { width: 180px; }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.lm3d-root),
          .usd-boot,
          .usd-boot__core,
          .usd-boot__scan,
          .usd-world-badge,
          .usd-sky-entry,
          .usd-focus-hint,
          .usd-room-stack,
          .usd-ground-entry,
          .usd-ground-entry__plane,
          .usd-ground-entry__bridge,
          .usd-ground-entry__particles,
          .usd-ground-entry__gate i,
          .usd-depth,
          .usd-route-rail {
            animation: none !important;
          }
          .usd-boot { display: none; }
        }
      `}</style>
    </main>
  )
}
