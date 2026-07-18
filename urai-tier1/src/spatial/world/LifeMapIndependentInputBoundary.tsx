'use client'

import { useEffect, useRef, useState } from 'react'

const LIFE_MAP_CONTROL_SELECTOR = [
  '.life-map-accessibility-menu',
  '.life-map-recovery',
  '.life-map-memory-portals',
  '.life-map-embodied-controls',
  '.life-map-movement-help',
].join(', ')

const CONTROL_GESTURE_EVENTS = [
  'wheel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchmove',
  'touchend',
] as const

const SELECTED_MEMORY_QUERY_KEY = 'memoryId'
const ROUTE_ACTION_LABELS = new Set(['Enter Focus', 'Replay', 'Overview', 'Ground', 'Home'])

function isLifeMapRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/life-map'
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input,textarea,select,[contenteditable="true"],button,a,summary,details'))
}

function selectedMemoryIsActive() {
  return new URLSearchParams(window.location.search).has(SELECTED_MEMORY_QUERY_KEY)
    || Boolean(document.querySelector('.life-map-memory-portals'))
}

function findOverviewButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('.life-map-accessibility-menu button')]
    .find((button) => button.textContent?.trim() === 'Overview')
}

function memoryButtons() {
  return [...document.querySelectorAll<HTMLButtonElement>('.life-map-accessibility-menu button')]
    .filter((button) => !ROUTE_ACTION_LABELS.has(button.textContent?.trim() || ''))
}

function ensureMapControlsOpen() {
  const menu = document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')
  if (menu) menu.open = true
  return menu
}

function glideDepth(deltaY: number) {
  const realm = document.querySelector<HTMLElement>('.life-map-independent-realm')
  if (!realm) return false
  realm.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }))
  return true
}

export function LifeMapIndependentInputBoundary() {
  const indexRef = useRef(-1)
  const [announcement, setAnnouncement] = useState('Life Map ready. Move through depth or select a memory constellation.')

  useEffect(() => {
    const attached = new Set<HTMLElement>()
    const stopCameraGesture = (event: Event) => event.stopPropagation()

    const removeGestureBoundary = (element: HTMLElement) => {
      CONTROL_GESTURE_EVENTS.forEach((eventName) => {
        element.removeEventListener(eventName, stopCameraGesture)
      })
      attached.delete(element)
    }

    const keepSelectedControlsOpen = () => {
      const menu = document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')
      if (menu && selectedMemoryIsActive()) menu.open = true
    }

    const attach = () => {
      const detached = [...attached].filter((element) => !document.contains(element))
      detached.forEach((element) => {
        removeGestureBoundary(element)
        attached.delete(element)
      })

      document.querySelectorAll<HTMLElement>(LIFE_MAP_CONTROL_SELECTOR).forEach((element) => {
        if (attached.has(element)) return
        attached.add(element)
        CONTROL_GESTURE_EVENTS.forEach((eventName) => {
          element.addEventListener(eventName, stopCameraGesture, { passive: true })
        })
      })
      keepSelectedControlsOpen()
    }

    const cycleMemory = (direction: -1 | 1) => {
      ensureMapControlsOpen()
      const buttons = memoryButtons()
      if (!buttons.length) return false
      indexRef.current = indexRef.current < 0
        ? direction > 0 ? 0 : buttons.length - 1
        : (indexRef.current + direction + buttons.length) % buttons.length
      const next = buttons[indexRef.current]
      next.click()
      setAnnouncement(`${direction > 0 ? 'Gliding forward' : 'Gliding back'} to ${next.textContent?.split(':')[0]?.trim() || 'memory'}.`)
      queueMicrotask(keepSelectedControlsOpen)
      return true
    }

    const overview = () => {
      const button = findOverviewButton()
      if (!button) return false
      button.click()
      indexRef.current = -1
      setAnnouncement('Returned to the whole private constellation.')
      return true
    }

    const onClickCapture = (event: MouseEvent) => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('.life-map-accessibility-menu button')
        : null
      if (!button) return

      const label = button.textContent?.trim() || ''
      if (!ROUTE_ACTION_LABELS.has(label)) {
        const buttons = memoryButtons()
        const index = buttons.indexOf(button)
        if (index >= 0) indexRef.current = index
        const menu = button.closest<HTMLDetailsElement>('.life-map-accessibility-menu')
        if (menu) menu.open = true
        queueMicrotask(keepSelectedControlsOpen)
        window.setTimeout(keepSelectedControlsOpen, 0)
      }
    }

    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (!isLifeMapRoute()) return
      if (event.key === 'Escape' && selectedMemoryIsActive()) {
        const button = findOverviewButton()
        if (!button) return
        event.preventDefault()
        event.stopPropagation()
        event.stopImmediatePropagation()
        button.click()
        indexRef.current = -1
        setAnnouncement('Returned to Life Map overview.')
        return
      }
      if (isEditableTarget(event.target)) return

      if (event.code === 'KeyW' || event.code === 'ArrowUp') {
        if (glideDepth(-180)) {
          event.preventDefault()
          setAnnouncement('Gliding deeper into the memory field.')
        }
        return
      }
      if (event.code === 'KeyS' || event.code === 'ArrowDown') {
        if (glideDepth(180)) {
          event.preventDefault()
          setAnnouncement('Retreating toward the wider constellation.')
        }
        return
      }
      if (event.code === 'KeyA' || event.code === 'ArrowLeft' || event.code === 'KeyQ') {
        if (cycleMemory(-1)) event.preventDefault()
        return
      }
      if (event.code === 'KeyD' || event.code === 'ArrowRight' || event.code === 'KeyE') {
        if (cycleMemory(1)) event.preventDefault()
        return
      }
      if (event.code === 'KeyR' || event.code === 'KeyO' || event.code === 'Home') {
        if (overview()) event.preventDefault()
      }
    }

    const onCommand = (event: Event) => {
      const command = (event as CustomEvent<{ action?: string }>).detail?.action
      if (command === 'deeper') {
        glideDepth(-190)
        setAnnouncement('Gliding deeper into the memory field.')
      }
      if (command === 'retreat') {
        glideDepth(190)
        setAnnouncement('Retreating toward the wider constellation.')
      }
      if (command === 'previous') cycleMemory(-1)
      if (command === 'next') cycleMemory(1)
      if (command === 'overview') overview()
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('click', onClickCapture, true)
    window.addEventListener('keydown', onKeyDownCapture, true)
    window.addEventListener('urai:life-map-movement', onCommand as EventListener)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('keydown', onKeyDownCapture, true)
      window.removeEventListener('urai:life-map-movement', onCommand as EventListener)
      attached.forEach(removeGestureBoundary)
      attached.clear()
    }
  }, [])

  const command = (action: 'deeper' | 'retreat' | 'previous' | 'next' | 'overview') => {
    window.dispatchEvent(new CustomEvent('urai:life-map-movement', { detail: { action } }))
  }

  return (
    <>
      <details className="life-map-movement-help" data-movement-ui="true">
        <summary>Move through Life Map</summary>
        <p>Life Map uses controlled spatial travel rather than walking. Glide through depth, step between constellations, drag to turn, and reset to overview whenever orientation is unclear.</p>
        <span>W/S or ↑/↓ move through depth. A/D, Q/E, or ←/→ glide between memories. Drag turns. Wheel approaches or retreats. R, O, or Home returns to overview.</span>
      </details>
      <div className="life-map-embodied-controls" data-movement-ui="true" role="group" aria-label="Life Map spatial movement controls">
        <button type="button" onClick={() => command('previous')} aria-label="Glide to previous memory">←</button>
        <button type="button" onClick={() => command('deeper')} aria-label="Glide deeper into the memory field">＋</button>
        <button type="button" onClick={() => command('retreat')} aria-label="Retreat toward overview">−</button>
        <button type="button" onClick={() => command('next')} aria-label="Glide to next memory">→</button>
        <button type="button" onClick={() => command('overview')} aria-label="Return to Life Map overview">Overview</button>
      </div>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
      <style jsx>{`
        .life-map-movement-help{position:fixed;top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));z-index:72;max-width:min(330px,calc(100vw - 32px));border:1px solid rgba(198,244,255,.2);border-radius:16px;background:rgba(2,8,20,.74);box-shadow:0 18px 60px rgba(0,0,0,.42);backdrop-filter:blur(18px);color:rgba(239,250,255,.88);font:600 12px/1.45 Inter,ui-sans-serif,system-ui;touch-action:pan-y}
        .life-map-movement-help summary{min-height:48px;display:flex;align-items:center;padding:0 16px;cursor:pointer;list-style:none;letter-spacing:.04em}.life-map-movement-help summary::-webkit-details-marker{display:none}.life-map-movement-help p,.life-map-movement-help span{display:block;margin:0;padding:0 16px 12px}.life-map-movement-help span{color:rgba(189,232,247,.66);font-size:11px}.life-map-movement-help summary:focus-visible{outline:3px solid #fff;outline-offset:3px;border-radius:14px}
        .life-map-embodied-controls{position:fixed;left:50%;bottom:max(18px,env(safe-area-inset-bottom));z-index:74;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:6px;border:1px solid rgba(207,250,254,.18);border-radius:999px;background:rgba(2,10,22,.7);box-shadow:0 16px 44px rgba(0,0,0,.38);backdrop-filter:blur(18px);touch-action:manipulation}
        .life-map-embodied-controls button{min-width:48px;min-height:48px;padding:0 13px;border:1px solid rgba(207,250,254,.15);border-radius:999px;background:rgba(11,31,48,.7);color:#fff;font:800 13px/1 Inter,system-ui;cursor:pointer}.life-map-embodied-controls button:last-child{min-width:88px;font-size:10px;letter-spacing:.06em;text-transform:uppercase}.life-map-embodied-controls button:hover,.life-map-embodied-controls button:focus-visible{border-color:rgba(255,255,255,.78);background:rgba(26,78,104,.9);outline:3px solid #fff;outline-offset:2px}
        @media(max-width:700px){.life-map-movement-help{top:max(9px,env(safe-area-inset-top));right:max(9px,env(safe-area-inset-right));max-width:250px}.life-map-movement-help:not([open]){opacity:.72}.life-map-embodied-controls{bottom:max(9px,env(safe-area-inset-bottom));max-width:calc(100vw - 18px);overflow-x:auto;justify-content:flex-start}.life-map-embodied-controls button{min-width:48px;min-height:48px;padding:0 11px}.life-map-embodied-controls button:last-child{min-width:82px}}
        @media(prefers-reduced-motion:reduce){.life-map-embodied-controls button{transition:none!important}}
      `}</style>
    </>
  )
}

export default LifeMapIndependentInputBoundary
