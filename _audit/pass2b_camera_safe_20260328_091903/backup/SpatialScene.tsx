import { Canvas } from '@react-three/fiber'
import { useCameraController } from '../hooks/useCameraController'
import HomeEnvironment from '../environment/HomeEnvironment'
import Starfield from '../space/Starfield'
import { useCanonState } from '@/lib/uraiCanon/useCanonState'

function SceneContent() {
  useCameraController()
  const { phase } = useCanonState()

  return (
    <>
      {phase === 'HOME' && <HomeEnvironment />}
      {phase !== 'HOME' && <Starfield />}
    </>
  )
}

export default function SpatialScene() {
  return (
    <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }}>
      <SceneContent />
    </Canvas>
  )
}
