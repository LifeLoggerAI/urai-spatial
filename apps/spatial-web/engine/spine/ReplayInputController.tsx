'use client'

import { useEffect } from 'react'
import { useSceneModeStore } from '../state/useSceneModeStore'
import { useReplayTimelineStore } from '../state/useReplayTimelineStore'

export default function ReplayInputController() {
  const mode = useSceneModeStore((s) => s.mode)
  const {
    togglePlay,
    setProgress,
    progress,
    setSpeed,
    speed
  } = useReplayTimelineStore()

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (mode !== 'REPLAY') return

      if (e.code === 'Space') {
        e.preventDefault()
        togglePlay()
      }

      if (e.code === 'ArrowRight') {
        const amount = e.shiftKey ? 0.05 : 0.01
        setProgress(progress + amount)
      }

      if (e.code === 'ArrowLeft') {
        const amount = e.shiftKey ? 0.05 : 0.01
        setProgress(progress - amount)
      }

      if (e.code === 'ArrowUp') {
        setSpeed(speed + 0.01)
      }

      if (e.code === 'ArrowDown') {
        setSpeed(Math.max(0.01, speed - 0.01))
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [mode, progress, speed])

  return null
}
