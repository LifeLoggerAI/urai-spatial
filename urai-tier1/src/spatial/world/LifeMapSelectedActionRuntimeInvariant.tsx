'use client'

import { useEffect } from 'react'

const NAV_SELECTOR = '.life-map-memory-portals'
const MENU_SELECTOR = '.life-map-accessibility-menu'

function important(element: HTMLElement, property: string, value: string) {
  element.style.setProperty(property, value, 'important')
}

function hardenSelectedActions() {
  const nav = document.querySelector<HTMLElement>(NAV_SELECTOR)
  if (!nav) return

  for (const [property, value] of [
    ['position', 'fixed'],
    ['z-index', '2147483646'],
    ['display', 'grid'],
    ['grid-template-columns', 'repeat(3, minmax(0, 1fr))'],
    ['box-sizing', 'border-box'],
    ['visibility', 'visible'],
    ['opacity', '1'],
    ['transform', 'none'],
    ['pointer-events', 'auto'],
    ['overflow', 'visible'],
    ['touch-action', 'manipulation'],
  ] as const) important(nav, property, value)

  const mobile = window.matchMedia('(max-width: 760px)').matches
  important(nav, 'top', 'auto')
  important(nav, 'bottom', mobile ? 'max(126px, calc(env(safe-area-inset-bottom) + 116px))' : 'max(96px, calc(env(safe-area-inset-bottom) + 86px))')
  important(nav, 'left', mobile ? 'max(12px, env(safe-area-inset-left))' : 'max(24px, env(safe-area-inset-left))')
  important(nav, 'right', mobile ? 'max(12px, env(safe-area-inset-right))' : 'max(24px, env(safe-area-inset-right))')
  important(nav, 'width', 'auto')
  important(nav, 'max-width', mobile ? 'none' : '960px')
  important(nav, 'margin', mobile ? '0' : '0 auto')

  nav.querySelectorAll<HTMLElement>('button').forEach((button) => {
    for (const [property, value] of [
      ['position', 'relative'],
      ['z-index', '1'],
      ['display', 'flex'],
      ['align-items', 'center'],
      ['justify-content', 'center'],
      ['width', '100%'],
      ['min-width', '48px'],
      ['height', '52px'],
      ['min-height', '52px'],
      ['margin', '0'],
      ['box-sizing', 'border-box'],
      ['visibility', 'visible'],
      ['opacity', '1'],
      ['transform', 'none'],
      ['pointer-events', 'auto'],
      ['touch-action', 'manipulation'],
    ] as const) important(button, property, value)
  })

  const realm = nav.closest<HTMLElement>('.life-map-independent-realm')
  realm?.querySelectorAll<HTMLElement>(MENU_SELECTOR).forEach((menu) => {
    important(menu, 'pointer-events', 'none')
    menu.querySelectorAll<HTMLElement>('*').forEach((child) => important(child, 'pointer-events', 'none'))
  })
}

export function LifeMapSelectedActionRuntimeInvariant() {
  useEffect(() => {
    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        hardenSelectedActions()
        frame = requestAnimationFrame(hardenSelectedActions)
      })
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])

  return null
}

export default LifeMapSelectedActionRuntimeInvariant
