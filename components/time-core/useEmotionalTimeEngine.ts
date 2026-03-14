'use client'

import { useMemo } from 'react'
import { useTimeline } from './TimeProvider'
import { runEmotionalTimeEngine } from './engine'

type MemoryNode = {
  id: string
  timestamp: number
  emotionalWeight: number
  stability: number
  x: number
  y: number
  z: number
}

const EMPTY_STATE = {
  nodes: [],
  orbState: {
    pulse: 0.8,
    colorShift: 0,
    surfaceIntensity: 0
  },
  sceneModulation: {
    exposure: 1,
    bloom: 1,
    fogDensity: 0.1
  }
}

/**
 * Emotional Time Engine Hook
 *
 * Subscribes to the global timeline and computes the emotionally
 * modulated scene state for the current frame.
 */

export const useEmotionalTimeEngine = (nodes: MemoryNode[] = []) => {

  const { time } = useTimeline()

  const engineState = useMemo(() => {

    if (!nodes.length) {
      return EMPTY_STATE
    }

    return runEmotionalTimeEngine(nodes, time)

  }, [time, nodes])

  return engineState

}