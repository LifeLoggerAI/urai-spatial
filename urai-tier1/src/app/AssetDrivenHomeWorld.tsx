'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProduction } from '@/spatial/layout/HomeWorldProduction'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

const HOME_SPAWN = { x: 0, z: 4.6 } as const
const HOME_ORB = { x: -0.18, z: -6.9 } as const
const HOME_GROUND = { x: -4.85, z: -8.25 } as const
const HOME_LIFE_MAP = { x: 4.85, z: -8.25 } as const
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
      world.setAttribute('data-home-v76-art-layer', 'single-canvas-deep-apse-relic-machine-sanctuary')
      world.setAttribute('data-home-v76-certification', 'retained-pixel-candidate-not-certified')
      world.setAttribute('data-home-v125-art-layer', 'single-canvas-sculpted-canyon-natural-fissures-prismatic-orb')
      world.setAttribute('data-home-v125-certification', 'retained-pixel-candidate-not-certified')
      world.setAttribute('data-home-v126-art-layer', 'single-canvas-ground-owned-sanctuary-framed-fissures-integrated-orb-apse')
      world.setAttribute('data-home-v126-certification', 'retained-pixel-candidate-not-certified')
      world.setAttribute('data-home-visual-repair', 'v126-bounded-geology-continuous-ground-framed-fissures-integrated-orb')
      world.setAttribute('data-home-physical-base', 'continuous-sculpted-ground-staggered-terraces-layered-apse')
      world.setAttribute('data-home-visual-grade', 'cinematic-pbr-v126-ground-owned-depth-candidate')
      world.setAttribute('data-home-final-art-revision', 'v126-retained-pixels-pending')
      world.setAttribute('data-home-live-art-revision', 'v126-ground-owned-open-sanctuary')
      world.setAttribute('data-home-art-certification', 'v126-retained-pixels-pending-not-certified')
      world.setAttribute('data-home-scanned-composition', 'v126-bounded-lower-edge-geology')
      world.setAttribute('data-home-visible-production-assets', 'rock_face_01 rock_face_02 sculpted-ground staggered-terraces framed-fissures governed-orb-petal-heart layered-apse')
      world.setAttribute('data-home-animation-owner', 'v126-ground-owned-apse-sanctuary')
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
      data-home-v76-retained-pixel-rebuild="active"
      data-home-v125-retained-pixel-rebuild="active"
      data-home-v126-retained-pixel-rebuild="active"
      data-home-canvas-owner="home-world-production-v70-single-authority"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
