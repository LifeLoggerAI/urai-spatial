'use client'

import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { resolveSpatialUserId } from '@/spatial/state/resolveSpatialUserId'
import { getFirebaseDb } from '@/lib/firebase/client'
import type { SpatialMemory } from '@/spatial/data/spatialMemory'
import { getSpatialMemory, getSpatialMemories, getSpatialStars, toSpatialMemory, type SpatialMemoryRecord } from '@/spatial/data/spatialMemoryAdapter'

type SpatialMemoriesState = {
  memories: SpatialMemory[]
  stars: ReturnType<typeof getSpatialStars>
  selectedMemory: SpatialMemory | null
  isRemote: boolean
  isLoading: boolean
  error: string | null
}

function normalizeRecord(id: string, raw: Record<string, unknown>): SpatialMemoryRecord {
  const emotion = (
    raw.emotion === 'calm' ||
    raw.emotion === 'clarity' ||
    raw.emotion === 'tension' ||
    raw.emotion === 'weight' ||
    raw.emotion === 'wonder' ||
    raw.emotion === 'recovery'
  ) ? raw.emotion : 'clarity'

  return {
    id,
    ts: typeof raw.ts === 'number' ? raw.ts : 0,
    title: typeof raw.title === 'string' ? raw.title : id,
    emotion,
    intensity: typeof raw.intensity === 'number' ? raw.intensity : 0.5,
    x: typeof raw.x === 'number' ? raw.x : 0,
    y: typeof raw.y === 'number' ? raw.y : 0,
    z: typeof raw.z === 'number' ? raw.z : -10,
    summary: typeof raw.summary === 'string' ? raw.summary : undefined,
  }
}

export function useSpatialMemories(selectedId?: string | null): SpatialMemoriesState {
  const [memories, setMemories] = useState<SpatialMemory[]>(getSpatialMemories())
  const [isRemote, setIsRemote] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const db = getFirebaseDb()
      const userId = resolveSpatialUserId()
      if (!db || !userId) {
        setMemories(getSpatialMemories())
        setIsRemote(false)
        setIsLoading(false)
        setError(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const q = query(collection(db, 'users', userId, 'spatialMemories'), orderBy('ts', 'desc'), limit(200))
        const snap = await getDocs(q)
        const rows = snap.docs.map((doc) => normalizeRecord(doc.id, doc.data() as Record<string, unknown>))
        const next = rows.map(toSpatialMemory)

        if (!cancelled) {
          setMemories(next.length ? next : getSpatialMemories())
          setIsRemote(next.length > 0)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setMemories(getSpatialMemories())
          setIsRemote(false)
          setIsLoading(false)
          setError(err instanceof Error ? err.message : 'Failed to load spatial memories')
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const stars = useMemo(() => getSpatialStars(memories), [memories])
  const selectedMemory = useMemo(() => {
    if (!selectedId) return null
    return memories.find((m) => m.id === selectedId) ?? getSpatialMemory(selectedId)
  }, [memories, selectedId])

  return {
    memories,
    stars,
    selectedMemory,
    isRemote,
    isLoading,
    error,
  }
}
