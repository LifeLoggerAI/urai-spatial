'use client'

import { useRouter, useSearchParams } from 'next/navigation'

function memoryTitle(memoryId: string) {
  if (memoryId === 'quiet-reset') return 'The Quiet Reset'
  return memoryId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

export default function LifeMapDeepLinkControls() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memoryId = searchParams.get('memoryId') ?? searchParams.get('node')

  if (!memoryId) return null

  const manifestId = searchParams.get('manifestId') ?? 'replay-recovery-thread'
  const title = memoryTitle(memoryId)

  return (
    <aside
      className="urai-lifemap-deep-link-controls"
      data-testid="urai-lifemap-selected-memory-controls"
      data-memory-id={memoryId}
      aria-label={`Selected memory: ${title}`}
      aria-live="polite"
    >
      <p className="urai-lifemap-deep-link-controls__eyebrow">Selected memory</p>
      <strong className="urai-lifemap-deep-link-controls__title">{title}</strong>
      <span className="urai-lifemap-deep-link-controls__detail">Continue directly into this memory or replay its cinematic thread.</span>
      <div className="urai-lifemap-deep-link-controls__actions">
        <button
          type="button"
          onClick={() => router.push(`/focus?memoryId=${encodeURIComponent(memoryId)}`)}
        >
          Enter Focus
        </button>
        <button
          type="button"
          onClick={() => router.push(`/replay?memoryId=${encodeURIComponent(memoryId)}&manifestId=${encodeURIComponent(manifestId)}`)}
        >
          Replay
        </button>
      </div>
    </aside>
  )
}
