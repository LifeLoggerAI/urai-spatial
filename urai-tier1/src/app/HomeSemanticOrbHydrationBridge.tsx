'use client'

import { useEffect } from 'react'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'

const HOME_SEMANTIC_ORB_SELECTOR = 'button[data-testid="home-semantic-orb"]'
const BRIDGE_ATTRIBUTE = 'data-home-semantic-orb-bridge'

export default function HomeSemanticOrbHydrationBridge() {
  useEffect(() => {
    document.documentElement.setAttribute(BRIDGE_ATTRIBUTE, 'ready')

    const activateSemanticOrb = (event: MouseEvent) => {
      const source = event.target instanceof Element
        ? event.target.closest<HTMLButtonElement>(HOME_SEMANTIC_ORB_SELECTOR)
        : null
      if (!source || source.disabled) return

      // This lightweight boundary owns Home's semantic Orb activation so the
      // control never waits on the much heavier spatial-world hydration path.
      // Capture-phase ownership also prevents the later Home runtime boundary
      // from dispatching the same Orb-open request a second time.
      event.preventDefault()
      event.stopPropagation()
      requestUraiWorldOrbOpen(source)
    }

    document.addEventListener('click', activateSemanticOrb, true)
    return () => {
      document.removeEventListener('click', activateSemanticOrb, true)
      document.documentElement.removeAttribute(BRIDGE_ATTRIBUTE)
    }
  }, [])

  return null
}
