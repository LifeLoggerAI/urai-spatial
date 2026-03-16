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

type EngineState = {
  nodes: MemoryNode[]
  orbState: {
    pulse: number
    colorShift: number
    surfaceIntensity: number
  }
  sceneModulation: {
    exposure: number
    bloom: number
    fogDensity: number
  }
}

const EMPTY_STATE: EngineState = {
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
 * Computes emotionally modulated scene state from the current timeline time.
 */

export function useEmotionalTimeEngine(nodes: MemoryNode[] = []): EngineState {
  const { time } = useTimeline()

  return useMemo<EngineState>(() => {
    if (nodes.length === 0) {
      return EMPTY_STATE
    }

    return runEmotionalTimeEngine(nodes, time)
  }, [nodes, time])
}