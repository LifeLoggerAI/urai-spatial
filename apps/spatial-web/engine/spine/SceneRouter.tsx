'use client'

import { useSceneStore } from '../state/useSceneStore'
import LifeMap from '../scenes/LifeMapScene'
import Home from '../scenes/Home'

export default function SceneRouter() {
  const scene = useSceneStore((s) => s.scene)

  if (scene === 'home') {
    return <Home />
  }

  if (scene === 'lifemap') {
    return <LifeMap />
  }

  return null
}
