'use client'

import { useEffect } from 'react'

const LIFE_MAP_CONTROL_SELECTOR = [
  '.life-map-accessibility-menu',
  '.life-map-recovery',
  '.life-map-memory-portals',
].join(', ')

const CONTROL_GESTURE_EVENTS = [
  'wheel',
  'pointerdown',
  'pointermove',
  'pointerup',
  'pointercancel',
] as const

const SELECTED_MEMORY_QUERY_KEY = 'memoryId'
const ROUTE_ACTION_LABELS = new Set(['Enter Focus', 'Replay', 'Overview', 'Ground', 'Home'])

function isLifeMapRoute() {
  return window.location.pathname.replace(/\/+$/, '') === '/life-map'
}

function selectedMemoryIsActive() {
  return new URLSearchParams(window.location.search).has(SELECTED_MEMORY_QUERY_KEY)
    || Boolean(document.querySelector('.life-map-memory-portals'))
}

function findOverviewButton() {
  return [...document.querySelectorAll<HTMLButtonElement>('.life-map-accessibility-menu button')]
    .find((button) => button.textContent?.trim() === 'Overview')
}

export function LifeMapIndependentInputBoundary() {
  useEffect(() => {
    const attached = new Set<HTMLElement>()
    const stopCameraGesture = (event: Event) => event.stopPropagation()

    const keepSelectedControlsOpen = () => {
      const menu = document.querySelector<HTMLDetailsElement>('.life-map-accessibility-menu')
      if (menu && selectedMemoryIsActive()) menu.open = true
    }

    const attach = () => {
      document.querySelectorAll<HTMLElement>(LIFE_MAP_CONTROL_SELECTOR).forEach((element) => {
        if (attached.has(element)) return
        attached.add(element)
        CONTROL_GESTURE_EVENTS.forEach((eventName) => {
          element.addEventListener(eventName, stopCameraGesture, { passive: true })
        })
      })
      keepSelectedControlsOpen()
    }

    const onClickCapture = (event: MouseEvent) => {
      const button = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>('.life-map-accessibility-menu button')
        : null
      if (!button) return

      const label = button.textContent?.trim() || ''
      if (!ROUTE_ACTION_LABELS.has(label)) {
        const menu = button.closest<HTMLDetailsElement>('.life-map-accessibility-menu')
        if (menu) menu.open = true
        queueMicrotask(keepSelectedControlsOpen)
        window.setTimeout(keepSelectedControlsOpen, 0)
      }
    }

    const onKeyDownCapture = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !isLifeMapRoute() || !selectedMemoryIsActive()) return

      const overview = findOverviewButton()
      if (!overview) return

      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      overview.click()
    }

    attach()
    const observer = new MutationObserver(attach)
    observer.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('click', onClickCapture, true)
    window.addEventListener('keydown', onKeyDownCapture, true)

    return () => {
      observer.disconnect()
      document.removeEventListener('click', onClickCapture, true)
      window.removeEventListener('keydown', onKeyDownCapture, true)
      attached.forEach((element) => {
        CONTROL_GESTURE_EVENTS.forEach((eventName) => {
          element.removeEventListener(eventName, stopCameraGesture)
        })
      })
      attached.clear()
    }
  }, [])

  return null
}

export default LifeMapIndependentInputBoundary
