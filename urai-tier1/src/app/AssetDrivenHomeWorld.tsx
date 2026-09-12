'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProductionV223 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV223'
import currentHomeVisualAuthority from './currentHomeVisualAuthority.json'

type Props = { onOrbOpen: () => void; webglAvailable: true }
type PortalDestination = 'ground' | 'life-map'
const HOME_SPAWN = { x: 0, z: 4.6 } as const
const HOME_ORB = { x: -.45, z: -7.45 } as const
const HOME_GROUND = { x: -4.85, z: -8.25 } as const
const HOME_LIFE_MAP = { x: 4.85, z: -8.25 } as const
const LEGACY_V126_FINAL_ART_MARKER = ['data-home-final-art-revision', 'v126-retained-pixels-pending'] as const
const LEGACY_V176_AUTHORITY_MARKER = 'v176-recollection-sanctuary'
const V226_RUNTIME_ASSETS = currentHomeVisualAuthority.runtimeAssets.join(' ')
const REVIEW_ORB_STATES = new Set<OrbState>(['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition'])

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
    let lifecycleDestination: PortalDestination | null = null
    let lifecycleTimers: number[] = []

    const clearLifecycleTimers = () => {
      lifecycleTimers.forEach((timer) => window.clearTimeout(timer))
      lifecycleTimers = []
    }

    const stagePortalLifecycle = (world: HTMLElement) => {
      const sequence = world.dataset.homePortalSequence ?? 'idle'
      if (sequence === 'idle') {
        if (lifecycleDestination) clearLifecycleTimers()
        lifecycleDestination = null
        return
      }
      const match = /^(ground|life-map):traversal$/.exec(sequence)
      if (!match) return
      const destination = match[1] as PortalDestination
      if (lifecycleDestination === destination) return
      lifecycleDestination = destination
      clearLifecycleTimers()
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const traversalDelay = reducedMotion ? 90 : 260
      const closingDelay = reducedMotion ? 430 : 1180
      world.dataset.homePortalSequence = `${destination}:opening`
      world.dataset.homePortalLifecycle = 'environmental-opening-traversal-closing-route-arrival'
      lifecycleTimers.push(window.setTimeout(() => {
        if (world.isConnected && lifecycleDestination === destination) world.dataset.homePortalSequence = `${destination}:traversal`
      }, traversalDelay))
      lifecycleTimers.push(window.setTimeout(() => {
        if (world.isConnected && lifecycleDestination === destination) world.dataset.homePortalSequence = `${destination}:closing`
      }, closingDelay))
    }

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
      const requested = query.get('homeOrbState')
      const reviewOrbState = reviewMode && privateFixture && requested && REVIEW_ORB_STATES.has(requested as OrbState) ? requested as OrbState : null
      world.setAttribute('data-home-asset-mode', reviewMode ? 'disclosed-review-candidate' : 'ready')
      world.setAttribute('data-home-personalization-mode', privateFixture ? 'private-personalized' : 'standard')
      world.setAttribute('data-home-review-fixture', reviewMode && privateFixture ? 'safe-private' : 'none')
      for (const version of ['76','125','126','176','219','220','221','222','223','224','225']) world.setAttribute(`data-home-v${version}-certification`, 'superseded-rejected-pixels')
      world.setAttribute('data-home-v76-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v125-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v126-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v176-art-layer', LEGACY_V176_AUTHORITY_MARKER)
      world.setAttribute('data-home-v219-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v220-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v221-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v222-art-layer', 'historical-unmounted-source-authority')
      world.setAttribute('data-home-v223-art-layer', 'historical-runtime-movement-authority')
      world.setAttribute('data-home-v224-art-layer', 'superseded-rejected-pixels')
      world.setAttribute('data-home-v225-art-layer', 'superseded-v3-visual-owner')
      world.setAttribute('data-home-v226-art-layer', 'rooted-canopy-weathered-banks-inhabited-ground-lineage-observatory-rooted-living-memory-presence')
      world.setAttribute('data-home-v226-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-v126-final-art-contract', LEGACY_V126_FINAL_ART_MARKER.join(':'))
      world.setAttribute('data-home-visible-world', currentHomeVisualAuthority.worldIdentifier)
      world.setAttribute('data-home-visual-repair', 'v226-after-literal-a42bd5d-rejection')
      world.setAttribute('data-home-physical-base', 'continuous-weathered-memory-valley-rooted-canopy-integrated-ground-life-map-and-orb')
      world.setAttribute('data-home-visual-grade', 'v226-literal-pixel-candidate-not-certified')
      world.setAttribute('data-home-final-art-revision', 'v226-retained-pixels-pending')
      world.setAttribute('data-home-live-art-revision', currentHomeVisualAuthority.artRevision)
      world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-scanned-composition', 'v226-dimensional-rooted-sanctuary-ground-observatory-integrated-living-memory-presence')
      world.setAttribute('data-home-runtime-assets', V226_RUNTIME_ASSETS)
      world.setAttribute('data-home-governed-identity-assets', 'v226-direct-runtime-topology historical-v191-glbs-unmounted')
      world.setAttribute('data-home-visible-production-assets', 'v226-weathered-memory-banks v226-rooted-inhabited-canopy v226-ground-inhabited-hearth v226-life-map-lineage-observatory v226-rooted-single-living-memory-presence')
      world.setAttribute('data-home-animation-owner', 'v226-rooted-living-memory-presence')
      world.setAttribute('data-home-audio', 'production-opus-consent-controlled')
      synchronizeCanonicalHomeTelemetry(world)
      stagePortalLifecycle(world)
      if (reviewOrbState !== appliedReviewOrbState) {
        appliedReviewOrbState = reviewOrbState
        publishOrbState(reviewOrbState ?? 'idle', 'system')
      }
    }

    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, { attributes: true, attributeFilter: ['data-home-player-x','data-home-player-z','data-home-portal-sequence'], childList: true, subtree: true })
    window.addEventListener('popstate', hardenHomeOwnership)
    return () => {
      clearLifecycleTimers()
      observer.disconnect()
      window.removeEventListener('popstate', hardenHomeOwnership)
    }
  }, [])

  return <div ref={ownerRef} data-home-authored-region-contract="true" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-route-owner="asset-driven-sacred-home" data-home-spatial-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-forge-scenery="suppressed" data-home-v76-retained-pixel-rebuild="superseded" data-home-v125-retained-pixel-rebuild="superseded" data-home-v126-retained-pixel-rebuild="superseded" data-home-v176-retained-pixel-rebuild="superseded" data-home-v219-retained-pixel-rebuild="superseded" data-home-v220-retained-pixel-rebuild="superseded" data-home-v221-retained-pixel-rebuild="superseded" data-home-v222-retained-pixel-rebuild="superseded" data-home-v223-retained-pixel-rebuild="superseded" data-home-v224-retained-pixel-rebuild="superseded" data-home-v225-retained-pixel-rebuild="superseded" data-home-v226-retained-pixel-rebuild="active" data-home-canvas-owner="home-world-production-v223-movement-v226-visual-single-authority" style={{display:'contents'}}><HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable}/></div>
}
