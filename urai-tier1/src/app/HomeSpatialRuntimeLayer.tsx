'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import AssetDrivenHomeWorld from './AssetDrivenHomeWorld'
import { useWebGLAvailable } from './HomeSpatialCanvas'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'
import JourneyOfflineNotice from '@/lib/i18n/JourneyOfflineNotice'
import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import HomeSceneRenderBoundary from './home/HomeSceneRenderBoundary'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'
import { homeJourneyHref } from '@/spatial/navigation/homeSkyInteraction'
import { HomeManualEmotionalWeatherStatus } from '@/lib/uraiEmotion/ManualEmotionalWeatherControls'
import { clearHomeAssetCache, isHomeAssetLoadError } from '@/spatial/layout/HomeWorldProductionPolished'

type RendererState = 'ready' | 'recovering' | 'failed'

const HOME_TELEMETRY_SELECTOR = '.urai-asset-home-world[data-home-primary-owner="asset-driven"], .urai-final-home-world'

function HomeAdamLauncher() {
  return <div className="home-adam-launcher-slot"><AdamLauncherSlot name="home" as="div" /></div>
}

function HomeSemanticNavigation() {
  const locale = useUraiLocale()
  const [currentSearch, setCurrentSearch] = useState('')
  const [companionReady, setCompanionReady] = useState(false)
  useEffect(() => { setCurrentSearch(window.location.search) }, [])
  useEffect(() => {
    // The Home boundary can hydrate before its sibling Orb event owner. Keep
    // the control disabled until that owner has registered its open listener.
    const updateCompanionReady = () => setCompanionReady(Boolean(document.querySelector('.urai-world-companion[data-hydrated="true"][data-phase="idle"]')))
    const observer = new MutationObserver(updateCompanionReady)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-hydrated', 'data-phase'] })
    updateCompanionReady()
    return () => observer.disconnect()
  }, [])
  return (
    <nav className="home-semantic-navigation" {...locale.props('home.destinations')} aria-label={locale.text('home.destinations')} data-home-navigation-owner="runtime-boundary" data-home-navigation-non-dominant="true">
      <button type="button" {...locale.props('home.orbAction')} aria-label={locale.text('home.orbAction')} data-testid="home-semantic-orb" disabled={!companionReady} onClick={requestUraiWorldOrbOpen}>{locale.text('home.orbAction')}</button>
      <a href={homeJourneyHref('/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent', currentSearch)} {...locale.props('home.groundAction')} aria-label={locale.text('home.groundAction')} data-testid="home-semantic-ground">{locale.text('nav.ground')}</a>
      <a href={homeJourneyHref('/life-map/?from=home-sky&entryPortal=home-sky&cameraCheckpoint=home-sky-ascent-complete', currentSearch)} {...locale.props('home.lifeMapAction')} aria-label={locale.text('home.lifeMapAction')} data-testid="home-semantic-life-map">{locale.text('nav.lifeMap')}</a>
    </nav>
  )
}

function HomeAccessibleSanctuaryFallback() {
  return (
    <div
      className="home-accessible-sanctuary"
      data-home-fallback-canon="inhabited-natural-sanctuary"
      data-home-fallback-retired-shell="absent"
    >
      <div className="home-accessible-sanctuary__world" aria-hidden="true">
        <span className="home-accessible-sanctuary__sun" />
        <span className="home-accessible-sanctuary__ridge home-accessible-sanctuary__ridge--far" />
        <span className="home-accessible-sanctuary__ridge home-accessible-sanctuary__ridge--near" />
        <span className="home-accessible-sanctuary__ground" />
        <span className="home-accessible-sanctuary__path" />
        <span className="home-accessible-sanctuary__seat home-accessible-sanctuary__seat--left" />
        <span className="home-accessible-sanctuary__seat home-accessible-sanctuary__seat--right" />
        <span className="home-accessible-sanctuary__orb" />
        <span className="home-accessible-sanctuary__vignette" />
      </div>
      <div className="home-accessible-sanctuary__copy">
        <p>Home sanctuary</p>
        <h1>Your sanctuary remains yours.</h1>
        <span>The natural Home view is resting. Its private destinations remain available below.</span>
      </div>
    </div>
  )
}

const runtimeStyles = `.home-adam-launcher-slot{position:fixed;z-index:2147483646;right:max(8px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));width:64px;min-height:48px}.urai-home-spatial-runtime-layer .urai-final-home-doorways,.urai-home-spatial-runtime-layer .urai-asset-home-world>.home-semantic-navigation{display:none!important}.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]{position:fixed;z-index:2147483647;right:max(10px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:grid;gap:8px;width:48px;pointer-events:auto;opacity:.015}.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]:focus-within{opacity:1}.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"] :is(button,a){display:flex;align-items:center;justify-content:center;width:48px;height:48px;min-width:48px;min-height:48px;padding:0;border:1px solid rgba(230,246,240,.32);border-radius:50%;background:rgba(6,18,19,.92);color:#f3fbf8;font:700 0/1 system-ui;cursor:pointer;pointer-events:auto;touch-action:manipulation}.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"] :is(button,a):focus-visible{font-size:10px;outline:2px solid #fff;outline-offset:2px}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation{position:absolute;left:50%;right:auto;top:auto;bottom:max(34px,calc(env(safe-area-inset-bottom) + 24px));transform:translateX(-50%);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:min(680px,calc(100vw - 32px));padding:12px;border:1px solid rgba(230,246,240,.28);border-radius:22px;background:rgba(6,18,19,.92);box-shadow:0 18px 54px rgba(0,0,0,.46);opacity:1}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation :is(button,a){width:auto;height:auto;min-width:0;min-height:52px;padding:9px 12px;border-radius:14px;font:700 12px/1.25 system-ui;text-align:center}.urai-home-spatial-runtime-layer>.home-runtime-loading{position:absolute;inset:0;z-index:45;display:grid;place-content:center;gap:14px;text-align:center;background:radial-gradient(circle at 50% 52%,rgba(80,139,119,.2),rgba(8,25,22,.94) 48%,#081b18 100%);color:#eef8f3;font:600 13px/1.3 system-ui;letter-spacing:.03em;pointer-events:none}.urai-home-spatial-runtime-layer>.home-runtime-loading span{width:52px;height:52px;margin:auto;border:1px solid rgba(190,232,218,.34);border-radius:50%;box-shadow:0 0 34px rgba(109,201,174,.2),inset 0 0 22px rgba(109,201,174,.12);animation:home-runtime-forming-breath 1.8s ease-in-out infinite}@keyframes home-runtime-forming-breath{50%{transform:scale(1.08);opacity:.68}}@media(max-width:700px){.home-semantic-navigation[data-home-navigation-owner="runtime-boundary"]{right:max(80px,calc(env(safe-area-inset-right) + 80px));top:max(12px,env(safe-area-inset-top));transform:none;grid-template-columns:48px;width:48px}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation{left:16px;right:16px;bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));transform:none;grid-template-columns:1fr;width:auto}}@media(prefers-reduced-motion:reduce){.urai-home-spatial-runtime-layer>.home-runtime-loading span{animation:none}}`

const fallbackSanctuaryStyles = `.home-accessible-sanctuary{position:absolute;inset:0;overflow:hidden;background:linear-gradient(180deg,#d6e5df 0%,#a9c4ba 46%,#536e5e 46%,#1b3229 100%);color:#f4fbf7}.home-accessible-sanctuary__world{position:absolute;inset:0}.home-accessible-sanctuary__sun{position:absolute;left:26%;top:11%;width:44px;height:44px;border-radius:50%;background:rgba(239,247,225,.62);box-shadow:0 0 42px rgba(239,247,225,.3)}.home-accessible-sanctuary__ridge{position:absolute;left:-8%;right:-8%;display:block;clip-path:polygon(0 100%,0 62%,13% 43%,27% 59%,42% 35%,58% 58%,74% 39%,88% 55%,100% 32%,100% 100%)}.home-accessible-sanctuary__ridge--far{top:31%;height:26%;background:#789788}.home-accessible-sanctuary__ridge--near{top:38%;height:25%;background:#4f6f5c;transform:scaleX(1.04)}.home-accessible-sanctuary__ground{position:absolute;inset:46% 0 0;background:radial-gradient(ellipse at 50% 20%,rgba(117,148,119,.55),transparent 56%),linear-gradient(180deg,#58735c,#213c30 73%,#11241d)}.home-accessible-sanctuary__path{position:absolute;left:37%;right:37%;top:49%;bottom:-8%;background:linear-gradient(180deg,rgba(206,215,190,.7),rgba(135,153,132,.52));clip-path:polygon(45% 0,57% 0,100% 100%,0 100%)}.home-accessible-sanctuary__seat{position:absolute;top:59%;width:12%;height:7%;border-radius:4px 4px 12px 12px;background:linear-gradient(180deg,#6f5437 0 34%,#a17b51 35% 52%,#524332 53%);box-shadow:0 15px 0 -12px #1a281e}.home-accessible-sanctuary__seat--left{left:18%;transform:perspective(180px) rotateY(16deg)}.home-accessible-sanctuary__seat--right{right:18%;transform:perspective(180px) rotateY(-16deg)}.home-accessible-sanctuary__orb{position:absolute;left:50%;top:51%;width:36px;height:36px;transform:translate(-50%,-50%);border:1px solid rgba(210,250,242,.7);border-radius:50%;background:radial-gradient(circle at 38% 34%,#b8f3e6,#67b9ac 38%,#1c6664 63%,#102f34 100%);box-shadow:0 0 0 8px rgba(111,210,191,.08),0 0 36px rgba(119,231,211,.35)}.home-accessible-sanctuary__vignette{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 43%,transparent 35%,rgba(8,22,17,.46) 100%)}.home-accessible-sanctuary__copy{position:absolute;z-index:3;left:clamp(24px,5vw,76px);top:max(220px,31svh);max-width:min(360px,calc(100vw - 48px));padding:16px 18px;border:1px solid rgba(232,246,238,.24);border-radius:18px;background:rgba(10,28,22,.68);box-shadow:0 20px 50px rgba(4,14,10,.28);backdrop-filter:blur(10px)}.home-accessible-sanctuary__copy p{margin:0 0 8px;color:#b9d9c8;font:800 11px/1.2 system-ui;letter-spacing:.14em;text-transform:uppercase}.home-accessible-sanctuary__copy h1{margin:0;color:#f4fbf7;font:700 clamp(25px,4vw,42px)/1.02 system-ui;letter-spacing:-.04em}.home-accessible-sanctuary__copy span{display:block;margin-top:10px;color:#d8e9df;font:500 13px/1.45 system-ui}@media(max-width:700px){.home-accessible-sanctuary__sun{left:18%;top:12%;width:34px;height:34px}.home-accessible-sanctuary__ridge{left:-35%;right:-35%}.home-accessible-sanctuary__seat{display:none}.home-accessible-sanctuary__path{left:28%;right:28%}.home-accessible-sanctuary__copy{left:16px;right:16px;top:max(220px,33svh);max-width:none;padding:13px 15px}.home-accessible-sanctuary__copy h1{font-size:25px}.home-accessible-sanctuary__copy span{font-size:12px}}@media(prefers-reduced-motion:reduce){.home-accessible-sanctuary *{animation:none!important;transition:none!important}}`

export default function HomeSpatialRuntimeLayer() {
  const locale = useUraiLocale()
  const pathname = usePathname() ?? '/'
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const webglAvailable = useWebGLAvailable()
  const homeRouteActive = normalizedPathname === '/' || normalizedPathname === '/home'
  const homeRuntimeActive = homeRouteActive && webglAvailable === true
  const runtimeRef = useRef<HTMLElement>(null)
  const recoveryAttemptsRef = useRef(0)
  const [rendererState, setRendererState] = useState<RendererState>('ready')
  const [recoveryKey, setRecoveryKey] = useState(0)
  const [assetsReady, setAssetsReady] = useState(false)
  const [assetLoadFailed, setAssetLoadFailed] = useState(false)

  const onSceneFailure = useCallback((error: Error) => {
    setAssetLoadFailed(isHomeAssetLoadError(error))
    setAssetsReady(false)
    setRendererState('failed')
  }, [])

  const retryHome = useCallback(() => {
    clearHomeAssetCache()
    recoveryAttemptsRef.current = 0
    setAssetLoadFailed(false)
    setAssetsReady(false)
    setRecoveryKey((value) => value + 1)
    setRendererState('ready')
  }, [])

  useEffect(() => {
    document.body.style.cursor = 'default'

    if (!homeRuntimeActive || rendererState === 'failed') {
      document.body.classList.remove('urai-home-webgl-active')
      return
    }

    document.body.classList.add('urai-home-webgl-active')
    return () => {
      document.body.classList.remove('urai-home-webgl-active')
      document.body.style.cursor = 'default'
    }
  }, [homeRuntimeActive, rendererState])

  useEffect(() => {
    if (!homeRuntimeActive || rendererState === 'failed') {
      setAssetsReady(false)
      return
    }
    const root = runtimeRef.current
    if (!root) return

    let recoveryTimer: ReturnType<typeof setTimeout> | null = null
    let attachedCanvas: HTMLCanvasElement | null = null

    const onContextLost = (event: Event) => {
      event.preventDefault()
      if (recoveryAttemptsRef.current >= 1) {
        setAssetLoadFailed(false)
        setAssetsReady(false)
        setRendererState('failed')
        return
      }
      recoveryAttemptsRef.current += 1
      setRendererState('recovering')
      recoveryTimer = setTimeout(() => {
        setRecoveryKey((value) => value + 1)
        setRendererState('ready')
      }, 250)
    }

    const onContextRestored = () => setRendererState('ready')

    const attach = () => {
      const canvas = root.querySelector('canvas')
      if (canvas && canvas !== attachedCanvas) {
        attachedCanvas?.removeEventListener('webglcontextlost', onContextLost)
        attachedCanvas?.removeEventListener('webglcontextrestored', onContextRestored)
        attachedCanvas = canvas
        attachedCanvas.addEventListener('webglcontextlost', onContextLost)
        attachedCanvas.addEventListener('webglcontextrestored', onContextRestored)
      }
      const owner = root.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      setAssetsReady(owner?.getAttribute('data-home-assets-ready') === 'true')
    }

    setAssetsReady(false)
    attach()
    const observer = new MutationObserver(attach)
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-home-assets-ready'] })

    return () => {
      observer.disconnect()
      if (recoveryTimer) clearTimeout(recoveryTimer)
      attachedCanvas?.removeEventListener('webglcontextlost', onContextLost)
      attachedCanvas?.removeEventListener('webglcontextrestored', onContextRestored)
    }
  }, [homeRuntimeActive, recoveryKey, rendererState])

  useEffect(() => {
    if (!homeRuntimeActive || rendererState === 'failed') return

    const synchronizeHome = (home: HTMLElement) => {
      const playerX = Number.parseFloat(home.dataset.homePlayerX ?? '0')
      const playerZ = Number.parseFloat(home.dataset.homePlayerZ ?? '8.4')
      const distance = Number.parseFloat(home.dataset.homeDistance ?? '0')
      if (Number.isFinite(playerX)) home.style.setProperty('--home-parallax-x', `${(-playerX * 3.2).toFixed(1)}px`)
      if (Number.isFinite(playerZ)) {
        const zOffset = playerZ - 8.4
        const movementOffset = Math.abs(zOffset) > 0.001 ? zOffset : -Math.abs(distance)
        home.style.setProperty('--home-parallax-y', `${(movementOffset * 1.35).toFixed(1)}px`)
      }
    }

    const synchronizeAllHomes = () => {
      runtimeRef.current?.querySelectorAll<HTMLElement>(HOME_TELEMETRY_SELECTOR).forEach(synchronizeHome)
    }

    synchronizeAllHomes()
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes' && record.target instanceof HTMLElement && record.target.matches(HOME_TELEMETRY_SELECTOR)) {
          synchronizeHome(record.target)
          return
        }
        if (record.type === 'childList') synchronizeAllHomes()
      })
    })
    const root = runtimeRef.current
    if (root) {
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['data-home-player-x', 'data-home-player-z', 'data-home-distance'],
        childList: true,
        subtree: true,
      })
    }

    const synchronizeAfterInput = () => {
      synchronizeAllHomes()
      window.requestAnimationFrame(synchronizeAllHomes)
    }
    window.addEventListener('keyup', synchronizeAfterInput)
    window.addEventListener('pointerup', synchronizeAfterInput)
    window.addEventListener('touchend', synchronizeAfterInput)

    return () => {
      observer.disconnect()
      window.removeEventListener('keyup', synchronizeAfterInput)
      window.removeEventListener('pointerup', synchronizeAfterInput)
      window.removeEventListener('touchend', synchronizeAfterInput)
    }
  }, [homeRuntimeActive, recoveryKey, rendererState])

  if (!homeRouteActive || webglAvailable === null) return null

  if (webglAvailable === false || rendererState === 'failed') {
    const unavailable = webglAvailable === false
    const failureMessageId = unavailable ? 'home.webglUnavailable' : assetLoadFailed ? 'home.assetsUnavailable' : 'home.rendererUnavailable'
    return (
      <section
        className="urai-home-spatial-runtime-layer"
        data-testid="urai-home-accessible-fallback"
        data-webgl-state={unavailable ? 'unavailable' : assetLoadFailed ? 'asset-load-failed' : 'renderer-failed'}
        data-urai-home-runtime={unavailable ? 'accessible-fallback-without-webgl' : assetLoadFailed ? 'accessible-fallback-after-asset-load-failure' : 'accessible-fallback-after-renderer-failure'}
        data-webgl-ready="false"
        data-home-assets-ready="false"
        aria-label="Spatial Home fallback"
      >
        <HomeAdamLauncher />
        <HomeManualEmotionalWeatherStatus />
        <div role="status" aria-live="polite" className="home-runtime-recovery">
          <span {...locale.props(failureMessageId)}>{locale.text(failureMessageId)}</span>
          <JourneyOfflineNotice />
          {!unavailable ? <button type="button" data-testid="home-retry-assets" onClick={retryHome} {...locale.props('home.retry')}>{locale.text('home.retry')}</button> : null}
        </div>
        <HomeSemanticNavigation />
        <HomeAccessibleSanctuaryFallback />
        <style jsx global>{runtimeStyles}</style>
        <style jsx global>{fallbackSanctuaryStyles}</style>
        <style jsx>{`.home-runtime-recovery{position:absolute;left:50%;top:max(24px,env(safe-area-inset-top));transform:translateX(-50%);z-index:50;display:grid;gap:12px;width:min(560px,calc(100vw - 32px));padding:18px;border:1px solid rgba(230,246,240,.3);border-radius:18px;background:rgba(6,18,19,.94);color:#f3fbf8;font:600 14px/1.5 system-ui;text-align:center}.home-runtime-recovery button{min-height:48px;padding:10px 18px;border:1px solid rgba(230,246,240,.45);border-radius:12px;background:#173d33;color:#f3fbf8;font:700 14px/1.4 system-ui;cursor:pointer;touch-action:manipulation}.home-runtime-recovery button:focus-visible{outline:2px solid #fff;outline-offset:3px}`}</style>
      </section>
    )
  }

  return (
    <>
      <HomeAdamLauncher />
      <HomeSemanticNavigation />
      <HomeManualEmotionalWeatherStatus />
      <section
      ref={runtimeRef}
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="asset-driven-primary-with-procedural-degraded-fallback"
      data-home-visual-owner="asset-driven-personalized-sanctuary"
      data-home-authored-terrain="home-authored-terrain"
      data-home-authored-embodied-self="home-authored-embodied-self"
      data-home-exploration="walkable"
      data-home-ground-affordance="home-ground-environmental-threshold"
      data-home-life-map-affordance="home-life-map-sky-lookout"
      data-home-context-owner="world-local-context-only"
      data-home-assets-ready={assetsReady ? 'true' : 'false'}
      data-webgl-ready={rendererState === 'ready' ? 'true' : 'recovering'}
      aria-labelledby="urai-home-scene-label"
    >
      <span className="sr-only" id="urai-home-scene-label" {...locale.props('home.label')}>{locale.text('home.label')}</span>
      {rendererState === 'recovering' ? <div role="status" aria-live="polite" className="sr-only" {...locale.props('home.restoring')}>{locale.text('home.restoring')}</div> : null}
      {!assetsReady ? <div className="home-runtime-loading" role="status" aria-label={locale.text('home.forming')} aria-live="polite"><span aria-hidden="true" /><strong {...locale.props('home.forming')}>{locale.text('home.forming')}</strong><JourneyOfflineNotice /></div> : null}
      <HomeSceneRenderBoundary key={recoveryKey} onFailure={onSceneFailure}>
        <AssetDrivenHomeWorld webglAvailable={true} onOrbOpen={requestUraiWorldOrbOpen} onSceneFailure={onSceneFailure} />
      </HomeSceneRenderBoundary>
      <style jsx global>{runtimeStyles}</style>
      </section>
    </>
  )
}



