'use client'

import { useContext } from 'react'
import { TimeContext } from './TimeProvider'

export const useTimeline = () => {

  const context = useContext(TimeContext)

  if (!context) {
    throw new Error('useTimeline must be used inside <TimeProvider>')
  }

  return context

}