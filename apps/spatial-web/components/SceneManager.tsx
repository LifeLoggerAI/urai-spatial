'use client'

import { useEffect } from 'react'
import { useSceneStore } from '@/engine/core/scene-store'
import HomeScene from '@/engine/scenes/HomeScene'
import LifeMapScene from '@/spatial/scenes/LifeMapScene' // Corrected import
import ResponsiveCamera from '@/components/scene/ResponsiveCamera'

const SceneComponents: { [key: string]: React.ComponentType } = {
  home: HomeScene,
  lifemap: LifeMapScene, // Corrected scene mapping
}

export default function SceneManager() {
  const { current } = useSceneStore()
  const Scene = SceneComponents[current]

  useEffect(() => {
    console.log(`SCENE LOADED: ${current}`)
  }, [current])

  return (
    <>
      <ResponsiveCamera />
      {Scene && <Scene />}
    </>
  )
}
