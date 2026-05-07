'use client'

import { useRouter } from 'next/navigation'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

const lifeMapStars = [
  { manifestId: 'seed-memory-bloom', left: '16%', top: '28%', size: '16px', label: 'Memory Bloom' },
  { manifestId: 'seed-recovery-arc', left: '28%', top: '48%', size: '12px', label: 'Recovery Arc' },
  { manifestId: 'seed-threshold-storm', left: '44%', top: '31%', size: '18px', label: 'Threshold' },
  { manifestId: 'seed-mirror-focus', left: '59%', top: '54%', size: '14px', label: 'Mirror Focus' },
  { manifestId: 'seed-ritual-echo', left: '72%', top: '24%', size: '13px', label: 'Ritual Echo' },
  { manifestId: 'seed-dream-signal', left: '82%', top: '64%', size: '11px', label: 'Dream Signal' },
  { manifestId: 'seed-calm-return', left: '38%', top: '72%', size: '14px', label: 'Calm Return' },
]

function SceneOverlayStyles() {
  return (
    <style>{`
      .urai-scene-stage[data-scene-mode='home'] canvas,
      .urai-scene-stage[data-scene-mode='life-map'] canvas,
      .urai-scene-stage[data-scene-mode='demo'] canvas {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      .urai-scene-stage[data-scene-mode='ascent'] canvas {
        opacity: 0.06 !important;
        pointer-events: none !important;
      }

      .urai-scene-stage[data-scene-mode='home'],
      .urai-scene-stage[data-scene-mode='ascent'],
      .urai-scene-stage[data-scene-mode='life-map'],
      .urai-scene-stage[data-scene-mode='demo'] {
        background: #081226 !important;
      }

      .urai-visual-overlay {
        position: absolute !important;
        inset: 0 !important;
        z-index: 30 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        isolation: isolate !important;
      }

      .urai-sky-click-target {
        z-index: 35 !important;
      }

      .urai-camera-reset,
      .urai-spatial-guidance,
      .urai-focus-action-panel,
      .tier-one-route-card,
      .urai-hud-layer {
        z-index: 50 !important;
      }

      .urai-visual-overlay--home {
        background:
          radial-gradient(circle at 50% 48%, rgba(103, 232, 249, 0.26), transparent 24%),
          radial-gradient(circle at 50% 76%, rgba(139, 92, 246, 0.2), transparent 30%),
          linear-gradient(180deg, #244ca2 0%, #122760 38%, #0b1738 70%, #020611 100%) !important;
      }

      .urai-visual-overlay--home::before {
        content: '';
        position: absolute;
        inset: 0 0 35% 0;
        background-image:
          radial-gradient(2px 2px at 18% 28%, rgba(255,255,255,0.9), transparent),
          radial-gradient(1px 1px at 34% 18%, rgba(255,255,255,0.7), transparent),
          radial-gradient(2px 2px at 68% 26%, rgba(199,229,255,0.86), transparent),
          radial-gradient(1px 1px at 82% 46%, rgba(255,255,255,0.64), transparent),
          radial-gradient(1px 1px at 52% 36%, rgba(167,139,250,0.86), transparent),
          radial-gradient(2px 2px at 73% 14%, rgba(255,255,255,0.6), transparent);
        opacity: 0.72;
      }

      .urai-home-sky-band {
        position: absolute;
        inset: 0 0 30% 0;
        background:
          radial-gradient(circle at 50% 42%, rgba(255,255,255,0.2), transparent 9%),
          radial-gradient(circle at 50% 50%, rgba(126, 205, 255, 0.38), transparent 30%),
          linear-gradient(180deg, rgba(48, 98, 197, 0.86), rgba(14, 32, 86, 0.72) 58%, transparent 100%);
      }

      .urai-home-horizon {
        position: absolute;
        left: 8%;
        right: 8%;
        top: 58%;
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, rgba(103,232,249,0.68), rgba(167,139,250,0.5), transparent);
        box-shadow: 0 0 30px rgba(103,232,249,0.42);
      }

      .urai-home-cloud {
        position: absolute;
        height: 18vh;
        border-radius: 999px;
        filter: blur(28px);
        opacity: 0.42;
        background: rgba(174, 219, 255, 0.5);
      }
      .urai-home-cloud--one { width: 58vw; left: -12vw; top: 23vh; }
      .urai-home-cloud--two { width: 54vw; right: -10vw; top: 33vh; background: rgba(184, 164, 255, 0.42); }
      .urai-home-cloud--three { width: 42vw; left: 32vw; top: 43vh; opacity: 0.24; background: rgba(103,232,249,0.48); }

      .urai-home-ground {
        position: absolute;
        left: -12%;
        right: -12%;
        bottom: -9%;
        height: 38%;
        border-radius: 50% 50% 0 0;
        background:
          radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.32), transparent 40%),
          linear-gradient(180deg, rgba(57, 82, 130, 1), rgba(8, 11, 24, 1));
        box-shadow: 0 -28px 110px rgba(103,232,249,0.24);
      }

      .urai-home-ground-glow {
        position: absolute;
        left: 16%;
        right: 16%;
        bottom: 20%;
        height: 10%;
        border-radius: 999px;
        background: rgba(103,232,249,0.36);
        filter: blur(32px);
      }

      .urai-home-orb {
        position: absolute;
        left: 50%;
        top: 55%;
        width: clamp(160px, 18vw, 240px);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
      }
      .urai-home-orb__halo,
      .urai-home-orb__ring,
      .urai-home-orb__core {
        position: absolute;
        inset: 0;
        border-radius: 999px;
      }
      .urai-home-orb__halo {
        background: radial-gradient(circle, rgba(139,92,246,0.78), rgba(103,232,249,0.3) 42%, transparent 74%);
        filter: blur(9px);
        animation: uraiOrbBreath 3.2s ease-in-out infinite;
      }
      .urai-home-orb__ring {
        inset: -18%;
        border: 1px solid rgba(103,232,249,0.42);
        box-shadow: inset 0 0 38px rgba(139,92,246,0.18), 0 0 52px rgba(103,232,249,0.2);
      }
      .urai-home-orb__core {
        inset: 24%;
        background: radial-gradient(circle at 35% 28%, #ffffff, #d6c7ff 22%, #8b5cf6 52%, #22d3ee 100%);
        box-shadow: 0 0 82px rgba(139,92,246,0.78), 0 0 160px rgba(34,211,238,0.34);
      }

      .urai-home-compass {
        position: absolute;
        left: 18px;
        bottom: 18px;
        display: grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid rgba(142,220,255,0.28);
        background: rgba(3,7,18,0.5);
        color: rgba(235,244,255,0.86);
        font-size: 0.78rem;
      }

      .urai-visual-overlay--ascent {
        background:
          radial-gradient(circle at 50% 45%, rgba(103,232,249,0.28), transparent 18%),
          radial-gradient(circle at 50% 56%, rgba(139,92,246,0.34), transparent 42%),
          linear-gradient(180deg, #02051a 0%, #071126 64%, #010208 100%);
      }
      .urai-ascent-rift {
        position: absolute;
        left: 50%;
        top: -15%;
        width: 32vw;
        height: 130%;
        transform: translateX(-50%) skewX(-8deg);
        background: linear-gradient(180deg, transparent, rgba(103,232,249,0.18), rgba(167,139,250,0.12), transparent);
        filter: blur(20px);
      }
      .urai-ascent-tunnel {
        position: absolute;
        left: 50%;
        top: 48%;
        width: min(84vw, 840px);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
      }
      .urai-ascent-tunnel span {
        position: absolute;
        inset: 12%;
        border: 2px solid rgba(103,232,249,0.32);
        border-radius: 999px;
        box-shadow: 0 0 42px rgba(103,232,249,0.18), inset 0 0 44px rgba(139,92,246,0.16);
        animation: uraiAscentRing 2.8s ease-in-out infinite;
      }
      .urai-ascent-tunnel span:nth-child(2) { inset: 22%; animation-delay: 0.25s; border-color: rgba(167,139,250,0.44); }
      .urai-ascent-tunnel span:nth-child(3) { inset: 33%; animation-delay: 0.5s; border-color: rgba(125,211,252,0.46); }
      .urai-ascent-tunnel span:nth-child(4) { inset: 44%; animation-delay: 0.75s; border-color: rgba(255,255,255,0.38); }
      .urai-ascent-tunnel span:nth-child(5) { inset: 4%; animation-delay: 1s; border-color: rgba(103,232,249,0.18); }
      .urai-ascent-portal-core {
        position: absolute;
        left: 50%;
        top: 48%;
        width: clamp(82px, 10vw, 130px);
        aspect-ratio: 1;
        border-radius: 999px;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, #ffffff, #67e8f9 22%, #8b5cf6 52%, transparent 74%);
        box-shadow: 0 0 86px rgba(103,232,249,0.68), 0 0 210px rgba(139,92,246,0.46);
      }
      .urai-ascent-stream {
        position: absolute;
        top: -10%;
        bottom: -10%;
        width: 14%;
        background: linear-gradient(180deg, transparent, rgba(103,232,249,0.28), transparent);
        filter: blur(18px);
        transform: skewX(-18deg);
      }
      .urai-ascent-stream--one { left: 20%; }
      .urai-ascent-stream--two { right: 18%; background: linear-gradient(180deg, transparent, rgba(167,139,250,0.26), transparent); }
      .urai-ascent-stream--three { left: 48%; width: 8%; opacity: 0.54; }

      .urai-visual-overlay--life-map {
        background:
          radial-gradient(circle at 50% 46%, rgba(103,232,249,0.18), transparent 22%),
          radial-gradient(circle at 35% 44%, rgba(139,92,246,0.2), transparent 32%),
          linear-gradient(180deg, #08112a 0%, #020817 100%);
      }
      .urai-life-map-nebula {
        position: absolute;
        inset: 7% 8% 9%;
        border-radius: 44px;
        background:
          radial-gradient(circle at 48% 44%, rgba(103,232,249,0.36), transparent 16%),
          radial-gradient(circle at 24% 38%, rgba(139,92,246,0.32), transparent 23%),
          radial-gradient(circle at 72% 60%, rgba(244,114,182,0.22), transparent 24%),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 48%);
        box-shadow: inset 0 0 120px rgba(103,232,249,0.1);
      }
      .urai-life-map-lines {
        position: absolute;
        inset: 14% 12%;
        opacity: 0.48;
        background:
          linear-gradient(28deg, transparent 0 23%, rgba(103,232,249,0.46) 23.2% 23.6%, transparent 23.8% 100%),
          linear-gradient(142deg, transparent 0 36%, rgba(167,139,250,0.42) 36.2% 36.5%, transparent 36.7% 100%),
          linear-gradient(86deg, transparent 0 52%, rgba(103,232,249,0.38) 52.2% 52.5%, transparent 52.7% 100%);
      }
      .urai-life-map-orbit {
        position: absolute;
        border: 1px solid rgba(103,232,249,0.18);
        border-radius: 999px;
        transform: rotate(-12deg);
      }
      .urai-life-map-orbit--one { left: 18%; top: 18%; right: 18%; bottom: 18%; }
      .urai-life-map-orbit--two { left: 30%; top: 9%; right: 30%; bottom: 9%; transform: rotate(22deg); border-color: rgba(167,139,250,0.18); }
      .urai-life-map-star-button {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 42px;
        height: 42px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        pointer-events: auto !important;
        cursor: pointer;
        z-index: 36;
      }
      .urai-life-map-star-button::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 50%;
        width: var(--star-size);
        height: var(--star-size);
        transform: translate(-50%, -50%);
        border-radius: 999px;
        background: #e0f7ff;
        box-shadow: 0 0 18px rgba(103,232,249,0.98), 0 0 50px rgba(139,92,246,0.58);
        animation: uraiStarPulse 2.4s ease-in-out infinite;
      }
      .urai-life-map-star-button span {
        position: absolute;
        left: 30px;
        top: 8px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(3,7,18,0.62);
        border: 1px solid rgba(142,220,255,0.26);
        color: rgba(235,244,255,0.86);
        font-size: 0.62rem;
        white-space: nowrap;
        backdrop-filter: blur(10px);
      }
      .urai-life-map-star-button:hover::before,
      .urai-life-map-star-button:focus-visible::before {
        width: calc(var(--star-size) + 8px);
        height: calc(var(--star-size) + 8px);
        box-shadow: 0 0 28px rgba(255,255,255,0.92), 0 0 72px rgba(103,232,249,0.72);
      }
      .urai-life-map-star-button:focus-visible {
        outline: 2px solid rgba(125,211,252,0.92);
        outline-offset: 2px;
      }

      .urai-visual-caption,
      .urai-scene-status {
        position: absolute;
        border: 1px solid rgba(142,220,255,0.26);
        background: rgba(3,7,18,0.52);
        color: rgba(235,244,255,0.82);
        backdrop-filter: blur(16px);
      }
      .urai-visual-caption {
        left: 24px;
        bottom: 86px;
        display: grid;
        gap: 2px;
        padding: 10px 14px;
        border-radius: 18px;
      }
      .urai-visual-caption--right { left: auto; right: 24px; }
      .urai-visual-caption strong,
      .urai-scene-status strong {
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #e0f7ff;
      }
      .urai-visual-caption span,
      .urai-scene-status span:last-child { font-size: 0.72rem; color: rgba(235,244,255,0.74); }
      .urai-scene-status {
        left: 50%;
        bottom: 118px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        transform: translateX(-50%);
        padding: 8px 12px;
        border-radius: 999px;
      }
      .urai-scene-status__dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: #67e8f9;
        box-shadow: 0 0 18px rgba(103,232,249,0.85);
      }

      @keyframes uraiOrbBreath { 0%,100%{transform:scale(.96);opacity:.9} 50%{transform:scale(1.08);opacity:1} }
      @keyframes uraiAscentRing { 0%,100%{transform:scale(.96);opacity:.55} 50%{transform:scale(1.08);opacity:1} }
      @keyframes uraiStarPulse { 0%,100%{transform:translate(-50%,-50%) scale(.92);opacity:.82} 50%{transform:translate(-50%,-50%) scale(1.35);opacity:1} }

      @media (max-width: 640px) {
        .urai-scene-status { display: none; }
        .urai-life-map-star-button span { display: none; }
        .urai-visual-caption { left: 14px; bottom: 74px; }
        .urai-visual-caption--right { left: 14px; right: auto; }
      }
    `}</style>
  )
}

function SceneStatus({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="urai-scene-status" aria-hidden="true">
      <span className="urai-scene-status__dot" />
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  )
}

function LifeMapOverlay() {
  const router = useRouter()

  return (
    <div className="urai-visual-overlay urai-visual-overlay--life-map" data-visual-layer="life-map">
      <SceneOverlayStyles />
      <div className="urai-life-map-nebula" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--one" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--two" aria-hidden="true" />
      <div className="urai-life-map-lines" aria-hidden="true" />
      {lifeMapStars.map((star, index) => (
        <button
          key={star.manifestId}
          type="button"
          className="urai-life-map-star-button"
          style={{ left: star.left, top: star.top, ['--star-size' as string]: star.size, animationDelay: `${index * 0.18}s` }}
          aria-label={`Open ${star.label}`}
          onClick={() => router.push(`/focus?manifestId=${encodeURIComponent(star.manifestId)}`)}
        >
          <span>{star.label}</span>
        </button>
      ))}
      <div className="urai-visual-caption urai-visual-caption--right" aria-hidden="true">
        <strong>Life Map</strong>
        <span>Tap a star to open focus</span>
      </div>
      <SceneStatus label="Map online" detail="Visible stars now open Focus" />
    </div>
  )
}

function HomeOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--home" aria-hidden="true" data-visual-layer="home">
      <SceneOverlayStyles />
      <div className="urai-home-sky-band" />
      <div className="urai-home-horizon" />
      <div className="urai-home-cloud urai-home-cloud--one" />
      <div className="urai-home-cloud urai-home-cloud--two" />
      <div className="urai-home-cloud urai-home-cloud--three" />
      <div className="urai-home-ground" />
      <div className="urai-home-ground-glow" />
      <div className="urai-home-orb">
        <div className="urai-home-orb__halo" />
        <div className="urai-home-orb__ring" />
        <div className="urai-home-orb__core" />
      </div>
      <div className="urai-home-compass">N</div>
      <div className="urai-visual-caption">
        <strong>Home Scene</strong>
        <span>Sky, ground, and companion orb loaded</span>
      </div>
      <SceneStatus label="Home ready" detail="Click anywhere in the sky to ascend" />
    </div>
  )
}

function AscentOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--ascent" aria-hidden="true" data-visual-layer="ascent">
      <SceneOverlayStyles />
      <div className="urai-ascent-rift" />
      <div className="urai-ascent-tunnel">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="urai-ascent-stream urai-ascent-stream--one" />
      <div className="urai-ascent-stream urai-ascent-stream--two" />
      <div className="urai-ascent-stream urai-ascent-stream--three" />
      <div className="urai-ascent-portal-core" />
      <div className="urai-visual-caption urai-visual-caption--right">
        <strong>Ascent</strong>
        <span>Moving upward into the constellation layer</span>
      </div>
      <SceneStatus label="Ascent active" detail="Rift opening into Life Map" />
    </div>
  )
}

export default function SpatialVisualOverlay({ mode }: { mode: SceneMode }) {
  if (mode === 'home') return <HomeOverlay />
  if (mode === 'ascent') return <AscentOverlay />
  if (mode === 'life-map' || mode === 'demo') return <LifeMapOverlay />
  return null
}
