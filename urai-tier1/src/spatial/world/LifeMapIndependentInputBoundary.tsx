'use client'

import { useEffect, useRef, useState } from 'react'

function isLifeMapRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/life-map'
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],button,a,summary,details'))
}

function memoryButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>('.life-map-world-label, .life-map-help button')]
    .filter((button) => !['Enter Focus', 'Replay', 'Overview', 'Return Home'].includes(button.textContent?.trim() || ''))
}

function overviewButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('button')]
    .find((button) => button.textContent?.trim() === 'Overview') || null
}

export function LifeMapIndependentInputBoundary() {
  const indexRef = useRef(-1)
  const [announcement, setAnnouncement] = useState('Life Map ready. Choose a memory or open movement help.')

  useEffect(() => {
    const cycle = (direction: -1 | 1) => {
      const buttons = memoryButtons()
      if (!buttons.length) return false
      indexRef.current = indexRef.current < 0
        ? direction > 0 ? 0 : buttons.length - 1
        : (indexRef.current + direction + buttons.length) % buttons.length
      const next = buttons[indexRef.current]
      next.click()
      setAnnouncement(`${direction > 0 ? 'Traveling forward' : 'Traveling back'} to ${next.textContent?.split(':')[0]?.trim() || 'memory'}.`)
      return true
    }

    const reset = () => {
      const button = overviewButton()
      if (button) button.click()
      else window.dispatchEvent(new CustomEvent('urai:life-map-overview'))
      indexRef.current = -1
      setAnnouncement('Returned to the whole private constellation.')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isLifeMapRoute() || isEditableTarget(event.target)) return
      if (event.code === 'KeyA' || event.code === 'ArrowLeft' || event.code === 'KeyQ') {
        if (cycle(-1)) event.preventDefault()
        return
      }
      if (event.code === 'KeyD' || event.code === 'ArrowRight' || event.code === 'KeyE') {
        if (cycle(1)) event.preventDefault()
        return
      }
      if (event.code === 'KeyR' || event.code === 'KeyO' || event.code === 'Home') {
        reset()
        event.preventDefault()
      }
    }

    const onCommand = (event: Event) => {
      const action = (event as CustomEvent<{ action?: string }>).detail?.action
      if (action === 'previous') cycle(-1)
      if (action === 'next') cycle(1)
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
      <details className="life-map-movement-help" data-movement-ui="true">
        <summary>Explore Life Map</summary>
        <p>Choose an anchored memory to travel through the same universe. A/D or arrow keys move between memories. R, O, or Home returns to Overview. Escape unwinds the selected memory, then returns Home.</p>
      </details>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <style jsx>{`
        .life-map-movement-help{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:72;max-width:min(330px,calc(100vw - 32px));border:1px solid rgba(198,244,255,.2);border-radius:16px;background:rgba(2,8,20,.74);box-shadow:0 18px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px);color:rgba(239,250,255,.88);font:600 12px/1.5 Inter,ui-sans-serif,system-ui;touch-action:pan-y}
        .life-map-movement-help summary{min-height:48px;display:flex;align-items:center;padding:0 16px;cursor:pointer;list-style:none;letter-spacing:.04em;font-weight:800}.life-map-movement-help summary::-webkit-details-marker{display:none}.life-map-movement-help p{margin:0;padding:0 16px 16px;color:rgba(214,239,248,.72)}.life-map-movement-help summary:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:14px}
        @media(max-width:700px){.life-map-movement-help{top:auto;right:max(12px,env(safe-area-inset-right));bottom:max(82px,calc(env(safe-area-inset-bottom) + 72px));max-width:min(250px,calc(100vw - 24px))}.life-map-movement-help:not([open]){opacity:.78}}
      `}</style>
    </>
  )
}

export default LifeMapIndependentInputBoundary
