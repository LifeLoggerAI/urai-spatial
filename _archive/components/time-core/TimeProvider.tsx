'use client'

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  ReactNode,
} from 'react'
import { useFrame } from '@react-three/fiber'

interface TimeContextType {
  time: number
  setTime: (time: number) => void
  isPlaying: boolean
  play: () => void
  pause: () => void
}

const TimeContext = createContext<TimeContextType | null>(null)

/*
1 real second = 1 simulated month
*/
const TIME_MULTIPLIER = 1000 * 60 * 60 * 24 * 30

/*
How often React state updates (seconds)
Prevents 60fps React re-renders
*/
const STATE_SYNC_INTERVAL = 0.25

export const TimeProvider = ({ children }: { children: ReactNode }) => {
  const [time, setTimeState] = useState(() => Date.now())
  const [isPlaying, setIsPlaying] = useState(true)

  const internalTime = useRef(time)
  const accumulator = useRef(0)

  const setTime = useCallback((t: number) => {
    internalTime.current = t
    accumulator.current = 0
    setTimeState(t)
  }, [])

  useFrame((_, delta) => {
    if (!isPlaying) return

    internalTime.current += delta * TIME_MULTIPLIER
    accumulator.current += delta

    if (accumulator.current >= STATE_SYNC_INTERVAL) {
      accumulator.current = 0
      setTimeState(internalTime.current)
    }
  })

  const play = useCallback(() => setIsPlaying(true), [])
  const pause = useCallback(() => setIsPlaying(false), [])

  const value = useMemo<TimeContextType>(
    () => ({
      time,
      setTime,
      isPlaying,
      play,
      pause,
    }),
    [time, setTime, isPlaying, play, pause]
  )

  return <TimeContext.Provider value={value}>{children}</TimeContext.Provider>
}

export const useTimeline = (): TimeContextType => {
  const context = useContext(TimeContext)

  if (!context) {
    throw new Error('useTimeline must be used within a TimeProvider')
  }

  return context
}