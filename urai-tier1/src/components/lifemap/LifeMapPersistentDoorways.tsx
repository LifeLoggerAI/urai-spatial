'use client'

import { usePathname, useRouter } from 'next/navigation'

const DEFAULT_MEMORY_ID = 'quiet-reset'
const DEFAULT_MANIFEST_ID = 'replay-recovery-thread'

function buildDoorwayHref(route: 'focus' | 'replay') {
  const current = typeof window === 'undefined'
    ? new URLSearchParams()
    : new URLSearchParams(window.location.search)
  const memoryId = current.get('memoryId') || current.get('node') || DEFAULT_MEMORY_ID
  const manifestId = current.get('manifestId') || DEFAULT_MANIFEST_ID
  const next = new URLSearchParams(current)
  next.set('memoryId', memoryId)
  next.set('node', memoryId)
  next.set('manifestId', manifestId)
  next.set('from', 'life-map-persistent-doorway')
  return `/${route}?${next.toString()}`
}

export default function LifeMapPersistentDoorways() {
  const pathname = usePathname()
  const router = useRouter()
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'

  if (normalizedPathname !== '/life-map') return null

  return (
    <nav className="urai-life-map-persistent-doorways" aria-label="Life Map persistent memory doorways">
      <button
        type="button"
        data-urai-audit-action="life-map-focus"
        onClick={() => router.push(buildDoorwayHref('focus'))}
      >
        Focus
      </button>
      <button
        type="button"
        data-urai-audit-action="life-map-replay"
        onClick={() => router.push(buildDoorwayHref('replay'))}
      >
        Replay
      </button>
    </nav>
  )
}
