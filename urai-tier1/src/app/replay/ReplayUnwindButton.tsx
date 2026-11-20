'use client'

import { useRouter, useSearchParams } from 'next/navigation'

function focusUrlForManifest(manifestId: string, memoryId: string, nodeId: string, demo: boolean) {
  const query = new URLSearchParams({ memoryId, node: nodeId, manifestId })
  if (demo) query.set('demo', '1')
  return `/focus?${query.toString()}`
}

export function ReplayUnwindButton() {
  const router = useRouter()
  const params = useSearchParams()
  const manifestId = params?.get('manifestId') ?? ''
  const memoryId = params?.get('memoryId') ?? ''
  const nodeId = params?.get('node') ?? memoryId
  const demo = params?.get('demo') === '1'

  return (
    <button
      type="button"
      data-testid="replay-unwind-button"
      data-route-action="replay-unwind-route-action"
      onClick={() => {
        // The target is an untrusted locator, never an access grant. Focus
        // rechecks Firebase auth, owner consent and the memory document.
        if (manifestId && memoryId && nodeId) router.push(focusUrlForManifest(manifestId, memoryId, nodeId, demo))
        else router.push('/life-map')
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
