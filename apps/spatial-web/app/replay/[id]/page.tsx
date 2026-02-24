'use client'

import { useEffect } from 'react'
import { useSceneStore } from '@/engine/core/scene-store'

export default function ReplayPage({ params }: { params: { id: string } }) {
  const { id } = params
  const setScene = useSceneStore((s) => s.setScene)

  useEffect(() => {
    setScene({ type: 'replay', id })
  }, [id, setScene])

  return null // This page only sets the scene, it does not render anything
}
