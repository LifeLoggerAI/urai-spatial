'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import FinalHomeWorld from './FinalHomeWorld'
import { useWebGLAvailable } from './HomeSpatialCanvas'
import HomeSpatialWorldFinal from './HomeSpatialWorldFinal'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import type { UraiWorldTravelRequest } from '@/spatial/world/worldTypes'

type RendererState = 'ready' | 'recovering' | 'failed'

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

  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => {
    const request: UraiWorldTravelRequest = destination === 'life-map'
      ? { destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
      : { destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }
    requestUraiWorldTravel(request)
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
    if (!homeRuntimeActive || rendererState === 'failed') return
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
      if (!canvas || canvas === attachedCanvas) return
      attachedCanvas?.removeEventListener('webglcontextlost', onContextLost)
      attachedCanvas?.removeEventListener('webglcontextrestored', onContextRestored)
      attachedCanvas = canvas
      attachedCanvas.addEventListener('webglcontextlost', onContextLost)
      attachedCanvas.addEventListener('webglcontextrestored', onContextRestored)
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(root, { childList: true, subtree: true })

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

  if (!homeRouteActive || webglAvailable !== true) return null

  if (rendererState === 'failed') {
    return (
      <section className="urai-home-spatial-runtime-layer" data-urai-home-runtime="accessible-fallback-after-renderer-failure" data-webgl-ready="false" aria-label="Spatial Home fallback">
        <div role="status" aria-live="polite" className="sr-only">The spatial renderer could not recover. Accessible Home controls remain available.</div>
        <HomeSpatialWorldFinal />
      </section>
    )
  }

  return (
    <section
      ref={runtimeRef}
      className="urai-home-spatial-runtime-layer"
      data-urai-home-runtime="embodied-continuous-webgl-world"
      data-home-visual-owner="final-coherent-sanctuary"
      data-home-exploration="walkable"
      data-webgl-ready={rendererState === 'ready' ? 'true' : 'recovering'}
      aria-label="URAI living spatial Home"
    >
      {rendererState === 'recovering' ? <div role="status" aria-live="polite" className="sr-only">Restoring the spatial Home renderer.</div> : null}
      <FinalHomeWorld key={recoveryKey} webglAvailable={true} onOrbOpen={requestUraiWorldOrbOpen} />
      <nav
        className="urai-home-runtime-doorways"
        data-movement-ui="true"
        data-camera-gesture-boundary="independent"
        aria-label="Direct Home destinations"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onPointerUp={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
      >
        <button type="button" aria-label="Open Orb directly" onClick={requestUraiWorldOrbOpen}>Orb</button>
        <button type="button" aria-label="Open Ground directly" onClick={() => travel('infrastructure-hub')}>Ground</button>
        <button type="button" aria-label="Open Life Map directly" onClick={() => travel('life-map')}>Life Map</button>
      </nav>
      <style jsx global>{`
        .urai-home-spatial-runtime-layer .urai-final-home-doorways { display: none !important; }
        .urai-home-runtime-doorways {
          position: absolute;
          right: max(14px, env(safe-area-inset-right));
          bottom: max(14px, env(safe-area-inset-bottom));
          z-index: 2147483640;
          display: flex;
          gap: 8px;
          pointer-events: auto;
          touch-action: manipulation;
        }
        .urai-home-runtime-doorways button {
          min-height: 48px;
          padding: 0 15px;
          border: 1px solid rgba(227,241,233,.24);
          border-radius: 999px;
          background: rgba(8,20,21,.82);
          backdrop-filter: blur(12px);
          color: #f5fbf7;
          font: 750 11px/1 system-ui;
          letter-spacing: .03em;
          cursor: pointer;
          pointer-events: auto;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .urai-home-runtime-doorways button:focus-visible {
          outline: 3px solid rgba(255,255,255,.92);
          outline-offset: 3px;
        }
        @media (max-width: 700px) {
          .urai-home-runtime-doorways {
            left: max(9px, env(safe-area-inset-left));
            right: max(9px, env(safe-area-inset-right));
            bottom: max(176px, calc(env(safe-area-inset-bottom) + 166px));
            justify-content: center;
            flex-wrap: wrap;
          }
          .urai-home-runtime-doorways button { min-height: 52px; }
        }
        @media (forced-colors: active) {
          .urai-home-runtime-doorways button { forced-color-adjust: auto; background: Canvas; color: CanvasText; border: 1px solid ButtonText; }
        }
      `}</style>
    </section>
  )
}
