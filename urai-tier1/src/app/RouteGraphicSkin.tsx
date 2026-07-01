'use client'

import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'

type RouteVisual = {
  key: string
  label: string
  image: string
}

const visuals: RouteVisual[] = [
  { key: 'home', label: 'Home threshold bespoke final', image: '/assets/urai/bespoke/home/home-threshold-bespoke-final.svg' },
  { key: 'ground', label: 'Ground world bespoke final', image: '/assets/urai/bespoke/ground/ground-world-bespoke-final.svg' },
  { key: 'life-map', label: 'Life Map galaxy bespoke final', image: '/assets/urai/bespoke/life-map/life-map-galaxy-bespoke-final.svg' },
  { key: 'focus', label: 'Focus memory chamber bespoke final', image: '/assets/urai/bespoke/focus/focus-memory-chamber-bespoke-final.svg' },
  { key: 'replay', label: 'Replay memory film bespoke final', image: '/assets/urai/bespoke/replay/replay-memory-film-bespoke-final.svg' },
  { key: 'mirror', label: 'Mirror reflection realm bespoke final', image: '/assets/urai/bespoke/mirror/mirror-reflection-bespoke-final.svg' },
  { key: 'passport', label: 'Passport vault bespoke final', image: '/assets/urai/bespoke/passport/passport-vault-bespoke-final.svg' },
  { key: 'privacy-controls', label: 'Privacy controls', image: '/assets/urai/privacy-controls/privacy-controls-main.webp' },
  { key: 'location-map', label: 'Location emotional weather', image: '/assets/urai/location-map/location-emotional-weather-main.webp' },
  { key: 'status', label: 'Status route matrix', image: '/assets/urai/status/status-route-matrix-main.webp' },
]

function resolveVisual(pathname: string | null): RouteVisual {
  const path = pathname || '/'

  if (path === '/' || path === '/home' || path === '/spatial') return visuals[0]
  if (path.startsWith('/ground')) return visuals[1]
  if (path.startsWith('/life-map') || path.startsWith('/spatial/life-map')) return visuals[2]
  if (path.startsWith('/focus')) return visuals[3]
  if (path.startsWith('/replay') || path.includes('/replay')) return visuals[4]
  if (path.startsWith('/mirror')) return visuals[5]
  if (path.startsWith('/passport')) return visuals[6]
  if (path.startsWith('/privacy-controls') || path.startsWith('/privacy')) return visuals[7]
  if (path.startsWith('/location-map') || path.startsWith('/place')) return visuals[8]
  if (path.startsWith('/status')) return visuals[9]

  return visuals[0]
}

export default function RouteGraphicSkin() {
  const visual = resolveVisual(usePathname())

  const style = {
    '--urai-route-art': `url("${visual.image}")`,
  } as CSSProperties

  return (
    <div className="urai-route-graphic-skin" data-route={visual.key} style={style} aria-hidden="true">
      <div className="urai-route-graphic-skin__wash" />
      <div className="urai-route-graphic-skin__poster" data-label={visual.label} />
    </div>
  )
}
