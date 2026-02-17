import { useThree, useFrame } from '@react-three/fiber'

export default function CinematicIdleCamera() {
  const { camera } = useThree()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    camera.position.x = Math.sin(t * 0.2) * 0.2
    camera.position.y = Math.cos(t * 0.15) * 0.15
    camera.lookAt(0, 0, 0)
  })

  return null
}
