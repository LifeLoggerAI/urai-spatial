'use client'

import { useRouter, useSearchParams } from 'next/navigation'

function safeToken(value: string | null, fallback = '') {
  if (!value) return fallback
  const normalized = value.trim().slice(0, 120)
  return /^[A-Za-z0-9._:-]+$/.test(normalized) ? normalized : fallback
}

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
  const memoryId = safeToken(searchParams.get('memoryId') ?? searchParams.get('node'))

  if (!memoryId) return null

  const manifestId = safeToken(searchParams.get('manifestId'), 'replay-recovery-thread')
  const title = memoryTitle(memoryId)
  const destination = (route: 'focus' | 'replay') => {
    const query = new URLSearchParams()
    query.set('memoryId', memoryId)
    query.set('manifestId', manifestId)
    query.set('node', memoryId)
    query.set('from', 'life-map-selected-memory')
    return `/${route}?${query.toString()}`
  }

  return (
    <aside
      className="urai-lifemap-deep-link-controls"
      data-testid="urai-lifemap-selected-memory-controls"
      data-memory-id={memoryId}
      data-manifest-id={manifestId}
      aria-label={`Selected memory: ${title}`}
      aria-live="polite"
    >
      <p className="urai-lifemap-deep-link-controls__eyebrow">Selected memory</p>
      <strong className="urai-lifemap-deep-link-controls__title">{title}</strong>
      <span className="urai-lifemap-deep-link-controls__detail">Continue directly into this memory or replay its cinematic thread.</span>
      <div className="urai-lifemap-deep-link-controls__actions">
        <button type="button" onClick={() => router.push(destination('focus'))}>
          Enter Focus
        </button>
        <button type="button" onClick={() => router.push(destination('replay'))}>
          Replay
        </button>
      </div>
    </aside>
  )
}
