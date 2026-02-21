'use client'

import { usePathname } from 'next/navigation'
import HomeScene from './scene/HomeScene'
import LifeMapCanvas from './lifemap/LifeMapCanvas'
import GroundScene from './ground/GroundScene'

export default function SceneManager() {
  const pathname = usePathname()

  if (pathname === '/' || pathname === '/home') {
    return <HomeScene />
  } else if (pathname === '/lifemap') {
    return <LifeMapCanvas />
  } else if (pathname === '/ground') {
    return <GroundScene />
  } else if (pathname.startsWith('/lifemap/')) {
    // For now, we don't render a specific 3D scene for the replay page
    return null
  }

  return <HomeScene />
}
