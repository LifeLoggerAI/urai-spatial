'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProduction } from '@/spatial/layout/HomeWorldProduction'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

const HOME_SPAWN = { x: 2.35, z: 7.9 } as const
const HOME_ORB = { x: 0, z: -2.65 } as const
const HOME_GROUND = { x: -5.2, z: -8.4 } as const
const HOME_LIFE_MAP = { x: 5.2, z: -8.4 } as const
const REVIEW_ORB_STATES = new Set<OrbState>([
  'dormant', 'idle', 'attention', 'listening', 'thinking', 'speaking',
  'guiding', 'reflecting', 'calming', 'privacy', 'warning', 'transition',
])

function synchronizeCanonicalHomeTelemetry(world: HTMLElement) {
  const playerX = Number.parseFloat(world.dataset.homePlayerX ?? '')
  const playerZ = Number.parseFloat(world.dataset.homePlayerZ ?? '')
  if (!Number.isFinite(playerX) || !Number.isFinite(playerZ)) return

  const distance = (target: { x: number; z: number }) => Math.hypot(playerX - target.x, playerZ - target.z).toFixed(3)
  world.dataset.homeDistance = distance(HOME_SPAWN)
  world.dataset.homeDistanceOrb = distance(HOME_ORB)
  world.dataset.homeDistanceGround = distance(HOME_GROUND)
  world.dataset.homeDistanceLifeMap = distance(HOME_LIFE_MAP)
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const ownerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return
    let appliedReviewOrbState: OrbState | null = null

    const hardenHomeOwnership = () => {
      owner.querySelectorAll('canvas').forEach((canvas) => {
        canvas.setAttribute('aria-hidden', 'true')
        canvas.setAttribute('role', 'presentation')
        canvas.setAttribute('tabindex', '-1')
      })

      const world = owner.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (!world) return
      const query = new URLSearchParams(window.location.search)
      const reviewMode = query.get('homeAssetReview') === '1'
      const privateFixture = query.get('homePrivateFixture') === '1'
      const requestedOrbState = query.get('homeOrbState')
      const reviewOrbState = reviewMode && privateFixture && requestedOrbState && REVIEW_ORB_STATES.has(requestedOrbState as OrbState)
        ? requestedOrbState as OrbState
        : null
      const assetsReady = world.dataset.homeAssetsReady === 'true'

      world.setAttribute('data-home-asset-mode', reviewMode ? 'disclosed-review-candidate' : 'ready')
      world.setAttribute('data-home-personalization-mode', privateFixture ? 'private-personalized' : 'standard')
      world.setAttribute('data-home-review-fixture', reviewMode && privateFixture ? 'safe-private' : 'none')
      world.setAttribute('data-home-animation-owner', 'canonical-sanctuary-plus-cc0-fern-plus-living-orb')
      world.setAttribute('data-home-input-owner', 'window-capture-movement')
      world.setAttribute('data-home-telemetry-owner', 'embodied-motion-kernel')
      world.setAttribute('data-home-pointer-lock', 'false')
      world.setAttribute('data-home-input-ready', 'true')
      world.setAttribute('data-home-interaction-ready', assetsReady ? 'true' : 'false')
      if (assetsReady) world.setAttribute('data-home-ready', 'true')
      synchronizeCanonicalHomeTelemetry(world)

      if (reviewOrbState !== appliedReviewOrbState) {
        appliedReviewOrbState = reviewOrbState
        publishOrbState(reviewOrbState ?? 'idle', 'system')
      }
    }

    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, {
      attributes: true,
      attributeFilter: ['data-home-player-x', 'data-home-player-z', 'data-home-assets-ready'],
      childList: true,
      subtree: true,
    })
    window.addEventListener('popstate', hardenHomeOwnership)
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', hardenHomeOwnership)
    }
  }, [])

  return (
    <div
      ref={ownerRef}
      data-home-authored-region-contract="true"
      data-home-visible-world="moonlit-sacred-tech-sanctuary"
      data-home-route-owner="asset-driven-sacred-home"
      data-home-spatial-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal"
      data-home-forge-scenery="suppressed"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
