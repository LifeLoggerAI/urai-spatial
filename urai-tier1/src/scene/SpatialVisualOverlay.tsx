'use client'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

const lifeMapStars = [
  { left: '16%', top: '28%', size: '12px', label: 'Memory Bloom' },
  { left: '28%', top: '48%', size: '8px', label: 'Recovery Arc' },
  { left: '44%', top: '31%', size: '14px', label: 'Threshold' },
  { left: '59%', top: '54%', size: '10px', label: 'Mirror Focus' },
  { left: '72%', top: '24%', size: '11px', label: 'Ritual Echo' },
  { left: '82%', top: '64%', size: '8px', label: 'Dream Signal' },
  { left: '38%', top: '72%', size: '10px', label: 'Calm Return' },
]

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
  return (
    <div className="urai-visual-overlay urai-visual-overlay--life-map" aria-hidden="true" data-visual-layer="life-map">
      <div className="urai-life-map-nebula" />
      <div className="urai-life-map-orbit urai-life-map-orbit--one" />
      <div className="urai-life-map-orbit urai-life-map-orbit--two" />
      <div className="urai-life-map-lines" />
      {lifeMapStars.map((star, index) => (
        <div
          key={star.label}
          className="urai-life-map-star"
          style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: `${index * 0.18}s` }}
        >
          <span>{star.label}</span>
        </div>
      ))}
      <div className="urai-visual-caption urai-visual-caption--right">
        <strong>Life Map</strong>
        <span>Constellation layer active</span>
      </div>
      <SceneStatus label="Map online" detail="Stars are selectable memory anchors" />
    </div>
  )
}

function HomeOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--home" aria-hidden="true" data-visual-layer="home">
      <div className="urai-home-sky-band" />
      <div className="urai-home-stars" />
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
        <span>Passing from Home into Life Map</span>
      </div>
      <SceneStatus label="Ascent active" detail="Transitioning into constellation space" />
    </div>
  )
}

export default function SpatialVisualOverlay({ mode }: { mode: SceneMode }) {
  if (mode === 'home') return <HomeOverlay />
  if (mode === 'ascent') return <AscentOverlay />
  if (mode === 'life-map' || mode === 'demo') return <LifeMapOverlay />
  return null
}
