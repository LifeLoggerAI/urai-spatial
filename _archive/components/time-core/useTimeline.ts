'use client'

import { useContext } from 'react'
import { TimeContext } from './TimeProvider'

export function useTimeline() {
  const context = useContext(TimeContext)

  if (context === null) {
    throw new Error('useTimeline must be used inside <TimeProvider>')
  }

  return context
}