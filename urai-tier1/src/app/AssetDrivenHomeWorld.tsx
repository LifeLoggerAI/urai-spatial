'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { HomeWorldProductionV223 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV223'
import currentHomeVisualAuthority from './currentHomeVisualAuthority.json'

type Props = { onOrbOpen: () => void; webglAvailable: true }
const REVIEW_ORB_STATES = new Set<OrbState>(['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition'])
const RUNTIME_ASSETS = currentHomeVisualAuthority.runtimeAssets.join(' ')

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const ownerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return
    let appliedReviewOrbState: OrbState | null = null

    const hardenCanvasOwnership = () => owner.querySelectorAll('canvas').forEach((canvas) => {
      canvas.setAttribute('aria-hidden', 'true')
      canvas.setAttribute('role', 'presentation')
      canvas.setAttribute('tabindex', '-1')
    })

    const applyAuthority = (world: HTMLElement) => {
      const query = new URLSearchParams(window.location.search)
      const reviewMode = query.get('homeAssetReview') === '1'
      const privateFixture = query.get('homePrivateFixture') === '1'
      const requested = query.get('homeOrbState')
      const reviewOrbState = reviewMode && privateFixture && requested && REVIEW_ORB_STATES.has(requested as OrbState) ? requested as OrbState : null

      world.setAttribute('data-home-asset-mode', reviewMode ? 'disclosed-review-candidate' : 'ready')
      world.setAttribute('data-home-personalization-mode', privateFixture ? 'private-personalized' : 'standard')
      world.setAttribute('data-home-review-fixture', reviewMode && privateFixture ? 'safe-private' : 'none')
      world.setAttribute('data-home-visible-world', currentHomeVisualAuthority.worldIdentifier)
      world.setAttribute('data-home-live-art-revision', currentHomeVisualAuthority.artRevision)
      world.setAttribute('data-home-art-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-visual-repair', 'cinematic-home-ground-threshold-convergence')
      world.setAttribute('data-home-physical-base', 'continuous-lived-physical-world')
      world.setAttribute('data-home-scanned-composition', 'visible-avatar-living-memory-orb-physical-ground-and-broad-sky-threshold')
      world.setAttribute('data-home-runtime-assets', RUNTIME_ASSETS)
      world.setAttribute('data-home-ground-entry', 'physical-world-surface')
      world.setAttribute('data-home-life-map-entry', 'visible-sky-broad-interaction')
      world.setAttribute('data-home-audio', 'production-opus-consent-controlled')
      world.setAttribute('data-home-v223-art-layer', 'cinematic-threshold-runtime-authority')
      world.setAttribute('data-home-v288-certification', 'fresh-exact-head-pixels-required')
      world.setAttribute('data-home-v225-retained-pixel-rebuild', 'superseded')
      world.setAttribute('data-home-v226-retained-pixel-rebuild', 'superseded')
      world.setAttribute('data-home-v288-retained-pixel-rebuild', 'active')

      if (reviewOrbState !== appliedReviewOrbState) {
        appliedReviewOrbState = reviewOrbState
        publishOrbState(reviewOrbState ?? 'idle', 'system')
      }
    }

    const refresh = () => {
      hardenCanvasOwnership()
      const world = owner.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (world) applyAuthority(world)
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(owner, { childList: true, subtree: true })
    window.addEventListener('popstate', refresh)
    return () => { observer.disconnect(); window.removeEventListener('popstate', refresh) }
  }, [])

  return <div
    ref={ownerRef}
    data-home-authored-region-contract="true"
    data-home-visible-world="cinematic-lived-world-threshold"
    data-home-route-owner="asset-driven-sacred-home"
    data-home-spatial-regions="home-physical-world home-visible-avatar home-living-memory-orb home-life-map-sky-threshold"
    data-home-forge-scenery="suppressed"
    data-home-v225-retained-pixel-rebuild="superseded"
    data-home-v226-retained-pixel-rebuild="superseded"
    data-home-v288-retained-pixel-rebuild="active"
    data-home-canvas-owner="home-world-production-v223-cinematic-threshold-authority"
    style={{ display: 'contents' }}
  >
    <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
  </div>
}