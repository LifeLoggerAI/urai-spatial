
import { useIdentityStore } from '../state/identity-store'
import HomeScene from '../scenes/HomeScene'
import LifeMapScene from '../scenes/LifeMapScene'
import ReplayScene from '../scenes/ReplayScene'

export default function SceneManager() {
  const currentScene = useIdentityStore((s) => s.currentScene)

  switch (currentScene) {
    case 'home':
      return <HomeScene />

    case 'lifemap':
      return <LifeMapScene />

    case 'replay':
      return <ReplayScene />

    default:
      return null
  }
}
