import { useEffect, useState } from 'react'
import * as readLifeMapStarsModule from '@/lib/uraiCanon/readLifeMapStars'
import type { LifeMapStar } from '@/lib/uraiCanon/lifemapStar'

export function useStarRecords() {
  const [stars, setStars] = useState<LifeMapStar[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    ;(async () => {
      setLoading(true)
      setError(null)

      const result = await ((readLifeMapStarsModule as any).readLifeMapStars ?? (readLifeMapStarsModule as any).default ?? (async () => []))()

      if (!alive) return

      if (!result.ok) {
        setStars([])
        setError(result.error ?? 'Failed to read lifemapStars')
        setLoading(false)
        return
      }

      setStars(result.stars)
      setLoading(false)
    })().catch((err: any) => {
      if (!alive) return
      setStars([])
      setError(err?.message ?? 'Failed to read lifemapStars')
      setLoading(false)
    })

    return () => {
      alive = false
    }
  }, [])

  return { stars, loading, error }
}
