'use client'

import { usePathname } from 'next/navigation'
import type { CSSProperties } from 'react'

type CinematicRouteArt = {
  readonly surface: string
  readonly label: string
  readonly primary: string
  readonly mobile: string
}

const routeArt = {
  home: {
    surface: 'home',
    label: 'Home threshold bespoke final',
    primary: '/assets/urai/bespoke/home/home-threshold-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/home/home-threshold-bespoke-final-mobile.svg',
  },
  ground: {
    surface: 'ground',
    label: 'Ground World',
    primary: '/assets/urai/ground/ground-world-main.webp',
    mobile: '/assets/urai/ground/ground-world-mobile.webp',
  },
  lifeMap: {
    surface: 'life-map',
    label: 'Life Map galaxy',
    primary: '/assets/urai/life-map/life-map-galaxy-main.webp',
    mobile: '/assets/urai/life-map/life-map-galaxy-mobile.webp',
  },
  focus: {
    surface: 'focus',
    label: 'Focus chamber',
    primary: '/assets/urai/focus/focus-memory-chamber-main.webp',
    mobile: '/assets/urai/focus/focus-memory-chamber-mobile.webp',
  },
  replay: {
    surface: 'replay',
    label: 'Replay film',
    primary: '/assets/urai/replay/replay-memory-film-main.webp',
    mobile: '/assets/urai/replay/replay-memory-film-mobile.webp',
  },
  mirror: {
    surface: 'mirror',
    label: 'Mirror realm',
    primary: '/assets/urai/mirror/mirror-reflection-main.webp',
    mobile: '/assets/urai/mirror/mirror-reflection-mobile.webp',
  },
  passport: {
    surface: 'passport',
    label: 'Passport vault',
    primary: '/assets/urai/passport/passport-vault-main.webp',
    mobile: '/assets/urai/passport/passport-vault-mobile.webp',
  },
  privacy: {
    surface: 'privacy',
    label: 'Privacy controls',
    primary: '/assets/urai/privacy-controls/privacy-controls-main.webp',
    mobile: '/assets/urai/privacy-controls/privacy-controls-mobile.webp',
  },
  location: {
    surface: 'location-map',
    label: 'Emotional weather atlas',
    primary: '/assets/urai/location-map/location-emotional-weather-main.webp',
    mobile: '/assets/urai/location-map/location-emotional-weather-mobile.webp',
  },
  status: {
    surface: 'status',
    label: 'Status control room',
    primary: '/assets/urai/status/status-route-matrix-main.webp',
    mobile: '/assets/urai/status/status-route-matrix-mobile.webp',
  },
} as const satisfies Record<string, CinematicRouteArt>

function resolve(pathname: string | null): CinematicRouteArt {
  const path = pathname || '/'

  if (path === '/' || path === '/home' || path === '/spatial') return routeArt.home
  if (path.startsWith('/ground')) return routeArt.ground
  if (path.startsWith('/life-map') || path.startsWith('/spatial/life-map')) return routeArt.lifeMap
  if (path.startsWith('/focus')) return routeArt.focus
  if (path.startsWith('/replay') || path.includes('/replay')) return routeArt.replay
  if (path.startsWith('/mirror')) return routeArt.mirror
  if (path.startsWith('/passport')) return routeArt.passport
  if (path.startsWith('/privacy')) return routeArt.privacy
  if (path.startsWith('/location-map') || path.startsWith('/place')) return routeArt.location
  if (path.startsWith('/status')) return routeArt.status

  return routeArt.home
}

export default function UraiCinematicBackdrop() {
  const visual = resolve(usePathname())

  const style = {
    '--urai-cinematic-image': `url("${visual.primary}")`,
    '--urai-cinematic-mobile-image': `url("${visual.mobile}")`,
  } as CSSProperties

  return (
    <div
      className="urai-cinematic-backdrop"
      data-route={visual.surface}
      data-label={visual.label}
      style={style}
      aria-hidden="true"
    >
      <div className="urai-cinematic-backdrop__image" />
      <div className="urai-cinematic-backdrop__depth" />
      <div className="urai-cinematic-backdrop__atmosphere" />
      <div className="urai-cinematic-backdrop__grade" />
      <div className="urai-cinematic-backdrop__grain" />
    </div>
  )
}
