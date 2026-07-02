'use client'

import { usePathname } from 'next/navigation'

type SceneAssetRoute = {
  id: string
  tier: 'tier1' | 'tier2' | 'tier3'
  canon: string
  asset: string
  blend: 'normal' | 'screen' | 'soft-light'
  opacity: number
  match: (pathname: string) => boolean
}

const sceneAssets: SceneAssetRoute[] = [
  {
    id: 'home',
    tier: 'tier1',
    canon: 'Home Threshold',
    asset: '/assets/urai/final/tier1/home/home-threshold-desktop.svg',
    blend: 'soft-light',
    opacity: 0.16,
    match: (pathname) => pathname === '/' || pathname === '/home',
  },
  {
    id: 'ground',
    tier: 'tier1',
    canon: 'Ground Realm',
    asset: '/assets/urai/final/tier1/ground/ground-realm-desktop.svg',
    blend: 'soft-light',
    opacity: 0.18,
    match: (pathname) => pathname.startsWith('/ground'),
  },
  {
    id: 'life-map',
    tier: 'tier2',
    canon: 'Life Map',
    asset: '/assets/urai/final/tier2/life-map/lifemap-galaxy-field-desktop.svg',
    blend: 'screen',
    opacity: 0.2,
    match: (pathname) => pathname.startsWith('/life-map') || pathname.startsWith('/spatial/life-map'),
  },
  {
    id: 'focus',
    tier: 'tier2',
    canon: 'Focus Chamber',
    asset: '/assets/urai/final/tier2/focus/focus-memory-chamber-desktop.svg',
    blend: 'screen',
    opacity: 0.17,
    match: (pathname) => pathname.startsWith('/focus'),
  },
  {
    id: 'replay',
    tier: 'tier2',
    canon: 'Replay Realm',
    asset: '/assets/urai/final/tier2/replay/replay-cinematic-stage-desktop.svg',
    blend: 'screen',
    opacity: 0.18,
    match: (pathname) => pathname.startsWith('/replay') || pathname.includes('/replay'),
  },
  {
    id: 'mirror',
    tier: 'tier2',
    canon: 'Mirror Realm',
    asset: '/assets/urai/final/tier2/mirror/mirror-reflection-realm-desktop.svg',
    blend: 'screen',
    opacity: 0.16,
    match: (pathname) => pathname.startsWith('/mirror'),
  },
  {
    id: 'passport',
    tier: 'tier2',
    canon: 'Passport Vault',
    asset: '/assets/urai/final/tier2/passport/passport-vault-desktop.svg',
    blend: 'soft-light',
    opacity: 0.18,
    match: (pathname) => pathname.startsWith('/passport'),
  },
  {
    id: 'status',
    tier: 'tier2',
    canon: 'Status Realm',
    asset: '/assets/urai/final/tier2/status/status-system-pulse-desktop.svg',
    blend: 'screen',
    opacity: 0.14,
    match: (pathname) => pathname.startsWith('/status'),
  },
  {
    id: 'privacy-controls',
    tier: 'tier2',
    canon: 'Privacy Controls',
    asset: '/assets/urai/final/tier2/privacy-controls/privacy-controls-desktop.svg',
    blend: 'soft-light',
    opacity: 0.16,
    match: (pathname) => pathname.startsWith('/privacy-controls') || pathname.startsWith('/privacy'),
  },
  {
    id: 'location-map',
    tier: 'tier2',
    canon: 'Location Map',
    asset: '/assets/urai/final/tier2/location-map/location-map-desktop.svg',
    blend: 'screen',
    opacity: 0.16,
    match: (pathname) => pathname.startsWith('/location-map'),
  },
  {
    id: 'xr',
    tier: 'tier3',
    canon: 'XR Preview',
    asset: '/assets/urai/final/tier3/xr/xr-preview-desktop.svg',
    blend: 'screen',
    opacity: 0.14,
    match: (pathname) => pathname.startsWith('/spatial/ar-vr') || pathname.startsWith('/spatial'),
  },
  {
    id: 'demo',
    tier: 'tier3',
    canon: 'Demo Film',
    asset: '/assets/urai/final/tier3/demo/demo-replay-film-poster.svg',
    blend: 'soft-light',
    opacity: 0.16,
    match: (pathname) => pathname.startsWith('/demo'),
  },
]

const fallbackScene: SceneAssetRoute = {
  id: 'shared-orb',
  tier: 'tier1',
  canon: 'URAI Shared Orb',
  asset: '/assets/urai/final/shared/orb/orb-idle.svg',
  blend: 'screen',
  opacity: 0.12,
  match: () => true,
}

function resolveSceneAsset(pathname: string) {
  return sceneAssets.find((route) => route.match(pathname)) ?? fallbackScene
}

export default function UraiFinalAssetSpineSceneLayer() {
  const pathname = usePathname() ?? '/'
  const route = resolveSceneAsset(pathname)

  return (
    <div
      aria-hidden="true"
      className="urai-final-asset-spine-scene-layer"
      data-testid="urai-final-asset-spine-scene-layer"
      data-urai-final-scene-layer="visible-route-asset"
      data-urai-final-scene-route={route.id}
      data-urai-final-scene-tier={route.tier}
      data-urai-final-scene-canon={route.canon}
      data-urai-final-scene-asset={route.asset}
    >
      <div
        className="urai-final-asset-spine-scene-layer__image"
        style={{
          backgroundImage: `url("${route.asset}")`,
          mixBlendMode: route.blend,
          opacity: route.opacity,
        }}
      />
      <div className="urai-final-asset-spine-scene-layer__depth" />
      <div className="urai-final-asset-spine-scene-layer__vignette" />
    </div>
  )
}
