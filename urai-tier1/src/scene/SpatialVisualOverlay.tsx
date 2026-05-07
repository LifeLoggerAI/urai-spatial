'use client'

type SceneMode = 'home' | 'ascent' | 'life-map' | 'demo' | 'replay' | 'focus' | 'mirror'

const lifeMapStars = [
  { left: '16%', top: '28%', size: '10px', label: 'Memory Bloom' },
  { left: '28%', top: '48%', size: '7px', label: 'Recovery Arc' },
  { left: '44%', top: '31%', size: '12px', label: 'Threshold' },
  { left: '59%', top: '54%', size: '8px', label: 'Mirror Focus' },
  { left: '72%', top: '24%', size: '9px', label: 'Ritual Echo' },
  { left: '82%', top: '64%', size: '6px', label: 'Dream Signal' },
  { left: '38%', top: '72%', size: '8px', label: 'Calm Return' },
]

function LifeMapOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--life-map" aria-hidden="true">
      <div className="urai-life-map-nebula" />
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
        <span>Constellation view active</span>
      </div>
    </div>
  )
}

function HomeOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--home" aria-hidden="true">
      <div className="urai-home-sky-band" />
      <div className="urai-home-cloud urai-home-cloud--one" />
      <div className="urai-home-cloud urai-home-cloud--two" />
      <div className="urai-home-ground" />
      <div className="urai-home-ground-glow" />
      <div className="urai-home-orb">
        <div className="urai-home-orb__halo" />
        <div className="urai-home-orb__core" />
      </div>
      <div className="urai-visual-caption">
        <strong>Home</strong>
        <span>Sky, ground, and orb ready</span>
      </div>
    </div>
  )
}

function AscentOverlay() {
  return (
    <div className="urai-visual-overlay urai-visual-overlay--ascent" aria-hidden="true">
      <div className="urai-ascent-tunnel">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="urai-ascent-stream urai-ascent-stream--one" />
      <div className="urai-ascent-stream urai-ascent-stream--two" />
      <div className="urai-ascent-portal-core" />
      <div className="urai-visual-caption urai-visual-caption--right">
        <strong>Ascent</strong>
        <span>Passing from Home into Life Map</span>
      </div>
    </div>
  )
}

export default function SpatialVisualOverlay({ mode }: { mode: SceneMode }) {
  if (mode === 'home') return <HomeOverlay />
  if (mode === 'ascent') return <AscentOverlay />
  if (mode === 'life-map' || mode === 'demo') return <LifeMapOverlay />
  return null
}
