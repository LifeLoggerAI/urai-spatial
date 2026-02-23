'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSceneStore } from '@/engine/core/scene-store'
import HomeScene from '@/engine/scenes/HomeScene'
import LifeMapScene from '@/spatial/scenes/LifeMapScene'
import LifeReviewScene from '@/spatial/scenes/LifeReviewScene'
import ReplayScene from '@/engine/scenes/ReplayScene'
import ResponsiveCamera from '@/components/scene/ResponsiveCamera'

const SceneComponents: { [key: string]: React.ComponentType } = {
  home: HomeScene,
  lifemap: LifeMapScene,
  lifereview: LifeReviewScene,
  replay: ReplayScene,
}

export default function SceneManager() {
  const { current, setScene } = useSceneStore()
  const pathname = usePathname()

  useEffect(() => {
    const sceneFromUrl = pathname.split('/')[1] || 'home'
    if (sceneFromUrl !== current) {
      setScene(sceneFromUrl)
    }
  }, [pathname, current, setScene])

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
