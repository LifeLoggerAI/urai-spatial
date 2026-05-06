'use client'

import { useEffect, useState } from 'react'
import { subscribeNarratorLine } from './narratorStore'

export default function NarratorHud() {
  const [line, setLine] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeNarratorLine(setLine)

    return () => {
      unsubscribe()
    }
  }, [])

  if (!line) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '12%',
        width: '100%',
        textAlign: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '10px 18px',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.55)',
          color: '#e5e7eb',
          fontSize: '14px',
          letterSpacing: '0.02em',
          backdropFilter: 'blur(6px)',
        }}
      >
        {line}
      </div>
    </div>
  )
}
