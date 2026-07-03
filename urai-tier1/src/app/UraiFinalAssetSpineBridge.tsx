'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import './v123-asset-wiring.css'

type FinalAssetRoute = {
  id: string
  match: (pathname: string) => boolean
  tier: 'tier1' | 'tier2' | 'tier3'
  canon: string
  asset: string
}

type AssetHandoffManifest = {
  ready?: number
  missing?: number
  assets?: unknown[]
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

const promotedManifestChecks = [
  {
    datasetKey: 'uraiV2Assets' as const,
    href: '/assets/urai/final/manifests/v2-asset-factory-spatial-handoff.json',
  },
  {
    datasetKey: 'uraiV3Assets' as const,
    href: '/assets/urai/final/manifests/v3-asset-factory-spatial-handoff.json',
  },
]

const fallbackAssetCss = `
html:not([data-urai-v2-assets='ready']) .groundFinal .helper i{background-image:linear-gradient(180deg,rgba(223,250,255,.8),rgba(86,180,220,.18))!important}
html:not([data-urai-v2-assets='ready']) .groundFinal .tableOne,html:not([data-urai-v2-assets='ready']) .groundFinal .tableTwo,html:not([data-urai-v2-assets='ready']) .groundFinal .vault,html:not([data-urai-v2-assets='ready']) .groundFinal .archiveCase{background-image:none!important}
html:not([data-urai-v2-assets='ready']) .lifeGalaxy .memoryNode .glow::before,html:not([data-urai-v2-assets='ready']) .lifeGalaxy .memoryNode:hover .glow::before,html:not([data-urai-v2-assets='ready']) .lifeGalaxy .memoryNode.active .glow::before{background-image:var(--node-art)!important}
html:not([data-urai-v2-assets='ready']) .memorySurface[data-route-polish='selected-memory-camera-chamber'] .memoryCard{background-image:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.58)),url('/assets/urai/focus/focus-memory-chamber-main.webp'),url('/assets/urai/focus/focus-memory-chamber-fallback.svg')!important}
html:not([data-urai-v2-assets='ready']) .memorySurface[data-route-polish='cinematic-memory-camera-film'] .memoryCard{background-image:linear-gradient(180deg,rgba(0,0,0,.03),rgba(0,0,0,.12) 54%,rgba(0,0,0,.72)),url('/assets/urai/replay/replay-memory-film-main.webp'),url('/assets/urai/replay/replay-memory-film-fallback.svg')!important}
html:not([data-urai-v3-assets='ready']) .urai-xr-portal{background-image:linear-gradient(180deg,rgba(0,2,9,.14),rgba(0,2,9,.78)),url('/assets/urai/xr/xr-entry-fallback.svg')!important}
html:not([data-urai-v3-assets='ready']) .urai-xr-portal[data-quest-proof='manual-device-required']::before{content:none!important;background-image:none!important}
html:not([data-urai-v3-assets='ready']) .urai-xr-portal__portal-door--life{background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.62))!important}
html:not([data-urai-v3-assets='ready']) .urai-xr-portal__portal-door--ground{background-image:linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,.62)),url('/assets/urai/ground/ground-world-main.webp')!important}
`

function resolveFinalAssetRoute(pathname: string) {
  return finalAssetRoutes.find((route) => route.match(pathname)) ?? fallbackRoute
}

function isCompleteManifest(manifest: AssetHandoffManifest) {
  const ready = Number(manifest.ready ?? 0)
  const missing = Number(manifest.missing ?? 0)
  return ready > 0 && missing === 0 && Array.isArray(manifest.assets) && manifest.assets.length >= ready
}

export default function UraiFinalAssetSpineBridge() {
  const pathname = usePathname() ?? '/'
  const route = resolveFinalAssetRoute(pathname)

  useEffect(() => {
    const root = document.documentElement
    const controller = new AbortController()

    for (const check of promotedManifestChecks) {
      root.dataset[check.datasetKey] = 'fallback'
      void fetch(check.href, { cache: 'no-store', signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`manifest ${response.status}`)
          return response.json() as Promise<AssetHandoffManifest>
        })
        .then((manifest) => {
          root.dataset[check.datasetKey] = isCompleteManifest(manifest) ? 'ready' : 'fallback'
        })
        .catch(() => {
          if (!controller.signal.aborted) root.dataset[check.datasetKey] = 'fallback'
        })
    }

    return () => controller.abort()
  }, [])

  return (
    <>
      <style data-urai-asset-readiness-guard>{fallbackAssetCss}</style>
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
    </>
  )
}
