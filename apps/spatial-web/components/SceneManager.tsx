'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSceneStore } from '@/engine/core/scene-store'
import { useReplayStore } from '@/engine/core/replay-store'
import HomeScene from '@/engine/scenes/HomeScene'
import LifeMapScene from '@/spatial/scenes/LifeMapScene'
import LifeReviewScene from '@/spatial/scenes/LifeReviewScene'
import ReplayScene from '@/engine/scenes/ReplayScene'
import ResponsiveCamera from '@/components/scene/ResponsiveCamera'

const SceneComponents: Record<string, React.ComponentType<any>> = {
  home: HomeScene,
  lifemap: LifeMapScene,
  lifereview: LifeReviewScene,
  replay: ReplayScene,
}

export default function SceneManager() {
  const scene = useSceneStore((state) => state.scene)
  const setScene = useSceneStore((state) => state.setScene)
  const setReplayData = useReplayStore((state) => state.setReplayData)
  const pathname = usePathname()

  useEffect(() => {
    const pathParts = pathname.split('/').filter(Boolean);
    const sceneTypeFromPath = pathParts[0];
    const sceneIdFromPath = pathParts[1];

    if (pathname === '/') {
      if (scene.type !== 'home') setScene({ type: 'home' });
    } else if (sceneTypeFromPath === 'lifereview') {
      if (scene.type !== 'lifereview') setScene({ type: 'lifereview' });
    } else if (sceneTypeFromPath === 'lifemap' && !sceneIdFromPath) {
      if (scene.type !== 'lifemap') setScene({ type: 'lifemap' });
    } else if (sceneTypeFromPath === 'replay' || (sceneTypeFromPath === 'lifemap' && sceneIdFromPath)) {
      if (sceneIdFromPath && (scene.type !== 'replay' || scene.id !== sceneIdFromPath)) {
        setScene({ type: 'replay', id: sceneIdFromPath });
      }
    }
  }, [pathname, scene, setScene]);

  useEffect(() => {
    if (scene.type === 'replay' && scene.id) {
      const replayData = {
        memoryId: scene.id,
        emotionalWeight: Math.random(),
        timestamp: Date.now(),
      }
      setReplayData(replayData)
    }
    console.log(`SCENE LOADED: ${scene.type}`)
  }, [scene, setReplayData])

  const ActiveScene = SceneComponents[scene.type]

  return (
    <>
      <ResponsiveCamera />
      {ActiveScene && (scene.type === 'replay' && scene.id ? <ReplayScene id={scene.id} /> : <ActiveScene />)}
    </>
  )
}
