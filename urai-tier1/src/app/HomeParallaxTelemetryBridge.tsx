'use client'

import { useEffect } from 'react'

const HOME_SELECTOR = '.urai-final-home-world'

function synchronizeHome(home: HTMLElement) {
  const playerX = Number.parseFloat(home.dataset.homePlayerX ?? '0')
  const playerZ = Number.parseFloat(home.dataset.homePlayerZ ?? '7.6')
  const distance = Number.parseFloat(home.dataset.homeDistance ?? '0')

  if (Number.isFinite(playerX)) {
    home.style.setProperty('--home-parallax-x', `${(-playerX * 3.2).toFixed(1)}px`)
  }

  if (Number.isFinite(playerZ) && Number.isFinite(distance)) {
    const zOffset = playerZ - 7.6
    const movementOffset = Math.abs(zOffset) > 0.001
      ? zOffset
      : distance > 0.001
        ? -distance
        : 0
    const parallaxY = movementOffset * 1.35
    home.style.setProperty('--home-parallax-y', `${parallaxY.toFixed(1)}px`)
  }
}

function synchronizeAllHomes() {
  document.querySelectorAll<HTMLElement>(HOME_SELECTOR).forEach(synchronizeHome)
}

export default function HomeParallaxTelemetryBridge() {
  useEffect(() => {
    let frame = 0

    const synchronize = () => {
      synchronizeAllHomes()
      frame = window.requestAnimationFrame(synchronize)
    }

    const observer = new MutationObserver(synchronizeAllHomes)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-home-player-x', 'data-home-player-z', 'data-home-distance'],
      childList: true,
      subtree: true,
    })

    synchronizeAllHomes()
    frame = window.requestAnimationFrame(synchronize)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return null
}
