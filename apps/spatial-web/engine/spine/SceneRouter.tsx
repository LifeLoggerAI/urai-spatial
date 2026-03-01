'use client'

import { useSceneStore } from '../state/useSceneStore'
import LifeMapScene from '../scenes/LifeMapScene'
import HomeScene from '../scenes/Home'

export default function SceneRouter() {
  const scene = useSceneStore((s) => s.scene)

  if (scene === 'home') {
    return <HomeScene />
  }

  if (scene === 'lifemap') {
    return <LifeMapScene />
  }

  return null
}
