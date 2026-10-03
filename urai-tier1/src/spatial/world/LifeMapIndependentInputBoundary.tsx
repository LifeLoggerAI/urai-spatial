'use client'

import { useEffect, useState } from 'react'

function isLifeMapRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/life-map'
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],button,a,summary,details'))
}

function overviewButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === 'Overview') || null
}

export function LifeMapIndependentInputBoundary() {
  const [announcement, setAnnouncement] = useState('Life Map ready. Choose a memory or open movement help.')

  useEffect(() => {
    const requestStep = (direction: -1 | 1) => {
      window.dispatchEvent(new CustomEvent('urai:life-map-step', { detail: { direction } }))
      setAnnouncement(direction > 0 ? 'Traveling forward to the next memory.' : 'Traveling back to the previous memory.')
    }

    const reset = () => {
      const button = overviewButton()
      if (button) button.click()
      else window.dispatchEvent(new CustomEvent('urai:life-map-overview'))
      setAnnouncement('Returned to the whole private constellation.')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLifeMapRoute() || isEditableTarget(event.target)) return
      // Arrow keys are owned directly by LifeMapSemanticNavigator so one URL-aware
      // step implementation controls deep links, keyboard input, and journey controls.
      if (event.code === 'KeyA' || event.code === 'KeyQ') {
        requestStep(-1)
        event.preventDefault()
        return
      }
      if (event.code === 'KeyD' || event.code === 'KeyE') {
        requestStep(1)
        event.preventDefault()
        return
      }
      if (event.code === 'KeyR' || event.code === 'KeyO' || event.code === 'Home') {
        reset()
        event.preventDefault()
      }
    }

    const onCommand = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action === 'previous') requestStep(-1)
      if (action === 'next') requestStep(1)
      if (action === 'overview') reset()
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('urai:life-map-movement', onCommand as EventListener)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('urai:life-map-movement', onCommand as EventListener)
    }
  }, [])

  return (
    <>
      <details className="life-map-movement-help" data-movement-ui="true" data-life-map-movement-help="true">
        <summary>Explore Life Map</summary>
        <p>Choose an anchored memory to travel through the same universe. A/D or arrow keys move between memories. R, O, or Home returns to Overview. Escape unwinds the selected memory, then returns Home.</p>
      </details>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <style jsx>{`
        .life-map-movement-help{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:72;max-width:min(330px,calc(100vw - 32px));border:1px solid rgba(198,244,255,.2);border-radius:16px;background:rgba(2,8,20,.74);box-shadow:0 18px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px);color:rgba(239,250,255,.88);font:600 12px/1.5 Inter,ui-sans-serif,system-ui;touch-action:pan-y}
        .life-map-movement-help:not([open]){width:max-content;min-width:0;min-height:48px;height:48px!important;max-height:48px;overflow:hidden}
        .life-map-movement-help:not([open])>:not(summary){display:none!important}
        .life-map-movement-help summary{min-height:48px;display:flex;align-items:center;padding:0 16px;cursor:pointer;list-style:none;letter-spacing:.04em;font-weight:800}.life-map-movement-help summary::-webkit-details-marker{display:none}.life-map-movement-help p{margin:0;padding:0 16px 16px;color:rgba(214,239,248,.72)}.life-map-movement-help summary:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:14px}
        @media(max-width:700px){.life-map-movement-help{top:auto!important;right:max(12px,env(safe-area-inset-right));bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));max-width:min(250px,calc(100vw - 24px));max-height:min(55svh,480px)}.life-map-movement-help:not([open]){left:auto!important;width:max-content!important;min-width:0!important;min-height:48px!important;height:48px!important;max-height:48px!important;opacity:.9;overflow:hidden!important}}
      `}</style>
    </>
  )
}

export default LifeMapIndependentInputBoundary
