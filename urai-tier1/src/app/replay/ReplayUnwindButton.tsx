'use client'

import { useRouter } from 'next/navigation'

export function ReplayUnwindButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      className="sr-only"
      data-testid="replay-unwind-route-action"
      onClick={() => router.push('/unwind')}
    >
      Unwind
    </button>
  )
}
