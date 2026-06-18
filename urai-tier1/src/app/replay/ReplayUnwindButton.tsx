'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const DEFAULT_REPLAY_MANIFEST_ID = 'seed-memory-bloom'

function focusUrlForManifest(manifestId: string) {
  return `/focus?manifestId=${encodeURIComponent(manifestId)}`
}

export function ReplayUnwindButton() {
  const router = useRouter()
  const params = useSearchParams()
  const manifestId = params.get('manifestId') || DEFAULT_REPLAY_MANIFEST_ID

  return (
    <button
      type="button"
      data-testid="replay-unwind-button"
      data-route-action="replay-unwind-route-action"
      onClick={() => {
        window.sessionStorage.setItem('urai-replay-return-manifest-id', manifestId)
        router.push(focusUrlForManifest(manifestId))
      }}
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
      Return to Focus
    </button>
  )
}
