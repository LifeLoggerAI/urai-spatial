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
    label: 'Ground World bespoke final',
    primary: '/assets/urai/bespoke/ground/ground-world-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/ground/ground-world-bespoke-final-mobile.svg',
  },
  lifeMap: {
    surface: 'life-map',
    label: 'Life Map galaxy bespoke final',
    primary: '/assets/urai/bespoke/life-map/life-map-galaxy-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/life-map/life-map-galaxy-bespoke-final-mobile.svg',
  },
  focus: {
    surface: 'focus',
    label: 'Focus chamber bespoke final',
    primary: '/assets/urai/bespoke/focus/focus-memory-chamber-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/focus/focus-memory-chamber-bespoke-final-mobile.svg',
  },
  replay: {
    surface: 'replay',
    label: 'Replay film bespoke final',
    primary: '/assets/urai/bespoke/replay/replay-memory-film-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/replay/replay-memory-film-bespoke-final-mobile.svg',
  },
  mirror: {
    surface: 'mirror',
    label: 'Mirror realm bespoke final',
    primary: '/assets/urai/bespoke/mirror/mirror-reflection-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/mirror/mirror-reflection-bespoke-final-mobile.svg',
  },
  passport: {
    surface: 'passport',
    label: 'Passport vault bespoke final',
    primary: '/assets/urai/bespoke/passport/passport-vault-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/passport/passport-vault-bespoke-final-mobile.svg',
  },
  xr: {
    surface: 'spatial-ar-vr',
    label: 'XR entry chamber bespoke final',
    primary: '/assets/urai/bespoke/xr/xr-entry-chamber-bespoke-final.svg',
    mobile: '/assets/urai/bespoke/xr/xr-entry-chamber-bespoke-final-mobile.svg',
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

  if (path.startsWith('/spatial/ar-vr')) return routeArt.xr
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
