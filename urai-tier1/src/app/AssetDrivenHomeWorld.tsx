'use client'

import { useEffect, useRef } from 'react'
import { publishOrbState, type OrbState } from '@/app/home/orbStateController'
import { useHomePersonalizedScene } from '@/app/home/useHomePersonalizedScene'
import { HomeWorldProductionV223 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV223'
import currentHomeVisualAuthority from './currentHomeVisualAuthority.json'

type Props = { onOrbOpen: () => void; webglAvailable: true }
const REVIEW_ORB_STATES = new Set<OrbState>(['dormant','idle','attention','listening','thinking','speaking','guiding','reflecting','calming','privacy','warning','transition'])
const RUNTIME_ASSETS = currentHomeVisualAuthority.runtimeAssets.join(' ')
const WEATHER_PRESENTATION = {
  clear: { opacity: 0.035, background: 'radial-gradient(circle at 58% 24%, rgba(176,214,204,.18), transparent 46%)' },
  soft: { opacity: 0.045, background: 'radial-gradient(circle at 42% 30%, rgba(171,196,202,.22), transparent 52%)' },
  active: { opacity: 0.065, background: 'radial-gradient(circle at 54% 26%, rgba(105,160,162,.30), transparent 48%)' },
  heavy: { opacity: 0.075, background: 'linear-gradient(180deg, rgba(70,83,93,.26), rgba(21,40,41,.10) 58%, transparent)' },
  recovering: { opacity: 0.06, background: 'radial-gradient(circle at 48% 28%, rgba(165,190,158,.26), transparent 50%)' },
  forming: { opacity: 0.025, background: 'radial-gradient(circle at 50% 32%, rgba(126,157,151,.14), transparent 54%)' },
} as const

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const ownerRef = useRef<HTMLDivElement>(null)
  const { scene, loading: personalizationLoading } = useHomePersonalizedScene()
  const weather = WEATHER_PRESENTATION[scene.environment.weatherTone]
  const emotionalWeatherVisible = !personalizationLoading
    && scene.mode === 'private-personalized'
    && scene.environment.evidence.length > 0
  const emotionalWeatherSource = scene.reviewFixture === 'safe-private'
    ? 'disclosed-safe-private-synthetic-review-fixture'
    : scene.privateDataMounted
      ? 'permitted-private-home-signals'
      : 'none'

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
      world.setAttribute('data-home-scene-mode', scene.mode)
      world.setAttribute('data-home-emotional-weather-tone', scene.environment.weatherTone)
      world.setAttribute('data-home-emotional-weather-source', emotionalWeatherSource)
      world.setAttribute('data-home-emotional-weather-visible', emotionalWeatherVisible ? 'true' : 'false')
      world.setAttribute('data-home-emotional-weather-evidence', scene.environment.evidence.map((item) => item.kind).join(' ') || 'none')
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
  }, [emotionalWeatherSource, emotionalWeatherVisible, scene.environment.evidence, scene.environment.weatherTone, scene.mode])

  const emotionalWeatherSummary = emotionalWeatherVisible
    ? scene.reviewFixture === 'safe-private'
      ? 'Personal emotional weather review fixture: ' + scene.environment.weatherTone + '. This is a disclosed synthetic review input, not user data.'
      : 'Personal emotional weather: ' + scene.environment.weatherTone + '. The atmosphere reflects only permitted private Home signals.'
    : 'Personal emotional weather is not mounted in this Home state.'

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
    <div
      data-testid="home-personal-emotional-weather"
      data-home-emotional-weather-tone={scene.environment.weatherTone}
      data-home-emotional-weather-source={emotionalWeatherSource}
      data-home-emotional-weather-visible={emotionalWeatherVisible ? 'true' : 'false'}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 3,
        pointerEvents: 'none',
        opacity: emotionalWeatherVisible ? weather.opacity : 0,
        background: weather.background,
        mixBlendMode: 'soft-light',
      }}
    />
    <span className="sr-only" role="status" data-testid="home-personal-emotional-weather-status">{emotionalWeatherSummary}</span>
  </div>
}