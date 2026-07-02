'use client'

import { usePathname } from 'next/navigation'

type FinalAssetRoute = {
  id: string
  match: (pathname: string) => boolean
  tier: 'tier1' | 'tier2' | 'tier3'
  canon: string
  asset: string
}

const finalAssetRoutes: FinalAssetRoute[] = [
  {
    id: 'home',
    tier: 'tier1',
    canon: 'Home Threshold',
    match: (pathname) => pathname === '/' || pathname === '/home',
    asset: '/assets/urai/final/tier1/home/home-threshold-desktop.svg',
  },
  {
    id: 'ground',
    tier: 'tier1',
    canon: 'Ground Realm',
    match: (pathname) => pathname.startsWith('/ground'),
    asset: '/assets/urai/final/tier1/ground/ground-realm-desktop.svg',
  },
  {
    id: 'life-map',
    tier: 'tier2',
    canon: 'Life Map',
    match: (pathname) => pathname.startsWith('/life-map') || pathname.startsWith('/spatial/life-map'),
    asset: '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg',
  },
  {
    id: 'focus',
    tier: 'tier2',
    canon: 'Focus Chamber',
    match: (pathname) => pathname.startsWith('/focus'),
    asset: '/assets/urai/final/tier2/focus/focus-memory-chamber-desktop.svg',
  },
  {
    id: 'replay',
    tier: 'tier2',
    canon: 'Replay Realm',
    match: (pathname) => pathname.startsWith('/replay') || pathname.includes('/replay'),
    asset: '/assets/urai/final/tier2/replay/replay-cinematic-stage-desktop.svg',
  },
  {
    id: 'mirror',
    tier: 'tier2',
    canon: 'Mirror Realm',
    match: (pathname) => pathname.startsWith('/mirror'),
    asset: '/assets/urai/final/tier2/mirror/mirror-reflection-realm-desktop.svg',
  },
  {
    id: 'passport',
    tier: 'tier2',
    canon: 'Passport Vault',
    match: (pathname) => pathname.startsWith('/passport'),
    asset: '/assets/urai/final/tier2/passport/passport-vault-desktop.svg',
  },
  {
    id: 'status',
    tier: 'tier2',
    canon: 'Status Realm',
    match: (pathname) => pathname.startsWith('/status'),
    asset: '/assets/urai/final/tier2/status/status-system-pulse-desktop.svg',
  },
  {
    id: 'privacy-controls',
    tier: 'tier2',
    canon: 'Privacy Controls',
    match: (pathname) => pathname.startsWith('/privacy-controls') || pathname.startsWith('/privacy'),
    asset: '/assets/urai/final/tier2/privacy-controls/privacy-controls-desktop.svg',
  },
  {
    id: 'location-map',
    tier: 'tier2',
    canon: 'Location Map',
    match: (pathname) => pathname.startsWith('/location-map'),
    asset: '/assets/urai/final/tier2/location-map/location-map-desktop.svg',
  },
  {
    id: 'xr',
    tier: 'tier3',
    canon: 'XR Preview',
    match: (pathname) => pathname.startsWith('/spatial/ar-vr') || pathname.startsWith('/spatial'),
    asset: '/assets/urai/final/tier3/xr/xr-preview-desktop.svg',
  },
  {
    id: 'demo',
    tier: 'tier3',
    canon: 'Demo Film',
    match: (pathname) => pathname.startsWith('/demo'),
    asset: '/assets/urai/final/tier3/demo/demo-replay-film-poster.svg',
  },
]

const fallbackRoute: FinalAssetRoute = {
  id: 'shared-orb',
  tier: 'tier1',
  canon: 'URAI Shared Orb',
  match: () => true,
  asset: '/assets/urai/final/shared/orb/orb-idle.svg',
}

function resolveFinalAssetRoute(pathname: string) {
  return finalAssetRoutes.find((route) => route.match(pathname)) ?? fallbackRoute
}

export default function UraiFinalAssetSpineBridge() {
  const pathname = usePathname() ?? '/'
  const route = resolveFinalAssetRoute(pathname)

  return (
    <aside
      aria-hidden="true"
      data-testid="urai-final-asset-spine-bridge"
      data-urai-final-asset-spine="runtime-consumed"
      data-urai-final-asset-route={route.id}
      data-urai-final-asset-tier={route.tier}
      data-urai-final-asset-canon={route.canon}
      data-urai-final-asset-src={route.asset}
      style={{
        position: 'fixed',
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        inset: 'auto 0 0 auto',
        zIndex: -1,
      }}
    >
      <img
        src={route.asset}
        alt=""
        width={1}
        height={1}
        loading="eager"
        decoding="async"
        data-testid="urai-final-asset-spine-route-image"
      />
      <span data-testid="urai-final-asset-spine-manifest">
        /assets/urai/final/manifests/urai-final-assets.json
      </span>
    </aside>
  )
}
