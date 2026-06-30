'use client'

import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'

const routeArt = {
  home: '/assets/urai/home/home-threshold-main.webp',
  ground: '/assets/urai/ground/ground-world-main.webp',
  lifeMap: '/assets/urai/life-map/life-map-galaxy-main.webp',
  focus: '/assets/urai/focus/focus-memory-chamber-main.webp',
  replay: '/assets/urai/replay/replay-memory-film-main.webp',
  mirror: '/assets/urai/mirror/mirror-reflection-main.webp',
  passport: '/assets/urai/passport/passport-vault-main.webp',
  privacy: '/assets/urai/privacy-controls/privacy-controls-main.webp',
  location: '/assets/urai/location-map/location-emotional-weather-main.webp',
  status: '/assets/urai/status/status-route-matrix-main.webp',
}

function resolve(pathname: string | null) {
  const path = pathname || '/'

  if (path === '/' || path === '/home' || path === '/spatial') {
    return ['home', routeArt.home] as const
  }

  if (path.startsWith('/ground')) return ['ground', routeArt.ground] as const
  if (path.startsWith('/life-map') || path.startsWith('/spatial/life-map')) return ['life-map', routeArt.lifeMap] as const
  if (path.startsWith('/focus')) return ['focus', routeArt.focus] as const
  if (path.startsWith('/replay') || path.includes('/replay')) return ['replay', routeArt.replay] as const
  if (path.startsWith('/mirror')) return ['mirror', routeArt.mirror] as const
  if (path.startsWith('/passport')) return ['passport', routeArt.passport] as const
  if (path.startsWith('/privacy')) return ['privacy', routeArt.privacy] as const
  if (path.startsWith('/location-map') || path.startsWith('/place')) return ['location-map', routeArt.location] as const
  if (path.startsWith('/status')) return ['status', routeArt.status] as const

  return ['home', routeArt.home] as const
}

export default function UraiCinematicBackdrop() {
  const [route, image] = resolve(usePathname())

  return (
    <div
      className="urai-cinematic-backdrop"
      data-route={route}
      style={{ '--urai-cinematic-image': `url("${image}")` } as CSSProperties}
      aria-hidden="true"
    >
      <div className="urai-cinematic-backdrop__image" />
      <div className="urai-cinematic-backdrop__depth" />
      <div className="urai-cinematic-backdrop__grade" />
    </div>
  )
}
