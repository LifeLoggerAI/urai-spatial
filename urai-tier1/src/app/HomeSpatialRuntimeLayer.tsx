'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import AssetDrivenHomeWorld from './AssetDrivenHomeWorld'
import { useWebGLAvailable } from './HomeSpatialCanvas'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type RendererState = 'ready' | 'recovering' | 'failed'

function HomeSemanticNavigation() {
  return (
    <nav className="home-semantic-navigation sr-only focus-within:not-sr-only" aria-label="Accessible Home destinations" data-home-navigation-owner="runtime-boundary">
      <button className="sr-only focus:not-sr-only" type="button" aria-label="Open Orb directly" data-testid="home-semantic-orb" onClick={requestUraiWorldOrbOpen}>Open Orb</button>
      <button className="sr-only focus:not-sr-only" type="button" aria-label="Open Ground directly" data-testid="home-semantic-ground" onClick={() => requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })}>Ground</button>
      <button className="sr-only focus:not-sr-only" type="button" aria-label="Open Life Map directly" data-testid="home-semantic-life-map" onClick={() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' })}>Life Map</button>
    </nav>
  )
}

const runtimeStyles = `.urai-home-spatial-runtime-layer .urai-final-home-doorways,.urai-home-spatial-runtime-layer .urai-asset-home-world>.home-semantic-navigation{display:none!important}.urai-home-spatial-runtime-layer>.home-runtime-loading{position:absolute;inset:0;z-index:45;display:grid;place-content:center;gap:14px;text-align:center;background:radial-gradient(circle at 50% 52%,rgba(80,139,119,.2),rgba(8,25,22,.94) 48%,#081b18 100%);color:#eef8f3;font:600 13px/1.3 system-ui;letter-spacing:.03em;pointer-events:none}.urai-home-spatial-runtime-layer>.home-runtime-loading span{width:52px;height:52px;margin:auto;border:1px solid rgba(190,232,218,.34);border-radius:50%;box-shadow:0 0 34px rgba(109,201,174,.2),inset 0 0 22px rgba(109,201,174,.12);animation:home-runtime-forming-breath 1.8s ease-in-out infinite}@keyframes home-runtime-forming-breath{50%{transform:scale(1.08);opacity:.68}}`

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

  if (!homeRouteActive || webglAvailable !== true) return null

  if (rendererState === 'failed') {
    return (
      <section className="urai-home-spatial-runtime-layer" data-urai-home-runtime="accessible-fallback-after-renderer-failure" data-webgl-ready="false" aria-label="Spatial Home fallback">
        <div role="status" aria-live="polite" className="sr-only">The spatial renderer could not recover. Accessible Home controls remain available.</div>
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
      data-home-ground-portal="home-ground-portal-world-owned"
      data-home-life-map-portal="home-life-map-portal-world-owned"
      data-webgl-ready={rendererState === 'ready' ? 'true' : 'recovering'}
      aria-label="URAI living spatial Home"
    >
      {rendererState === 'recovering' ? <div role="status" aria-live="polite" className="sr-only">Restoring the spatial Home renderer.</div> : null}
      {!assetsReady ? <div className="home-runtime-loading" role="status" aria-live="polite"><span aria-hidden="true" /><strong>Your private world is forming</strong></div> : null}
      <HomeSemanticNavigation />
      <AssetDrivenHomeWorld key={recoveryKey} webglAvailable={true} onOrbOpen={requestUraiWorldOrbOpen} />
      <style jsx global>{runtimeStyles}</style>
    </section>
  )
}
