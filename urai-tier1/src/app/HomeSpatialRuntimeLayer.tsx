'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import AssetDrivenHomeWorld from './AssetDrivenHomeWorld'
import { useWebGLAvailable } from './HomeSpatialCanvas'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

type RendererState = 'ready' | 'recovering' | 'failed'

function directHomeSemanticTravel(href: string) {
  if (typeof window === 'undefined') return
  window.location.assign(href)
}

function HomeSemanticNavigation() {
  return (
    <nav className="home-semantic-navigation" aria-label="Accessible Home destinations" data-home-navigation-owner="runtime-boundary" data-home-navigation-non-dominant="true">
      <button type="button" aria-label="Open URAI Orb companion" data-testid="home-semantic-orb" onClick={requestUraiWorldOrbOpen}>Open URAI Orb companion</button>
      <button type="button" aria-label="Open Ground directly" data-testid="home-semantic-ground" onClick={() => directHomeSemanticTravel('/ground/?entryPortal=home-ground&cameraCheckpoint=home-ground-descent')}>Ground</button>
      <button type="button" aria-label="Open Life Map directly" data-testid="home-semantic-life-map" onClick={() => directHomeSemanticTravel('/life-map/')}>Life Map</button>
    </nav>
  )
}

const runtimeStyles = `.urai-home-spatial-runtime-layer .urai-final-home-doorways,.urai-home-spatial-runtime-layer .urai-asset-home-world>.home-semantic-navigation{display:none!important}.urai-home-spatial-runtime-layer>.home-semantic-navigation{position:absolute;z-index:47;right:max(10px,env(safe-area-inset-right));top:50%;transform:translateY(-50%);display:grid;gap:8px;width:48px;pointer-events:auto;opacity:.015}.urai-home-spatial-runtime-layer>.home-semantic-navigation:focus-within{opacity:1}.urai-home-spatial-runtime-layer>.home-semantic-navigation button{display:flex;align-items:center;justify-content:center;width:48px;height:48px;min-width:48px;min-height:48px;padding:0;border:1px solid rgba(230,246,240,.32);border-radius:50%;background:rgba(6,18,19,.92);color:#f3fbf8;font:700 0/1 system-ui;cursor:pointer;pointer-events:auto;touch-action:manipulation}.urai-home-spatial-runtime-layer>.home-semantic-navigation button:focus-visible{font-size:10px;outline:2px solid #fff;outline-offset:2px}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation{position:absolute;left:50%;right:auto;top:auto;bottom:max(34px,calc(env(safe-area-inset-bottom) + 24px));transform:translateX(-50%);display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:min(680px,calc(100vw - 32px));padding:12px;border:1px solid rgba(230,246,240,.28);border-radius:22px;background:rgba(6,18,19,.92);box-shadow:0 18px 54px rgba(0,0,0,.46);opacity:1}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation button{width:auto;height:auto;min-width:0;min-height:52px;padding:9px 12px;border-radius:14px;font:700 12px/1.25 system-ui;text-align:center}.urai-home-spatial-runtime-layer>.home-runtime-loading{position:absolute;inset:0;z-index:45;display:grid;place-content:center;gap:14px;text-align:center;background:radial-gradient(circle at 50% 52%,rgba(80,139,119,.2),rgba(8,25,22,.94) 48%,#081b18 100%);color:#eef8f3;font:600 13px/1.3 system-ui;letter-spacing:.03em;pointer-events:none}.urai-home-spatial-runtime-layer>.home-runtime-loading span{width:52px;height:52px;margin:auto;border:1px solid rgba(190,232,218,.34);border-radius:50%;box-shadow:0 0 34px rgba(109,201,174,.2),inset 0 0 22px rgba(109,201,174,.12);animation:home-runtime-forming-breath 1.8s ease-in-out infinite}@keyframes home-runtime-forming-breath{50%{transform:scale(1.08);opacity:.68}}@media(max-width:700px){.urai-home-spatial-runtime-layer>.home-semantic-navigation{right:max(8px,env(safe-area-inset-right))}.urai-home-spatial-runtime-layer[data-webgl-ready="false"]>.home-semantic-navigation{left:16px;right:16px;bottom:max(18px,calc(env(safe-area-inset-bottom) + 12px));transform:none;grid-template-columns:1fr;width:auto}}@media(prefers-reduced-motion:reduce){.urai-home-spatial-runtime-layer>.home-runtime-loading span{animation:none}}`

export default function HomeSpatialRuntimeLayer() {
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
      const playerZ = Number.parseFloat(home.dataset.homePlayerZ ?? '7.6')
      const distance = Number.parseFloat(home.dataset.homeDistance ?? '0')
      if (Number.isFinite(playerX)) home.style.setProperty('--home-parallax-x', `${(-playerX * 3.2).toFixed(1)}px`)
      if (Number.isFinite(playerZ)) {
        const zOffset = playerZ - 7.6
        const movementOffset = Math.abs(zOffset) > 0.001 ? zOffset : -Math.abs(distance)
        home.style.setProperty('--home-parallax-y', `${(movementOffset * 1.35).toFixed(1)}px`)
      }
    }

    const synchronizeAllHomes = () => {
      runtimeRef.current?.querySelectorAll<HTMLElement>('.urai-final-home-world').forEach(synchronizeHome)
    }

    synchronizeAllHomes()
    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === 'attributes' && record.target instanceof HTMLElement && record.target.matches('.urai-final-home-world')) {
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
    return (
      <section
        className="urai-home-spatial-runtime-layer"
        data-testid="urai-home-accessible-fallback"
        data-webgl-state={unavailable ? 'unavailable' : 'renderer-failed'}
        data-urai-home-runtime={unavailable ? 'accessible-fallback-without-webgl' : 'accessible-fallback-after-renderer-failure'}
        data-webgl-ready="false"
        aria-label="Spatial Home fallback"
      >
        <div role="status" aria-live="polite" className="sr-only">
          {unavailable
            ? 'WebGL is unavailable. Accessible Home controls remain available.'
            : 'The spatial renderer could not recover. Accessible Home controls remain available.'}
        </div>
        <HomeSemanticNavigation />
        <HomeSpatialWorldFinal />
        <style jsx global>{runtimeStyles}</style>
      </section>
    )
  }

  return (
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
      data-webgl-ready={rendererState === 'ready' ? 'true' : 'recovering'}
      aria-label="URAI living spatial Home"
    >
      {rendererState === 'recovering' ? <div role="status" aria-live="polite" className="sr-only">Restoring the spatial Home renderer.</div> : null}
      {!assetsReady ? <div className="home-runtime-loading" role="status" aria-label="Your private world is forming" aria-live="polite"><span aria-hidden="true" /><strong>Your private world is forming</strong></div> : null}
      <HomeSemanticNavigation />
      <AssetDrivenHomeWorld key={recoveryKey} webglAvailable={true} onOrbOpen={requestUraiWorldOrbOpen} />
      <style jsx global>{runtimeStyles}</style>
    </section>
  )
}
