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
import Environment from '@/components/scene/Environment'
import EmotionalLighting from '@/components/scene/EmotionalLighting'

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
    const pathSegments = pathname.split('/').filter(Boolean);
    const sceneType = pathSegments[0] || 'home';
    const sceneId = pathSegments[1];

    if (sceneType === 'replay' || (sceneType === 'lifemap' && sceneId)) {
        setScene({ type: 'replay', id: sceneId });
    } else if (SceneComponents[sceneType]) {
        setScene({ type: sceneType });
    } else {
        setScene({ type: 'home' }); // Fallback for unknown routes
    }
  }, [pathname, setScene]);

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
      <Environment />
      <EmotionalLighting />
      {ActiveScene && (scene.type === 'replay' && scene.id ? <ReplayScene id={scene.id} /> : <ActiveScene />)}
    </>
  )
}
