'use client'

import { useEffect } from 'react'
import { useSceneStore } from '@/engine/core/scene-store'

export default function LifeMapDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const setScene = useSceneStore((s) => s.setScene)

  useEffect(() => {
    // Set the scene to replay, passing the ID.
    // The SceneManager will then render the ReplayScene and populate the replay-store.
    setScene({ type: 'replay', id })
  }, [id, setScene])

  // This page's only job is to trigger a scene change.
  // It should not render any direct content.
  return null
}
