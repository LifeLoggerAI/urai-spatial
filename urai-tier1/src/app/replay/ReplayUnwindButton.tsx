'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function ReplayUnwindButton() {
  const router = useRouter()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      router.push('/focus')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [router])

  return (
    <button
      type="button"
      data-testid="replay-unwind-route-action"
      onClick={() => router.push('/unwind')}
      style={{
        position: 'fixed',
        right: 24,
        bottom: 24,
        zIndex: 120,
        border: '1px solid rgba(226, 248, 255, 0.28)',
        borderRadius: 999,
        padding: '0.7rem 1rem',
        background: 'rgba(2, 9, 22, 0.72)',
        color: 'rgb(236, 250, 255)',
        backdropFilter: 'blur(14px)',
      }}
    >
      Unwind
    </button>
  )
}
