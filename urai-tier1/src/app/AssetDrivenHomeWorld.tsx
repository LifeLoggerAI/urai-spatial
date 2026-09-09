'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProductionV223 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV223'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

const HOME_SPAWN = { x: 0, z: 4.6 } as const
const HOME_ORB = { x: -0.45, z: -7.45 } as const
const HOME_GROUND = { x: -4.85, z: -8.25 } as const
const HOME_LIFE_MAP = { x: 4.85, z: -8.25 } as const
const LEGACY_V126_FINAL_ART_MARKER = ['data-home-final-art-revision', 'v126-retained-pixels-pending'] as const
const LEGACY_V176_AUTHORITY_MARKER = 'v176-recollection-sanctuary'
const V223_RUNTIME_ASSETS = [
  'home-continuous-landscape-v191.glb',
  'home-ground-place-v191.glb',
  'home-life-map-place-v191.glb',
  'urai-living-memory-heart-v191.glb',
  'rock-tile-floor-diff-1k.webp',
  'rock-tile-floor-normal-gl-1k.webp',
  'rock-tile-floor-arm-1k.webp',
].join(' ')
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
      world.setAttribute('data-home-v221-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v221-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v222-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v222-certification', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v223-art-layer', 'continuous-stratified-weathered-terrain-integrated-destinations-open-cleft-living-memory-presence')
      world.setAttribute('data-home-v223-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-v126-final-art-contract', LEGACY_V126_FINAL_ART_MARKER.join(':'))
      world.setAttribute('data-home-visual-repair', 'v223-authored-glb-remount-after-literal-fb23650-rejection')
      world.setAttribute('data-home-physical-base', 'continuous-stratified-weathered-terrain-integrated-destinations')
      world.setAttribute('data-home-visual-grade', 'v223-literal-pixel-candidate-not-certified')
      world.setAttribute('data-home-final-art-revision', 'v223-retained-pixels-pending')
      world.setAttribute('data-home-live-art-revision', 'v223-authored-inhabited-memory-sanctuary')
      world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-scanned-composition', 'v223-continuous-stratified-weathered-terrain-integrated-destinations')
      world.setAttribute('data-home-runtime-assets', V223_RUNTIME_ASSETS)
      world.setAttribute('data-home-governed-identity-assets', 'authored-v191-runtime-mounted-v223')
      world.setAttribute('data-home-visible-production-assets', 'v223-authored-continuous-landscape v223-authored-ground-place v223-authored-life-map-place v223-authored-folded-living-memory-presence')
      world.setAttribute('data-home-animation-owner', 'v223-open-cleft-living-memory-presence')
      synchronizeCanonicalHomeTelemetry(world)
      if (reviewOrbState !== appliedReviewOrbState) {
        appliedReviewOrbState = reviewOrbState
        publishOrbState(reviewOrbState ?? 'idle', 'system')
      }
    }
    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, { attributes: true, attributeFilter: ['data-home-player-x', 'data-home-player-z'], childList: true, subtree: true })
    window.addEventListener('popstate', hardenHomeOwnership)
    return () => { observer.disconnect(); window.removeEventListener('popstate', hardenHomeOwnership) }
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
      data-home-v221-retained-pixel-rebuild="superseded"
      data-home-v222-retained-pixel-rebuild="superseded"
      data-home-v223-retained-pixel-rebuild="active"
      data-home-canvas-owner="home-world-production-v223-single-authority"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
