'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

function readSelectedMemoryId() {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  return params.get('node') || params.get('memoryId')
}

export default function LifeMapDeepLinkRestoration() {
  const pathname = usePathname() ?? '/'
  const router = useRouter()
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  const [memoryId, setMemoryId] = useState<string | null>(null)

  useEffect(() => {
    if (normalizedPathname !== '/life-map') {
      setMemoryId(null)
      return
    }

    const sync = () => setMemoryId(readSelectedMemoryId())
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [normalizedPathname])

  const focusHref = useMemo(() => memoryId ? `/focus?memoryId=${encodeURIComponent(memoryId)}` : null, [memoryId])
  const replayHref = useMemo(
    () => memoryId ? `/replay?memoryId=${encodeURIComponent(memoryId)}&manifestId=replay-recovery-thread` : null,
    [memoryId],
  )

  if (normalizedPathname !== '/life-map' || !memoryId || !focusHref || !replayHref) return null

  return (
    <aside
      className="urai-life-map-deep-link-controls"
      data-testid="urai-life-map-deep-link-controls"
      data-memory-id={memoryId}
      aria-label={`Selected memory ${memoryId}`}
    >
      <p>Selected memory</p>
      <strong>{memoryId.replace(/[-_]+/g, ' ')}</strong>
      <div>
        <button type="button" onClick={() => router.push(focusHref)}>Enter Focus</button>
        <button type="button" onClick={() => router.push(replayHref)}>Replay</button>
        <button
          type="button"
          onClick={() => {
            window.history.replaceState(null, '', '/life-map')
            setMemoryId(null)
          }}
        >
          Overview
        </button>
      </div>
    </aside>
  )
}
