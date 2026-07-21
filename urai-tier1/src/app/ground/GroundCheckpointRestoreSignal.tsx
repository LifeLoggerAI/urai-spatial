'use client'

import { useEffect } from 'react'

export default function GroundCheckpointRestoreSignal() {
  useEffect(() => {
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
      })
    })
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
    }
  }, [])

  return null
}
