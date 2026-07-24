'use client'

import { useEffect } from 'react'

const HOME_SELECTOR = '.urai-final-home-world'
const HOME_SPAWN_Z = 7.6

function synchronizeHome(home: HTMLElement) {
  const playerX = Number.parseFloat(home.dataset.homePlayerX ?? '0')
  const playerZ = Number.parseFloat(home.dataset.homePlayerZ ?? String(HOME_SPAWN_Z))
  const distance = Number.parseFloat(home.dataset.homeDistance ?? '0')

  if (Number.isFinite(playerX)) {
    const parallaxX = `${(-playerX * 3.2).toFixed(1)}px`
    if (home.style.getPropertyValue('--home-parallax-x') !== parallaxX) {
      home.style.setProperty('--home-parallax-x', parallaxX)
    }
  }

  if (Number.isFinite(playerZ) && Number.isFinite(distance)) {
    const zOffset = playerZ - HOME_SPAWN_Z
    const movementOffset = Math.abs(zOffset) > 0.001
      ? zOffset
      : distance > 0.001
        ? -distance
        : 0
    const parallaxY = `${(movementOffset * 1.35).toFixed(1)}px`
    if (home.style.getPropertyValue('--home-parallax-y') !== parallaxY) {
      home.style.setProperty('--home-parallax-y', parallaxY)
    }
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

    const synchronizeAfterInput = () => {
      synchronizeAllHomes()
      window.requestAnimationFrame(synchronizeAllHomes)
    }

    const observer = new MutationObserver(synchronizeAllHomes)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-home-player-x', 'data-home-player-z', 'data-home-distance', 'style'],
      childList: true,
      subtree: true,
    })

    window.addEventListener('keyup', synchronizeAfterInput, true)
    window.addEventListener('pointerup', synchronizeAfterInput, true)
    window.addEventListener('touchend', synchronizeAfterInput, true)

    synchronizeAllHomes()
    frame = window.requestAnimationFrame(synchronize)

    return () => {
      observer.disconnect()
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keyup', synchronizeAfterInput, true)
      window.removeEventListener('pointerup', synchronizeAfterInput, true)
      window.removeEventListener('touchend', synchronizeAfterInput, true)
    }
  }, [])

  return null
}
