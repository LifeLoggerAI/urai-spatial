'use client'

import { useRouter } from 'next/navigation'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

const lifeMapStars = [
  { manifestId: 'seed-memory-bloom', left: '18%', top: '33%', size: '18px', label: 'Memory Bloom', tone: 'cyan' },
  { manifestId: 'seed-recovery-arc', left: '31%', top: '59%', size: '14px', label: 'Recovery Arc', tone: 'violet' },
  { manifestId: 'seed-threshold-storm', left: '45%', top: '36%', size: '20px', label: 'Threshold', tone: 'white' },
  { manifestId: 'seed-mirror-focus', left: '61%', top: '52%', size: '16px', label: 'Mirror Focus', tone: 'cyan' },
  { manifestId: 'seed-ritual-echo', left: '76%', top: '28%', size: '15px', label: 'Ritual Echo', tone: 'violet' },
  { manifestId: 'seed-dream-signal', left: '84%', top: '66%', size: '13px', label: 'Dream Signal', tone: 'pink' },
  { manifestId: 'seed-calm-return', left: '40%', top: '75%', size: '16px', label: 'Calm Return', tone: 'cyan' },
]

function SceneOverlayStyles() {
  return (
    <style>{`
      .urai-scene-stage canvas {
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      .urai-scene-stage[data-scene-mode='home'],
      .urai-scene-stage[data-scene-mode='ascent'],
      .urai-scene-stage[data-scene-mode='life-map'],
      .urai-scene-stage[data-scene-mode='demo'],
      .urai-scene-stage[data-scene-mode='focus'],
      .urai-scene-stage[data-scene-mode='replay'] {
        background:
          radial-gradient(circle at 50% 35%, rgba(72, 184, 255, 0.18), transparent 28%),
          radial-gradient(circle at 44% 75%, rgba(139, 92, 246, 0.2), transparent 35%),
          linear-gradient(180deg, #081430 0%, #030817 100%) !important;
      }

      .urai-visual-overlay {
        position: absolute !important;
        inset: 0 !important;
        z-index: 30 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        isolation: isolate !important;
      }

      .urai-visual-overlay::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(circle at 50% 50%, transparent 0 48%, rgba(0, 0, 0, 0.28) 100%),
          linear-gradient(180deg, rgba(1, 3, 12, 0) 62%, rgba(1, 3, 12, 0.44) 100%);
      }

      .urai-sky-click-target { z-index: 38 !important; }
      .urai-camera-reset,
      .urai-spatial-guidance,
      .urai-focus-action-panel,
      .tier-one-route-card,
      .urai-hud-layer { z-index: 60 !important; }

      .urai-visual-caption,
      .urai-scene-status {
        position: absolute;
        z-index: 4;
        border: 1px solid rgba(142, 220, 255, 0.28);
        background: rgba(3, 7, 18, 0.56);
        color: rgba(235, 244, 255, 0.86);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        box-shadow: 0 18px 72px rgba(0, 0, 0, 0.26);
      }

      .urai-visual-caption {
        left: 24px;
        bottom: 86px;
        display: grid;
        gap: 3px;
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
      .urai-scene-status span:last-child { font-size: 0.72rem; color: rgba(235, 244, 255, 0.74); }
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
        box-shadow: 0 0 18px rgba(103, 232, 249, 0.9);
      }

      .urai-visual-overlay--home {
        background:
          radial-gradient(circle at 50% 44%, rgba(160, 230, 255, 0.3), transparent 18%),
          radial-gradient(circle at 50% 66%, rgba(139, 92, 246, 0.24), transparent 30%),
          linear-gradient(180deg, #244fa9 0%, #142f73 36%, #081735 68%, #020611 100%) !important;
      }
      .urai-visual-overlay--home::before,
      .urai-visual-overlay--life-map::before,
      .urai-visual-overlay--focus::before {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 1;
        background-image:
          radial-gradient(2px 2px at 18% 28%, rgba(255,255,255,0.88), transparent),
          radial-gradient(1px 1px at 34% 18%, rgba(255,255,255,0.68), transparent),
          radial-gradient(2px 2px at 68% 26%, rgba(199,229,255,0.86), transparent),
          radial-gradient(1px 1px at 82% 46%, rgba(255,255,255,0.64), transparent),
          radial-gradient(1px 1px at 52% 36%, rgba(167,139,250,0.82), transparent),
          radial-gradient(2px 2px at 73% 14%, rgba(255,255,255,0.58), transparent),
          radial-gradient(1px 1px at 26% 72%, rgba(103,232,249,0.64), transparent);
        opacity: 0.76;
      }
      .urai-home-sky-band,
      .urai-home-horizon,
      .urai-home-cloud,
      .urai-home-ground,
      .urai-home-ground-glow,
      .urai-home-orb,
      .urai-home-compass { z-index: 2; }
      .urai-home-sky-band {
        position: absolute;
        inset: 0 0 30% 0;
        background:
          radial-gradient(circle at 50% 40%, rgba(255,255,255,0.24), transparent 10%),
          radial-gradient(circle at 50% 48%, rgba(126, 205, 255, 0.42), transparent 30%),
          linear-gradient(180deg, rgba(48, 98, 197, 0.86), rgba(14, 32, 86, 0.72) 58%, transparent 100%);
      }
      .urai-home-horizon {
        position: absolute;
        left: 8%;
        right: 8%;
        top: 59%;
        height: 2px;
        border-radius: 999px;
        background: linear-gradient(90deg, transparent, rgba(103,232,249,0.76), rgba(167,139,250,0.58), transparent);
        box-shadow: 0 0 34px rgba(103,232,249,0.5);
      }
      .urai-home-cloud {
        position: absolute;
        height: 18vh;
        border-radius: 999px;
        filter: blur(28px);
        opacity: 0.48;
        background: rgba(174, 219, 255, 0.54);
        animation: uraiCloudFloat 8s ease-in-out infinite;
      }
      .urai-home-cloud--one { width: 58vw; left: -12vw; top: 23vh; }
      .urai-home-cloud--two { width: 54vw; right: -10vw; top: 33vh; background: rgba(184, 164, 255, 0.46); animation-delay: -2s; }
      .urai-home-cloud--three { width: 42vw; left: 32vw; top: 43vh; opacity: 0.28; background: rgba(103,232,249,0.5); animation-delay: -4s; }
      .urai-home-ground {
        position: absolute;
        left: -12%;
        right: -12%;
        bottom: -9%;
        height: 39%;
        border-radius: 50% 50% 0 0;
        background:
          radial-gradient(ellipse at 50% 0%, rgba(103,232,249,0.34), transparent 42%),
          radial-gradient(ellipse at 50% 38%, rgba(139,92,246,0.24), transparent 54%),
          linear-gradient(180deg, rgba(57, 82, 130, 1), rgba(8, 11, 24, 1));
        box-shadow: 0 -28px 110px rgba(103,232,249,0.25);
      }
      .urai-home-ground-glow {
        position: absolute;
        left: 16%;
        right: 16%;
        bottom: 20%;
        height: 10%;
        border-radius: 999px;
        background: rgba(103,232,249,0.36);
        filter: blur(34px);
      }
      .urai-home-orb,
      .urai-focus-orb {
        position: absolute;
        left: 50%;
        top: 55%;
        width: clamp(170px, 19vw, 252px);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
      }
      .urai-home-orb__halo,
      .urai-home-orb__ring,
      .urai-home-orb__core,
      .urai-focus-orb__halo,
      .urai-focus-orb__ring,
      .urai-focus-orb__core {
        position: absolute;
        border-radius: 999px;
      }
      .urai-home-orb__halo,
      .urai-focus-orb__halo {
        inset: 0;
        background: radial-gradient(circle, rgba(139,92,246,0.78), rgba(103,232,249,0.3) 42%, transparent 74%);
        filter: blur(9px);
        animation: uraiOrbBreath 3.2s ease-in-out infinite;
      }
      .urai-home-orb__ring,
      .urai-focus-orb__ring {
        inset: -18%;
        border: 1px solid rgba(103,232,249,0.44);
        box-shadow: inset 0 0 38px rgba(139,92,246,0.18), 0 0 52px rgba(103,232,249,0.22);
      }
      .urai-home-orb__core,
      .urai-focus-orb__core {
        inset: 24%;
        background: radial-gradient(circle at 35% 28%, #ffffff, #d6c7ff 22%, #8b5cf6 52%, #22d3ee 100%);
        box-shadow: 0 0 86px rgba(139,92,246,0.82), 0 0 170px rgba(34,211,238,0.36);
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
        background: rgba(3,7,18,0.54);
        color: rgba(235,244,255,0.88);
        font-size: 0.78rem;
      }

      .urai-visual-overlay--ascent {
        background:
          radial-gradient(circle at 50% 45%, rgba(103,232,249,0.34), transparent 19%),
          radial-gradient(circle at 50% 56%, rgba(139,92,246,0.42), transparent 42%),
          linear-gradient(180deg, #02051a 0%, #071126 64%, #010208 100%);
      }
      .urai-ascent-rift {
        position: absolute;
        left: 50%;
        top: -15%;
        width: 34vw;
        height: 130%;
        transform: translateX(-50%) skewX(-8deg);
        background: linear-gradient(180deg, transparent, rgba(103,232,249,0.28), rgba(167,139,250,0.16), transparent);
        filter: blur(18px);
        animation: uraiRiftRise 2.4s ease-in-out infinite;
      }
      .urai-ascent-tunnel {
        position: absolute;
        left: 50%;
        top: 48%;
        width: min(84vw, 860px);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
      }
      .urai-ascent-tunnel span {
        position: absolute;
        inset: 12%;
        border: 2px solid rgba(103,232,249,0.34);
        border-radius: 999px;
        box-shadow: 0 0 46px rgba(103,232,249,0.2), inset 0 0 46px rgba(139,92,246,0.18);
        animation: uraiAscentRing 2.8s ease-in-out infinite;
      }
      .urai-ascent-tunnel span:nth-child(2) { inset: 22%; animation-delay: 0.25s; border-color: rgba(167,139,250,0.46); }
      .urai-ascent-tunnel span:nth-child(3) { inset: 33%; animation-delay: 0.5s; border-color: rgba(125,211,252,0.48); }
      .urai-ascent-tunnel span:nth-child(4) { inset: 44%; animation-delay: 0.75s; border-color: rgba(255,255,255,0.4); }
      .urai-ascent-tunnel span:nth-child(5) { inset: 4%; animation-delay: 1s; border-color: rgba(103,232,249,0.2); }
      .urai-ascent-portal-core {
        position: absolute;
        left: 50%;
        top: 48%;
        width: clamp(92px, 11vw, 144px);
        aspect-ratio: 1;
        border-radius: 999px;
        transform: translate(-50%, -50%);
        background: radial-gradient(circle, #ffffff, #67e8f9 22%, #8b5cf6 52%, transparent 74%);
        box-shadow: 0 0 90px rgba(103,232,249,0.72), 0 0 220px rgba(139,92,246,0.5);
      }
      .urai-ascent-stream {
        position: absolute;
        top: -10%;
        bottom: -10%;
        width: 14%;
        background: linear-gradient(180deg, transparent, rgba(103,232,249,0.3), transparent);
        filter: blur(18px);
        transform: skewX(-18deg);
      }
      .urai-ascent-stream--one { left: 20%; }
      .urai-ascent-stream--two { right: 18%; background: linear-gradient(180deg, transparent, rgba(167,139,250,0.28), transparent); }
      .urai-ascent-stream--three { left: 48%; width: 8%; opacity: 0.58; }

      .urai-visual-overlay--life-map {
        background:
          radial-gradient(circle at 50% 48%, rgba(103,232,249,0.24), transparent 20%),
          radial-gradient(circle at 34% 42%, rgba(139,92,246,0.24), transparent 32%),
          radial-gradient(circle at 73% 60%, rgba(244,114,182,0.18), transparent 26%),
          linear-gradient(180deg, #08112a 0%, #020817 100%);
      }
      .urai-life-map-nebula {
        position: absolute;
        inset: 6% 8% 8%;
        z-index: 2;
        border-radius: 44px;
        background:
          radial-gradient(circle at 48% 44%, rgba(103,232,249,0.38), transparent 16%),
          radial-gradient(circle at 24% 38%, rgba(139,92,246,0.34), transparent 23%),
          radial-gradient(circle at 72% 60%, rgba(244,114,182,0.24), transparent 24%),
          radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1), transparent 48%);
        box-shadow: inset 0 0 130px rgba(103,232,249,0.1), 0 0 90px rgba(139,92,246,0.08);
      }
      .urai-life-map-lines {
        position: absolute;
        inset: 14% 12%;
        z-index: 3;
        opacity: 0.52;
        background:
          linear-gradient(28deg, transparent 0 23%, rgba(103,232,249,0.48) 23.2% 23.6%, transparent 23.8% 100%),
          linear-gradient(142deg, transparent 0 36%, rgba(167,139,250,0.44) 36.2% 36.5%, transparent 36.7% 100%),
          linear-gradient(86deg, transparent 0 52%, rgba(103,232,249,0.38) 52.2% 52.5%, transparent 52.7% 100%);
      }
      .urai-life-map-orbit {
        position: absolute;
        z-index: 3;
        border: 1px solid rgba(103,232,249,0.2);
        border-radius: 999px;
        transform: rotate(-12deg);
      }
      .urai-life-map-orbit--one { left: 18%; top: 18%; right: 18%; bottom: 18%; }
      .urai-life-map-orbit--two { left: 30%; top: 9%; right: 30%; bottom: 9%; transform: rotate(22deg); border-color: rgba(167,139,250,0.2); }
      .urai-life-map-orbit--three { left: 12%; top: 29%; right: 12%; bottom: 29%; transform: rotate(4deg); border-color: rgba(103,232,249,0.16); }
      .urai-life-map-star-button {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 48px;
        height: 48px;
        border: 0;
        border-radius: 999px;
        background: transparent;
        pointer-events: auto !important;
        cursor: pointer;
        z-index: 40;
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
        box-shadow: 0 0 22px rgba(103,232,249,0.98), 0 0 56px rgba(139,92,246,0.62);
        animation: uraiStarPulse 2.4s ease-in-out infinite;
      }
      .urai-life-map-star-button[data-tone='violet']::before { box-shadow: 0 0 24px rgba(167,139,250,0.98), 0 0 62px rgba(103,232,249,0.38); }
      .urai-life-map-star-button[data-tone='pink']::before { box-shadow: 0 0 24px rgba(244,114,182,0.9), 0 0 62px rgba(103,232,249,0.38); }
      .urai-life-map-star-button span {
        position: absolute;
        left: 32px;
        top: 8px;
        padding: 5px 9px;
        border-radius: 999px;
        background: rgba(3,7,18,0.66);
        border: 1px solid rgba(142,220,255,0.28);
        color: rgba(235,244,255,0.9);
        font-size: 0.64rem;
        white-space: nowrap;
        backdrop-filter: blur(10px);
      }
      .urai-life-map-star-button:hover::before,
      .urai-life-map-star-button:focus-visible::before {
        width: calc(var(--star-size) + 9px);
        height: calc(var(--star-size) + 9px);
        box-shadow: 0 0 32px rgba(255,255,255,0.96), 0 0 82px rgba(103,232,249,0.76);
      }
      .urai-life-map-star-button:focus-visible { outline: 2px solid rgba(125,211,252,0.92); outline-offset: 2px; }

      .urai-visual-overlay--focus {
        background:
          radial-gradient(circle at 50% 52%, rgba(200,215,255,0.24), transparent 22%),
          radial-gradient(circle at 50% 52%, rgba(139,92,246,0.2), transparent 42%),
          linear-gradient(180deg, #07122c 0%, #030817 100%);
      }
      .urai-focus-ripple {
        position: absolute;
        left: 50%;
        top: 52%;
        width: min(56vw, 620px);
        aspect-ratio: 1;
        transform: translate(-50%, -50%);
        border: 1px solid rgba(103,232,249,0.18);
        border-radius: 999px;
        box-shadow: inset 0 0 70px rgba(139,92,246,0.14), 0 0 90px rgba(103,232,249,0.12);
      }
      .urai-focus-ripple--two { width: min(38vw, 420px); border-color: rgba(167,139,250,0.22); }
      .urai-focus-ripple--three { width: min(20vw, 230px); border-color: rgba(255,255,255,0.18); }
      .urai-focus-orb { top: 52%; width: clamp(190px, 17vw, 270px); }
      .urai-focus-orb__core { inset: 28%; }
      .urai-focus-memory-card {
        position: absolute;
        z-index: 4;
        right: 24px;
        bottom: 170px;
        width: min(320px, calc(100vw - 48px));
        padding: 16px 18px;
        border-radius: 22px;
        border: 1px solid rgba(142,220,255,0.28);
        background: rgba(3,7,18,0.6);
        backdrop-filter: blur(18px);
        box-shadow: 0 22px 82px rgba(0,0,0,0.32);
      }
      .urai-focus-memory-card strong {
        display: block;
        color: #e0f7ff;
        font-size: 0.72rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }
      .urai-focus-memory-card h2 {
        margin: 8px 0 6px;
        font-size: 1.25rem;
      }
      .urai-focus-memory-card p {
        margin: 0;
        color: rgba(235,244,255,0.74);
        font-size: 0.82rem;
        line-height: 1.45;
      }

      @keyframes uraiOrbBreath { 0%,100%{transform:scale(.96);opacity:.9} 50%{transform:scale(1.08);opacity:1} }
      @keyframes uraiAscentRing { 0%,100%{transform:scale(.96);opacity:.55} 50%{transform:scale(1.08);opacity:1} }
      @keyframes uraiStarPulse { 0%,100%{transform:translate(-50%,-50%) scale(.92);opacity:.84} 50%{transform:translate(-50%,-50%) scale(1.35);opacity:1} }
      @keyframes uraiCloudFloat { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(1.8vw,-1vh,0)} }
      @keyframes uraiRiftRise { 0%,100%{opacity:.7; transform:translateX(-50%) skewX(-8deg) scaleY(.96)} 50%{opacity:1; transform:translateX(-50%) skewX(-8deg) scaleY(1.04)} }

      @media (prefers-reduced-motion: reduce) {
        .urai-home-cloud,
        .urai-home-orb__halo,
        .urai-focus-orb__halo,
        .urai-ascent-rift,
        .urai-ascent-tunnel span,
        .urai-life-map-star-button::before { animation: none !important; }
      }
      @media (max-width: 640px) {
        .urai-scene-status { display: none; }
        .urai-life-map-star-button span { display: none; }
        .urai-visual-caption { left: 14px; bottom: 74px; }
        .urai-visual-caption--right { left: 14px; right: auto; }
        .urai-focus-memory-card { left: 14px; right: 14px; bottom: 146px; width: auto; }
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
    <div className="urai-visual-overlay urai-visual-overlay--life-map" data-visual-layer="life-map" data-testid="urai-lifemap-scene">
      <SceneOverlayStyles />
      <div className="urai-life-map-nebula" data-testid="lifemap-starfield" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--one" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--two" aria-hidden="true" />
      <div className="urai-life-map-orbit urai-life-map-orbit--three" aria-hidden="true" />
      <div className="urai-life-map-lines" aria-hidden="true" />
      {lifeMapStars.map((star, index) => (
        <button
          key={star.manifestId}
          type="button"
          className="urai-life-map-star-button"
          data-tone={star.tone}
          data-testid={`lifemap-node-${star.manifestId}`}
          style={{ left: star.left, top: star.top, ['--star-size' as string]: star.size, animationDelay: `${index * 0.18}s` }}
          aria-label={`Open ${star.label}`}
          onClick={() => router.push(`/focus?manifestId=${encodeURIComponent(star.manifestId)}`)}
        >
          <span>{star.label}</span>
        </button>
      ))}
      <div className="urai-visual-caption urai-visual-caption--right" aria-hidden="true">
        <strong>Life Map</strong>
        <span>Tap a star to open Focus</span>
      </div>
      <SceneStatus label="Map online" detail="Visible stars now open Focus" />
    </div>
  )
}

function HomeOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--home" aria-hidden="true" data-visual-layer="home" data-testid="urai-home-scene">
      <SceneOverlayStyles />
      <div className="urai-home-sky-band" />
      <div className="urai-home-horizon" />
      <div className="urai-home-cloud urai-home-cloud--one" />
      <div className="urai-home-cloud urai-home-cloud--two" />
      <div className="urai-home-cloud urai-home-cloud--three" />
      <div className="urai-home-ground" />
      <div className="urai-home-ground-glow" />
      <div className="urai-home-orb" data-testid="urai-orb-button">
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
    <div className="urai-visual-overlay urai-visual-overlay--ascent" aria-hidden="true" data-visual-layer="ascent" data-testid="urai-ascent-scene">
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

function FocusOverlay({ replay = false }: { replay?: boolean }) {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--focus" data-visual-layer={replay ? 'replay' : 'focus'} data-testid="urai-focus-scene">
      <SceneOverlayStyles />
      <div className="urai-focus-ripple" aria-hidden="true" />
      <div className="urai-focus-ripple urai-focus-ripple--two" aria-hidden="true" />
      <div className="urai-focus-ripple urai-focus-ripple--three" aria-hidden="true" />
      <div className="urai-focus-orb">
        <div className="urai-focus-orb__halo" />
        <div className="urai-focus-orb__ring" />
        <div className="urai-focus-orb__core" />
      </div>
      <div className="urai-focus-memory-card" aria-hidden="true">
        <strong>{replay ? 'Replay Stream' : 'Memory Star'}</strong>
        <h2>{replay ? 'Atmosphere in motion' : 'Opened gently'}</h2>
        <p>{replay ? 'Tone, recovery, and pattern layers animate without leaving the memory context.' : 'A selected star stays readable here even when private data or Firebase manifests are still syncing.'}</p>
      </div>
      <SceneStatus label={replay ? 'Replay ready' : 'Focus ready'} detail={replay ? 'ESC unwinds to focus' : 'Replay can begin from this star'} />
    </div>
  )
}

export default function SpatialVisualOverlay({ mode }: { mode: SceneMode }) {
  if (mode === 'home') return <HomeOverlay />
  if (mode === 'ascent') return <AscentOverlay />
  if (mode === 'life-map' || mode === 'demo') return <LifeMapOverlay />
  if (mode === 'focus') return <FocusOverlay />
  if (mode === 'replay') return <FocusOverlay replay />
  return null
}
