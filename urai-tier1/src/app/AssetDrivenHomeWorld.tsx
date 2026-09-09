'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProductionV221 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV221'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

const HOME_SPAWN = { x: 0, z: 4.6 } as const
const HOME_ORB = { x: -0.5, z: -7.6 } as const
const HOME_GROUND = { x: -4.85, z: -8.25 } as const
const HOME_LIFE_MAP = { x: 4.85, z: -8.25 } as const
const LEGACY_V126_FINAL_ART_MARKER = ['data-home-final-art-revision', 'v126-retained-pixels-pending'] as const
const LEGACY_V176_AUTHORITY_MARKER = 'v176-recollection-sanctuary'
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

      world.setAttribute('data-home-asset-mode', reviewMode ? 'disclosed-review-candidate' : 'ready')
      world.setAttribute('data-home-personalization-mode', privateFixture ? 'private-personalized' : 'standard')
      world.setAttribute('data-home-review-fixture', reviewMode && privateFixture ? 'safe-private' : 'none')
      world.setAttribute('data-home-v76-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v76-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v125-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v125-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v126-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v126-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v176-art-layer', LEGACY_V176_AUTHORITY_MARKER)
      world.setAttribute('data-home-v176-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v219-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v219-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v220-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v220-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v221-art-layer', 'low-terraced-geology-rooted-destinations-connected-folded-memory-mantle')
      world.setAttribute('data-home-v221-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-v126-final-art-contract', LEGACY_V126_FINAL_ART_MARKER.join(':'))
      world.setAttribute('data-home-visual-repair', 'v221-source-rebuild-after-literal-v220-rejection')
      world.setAttribute('data-home-physical-base', 'continuous-eroded-geology-layered-strata-traversal')
      world.setAttribute('data-home-visual-grade', 'v221-literal-pixel-candidate-not-certified')
      world.setAttribute('data-home-final-art-revision', 'v221-retained-pixels-pending')
      world.setAttribute('data-home-live-art-revision', 'v221-authored-inhabited-memory-sanctuary')
      world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-scanned-composition', 'v221-low-terraced-geology-rooted-destinations')
      world.setAttribute('data-home-visible-production-assets', 'v221-continuous-geology v221-ground-place v221-life-map-place v221-connected-folded-memory-mantle')
      world.setAttribute('data-home-animation-owner', 'v221-connected-folded-memory-mantle')
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
      attributeFilter: ['data-home-player-x', 'data-home-player-z'],
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
      data-home-v76-retained-pixel-rebuild="superseded"
      data-home-v125-retained-pixel-rebuild="superseded"
      data-home-v126-retained-pixel-rebuild="superseded"
      data-home-v176-retained-pixel-rebuild="superseded"
      data-home-v219-retained-pixel-rebuild="superseded"
      data-home-v220-retained-pixel-rebuild="superseded"
      data-home-v221-retained-pixel-rebuild="active"
      data-home-canvas-owner="home-world-production-v221-single-authority"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
