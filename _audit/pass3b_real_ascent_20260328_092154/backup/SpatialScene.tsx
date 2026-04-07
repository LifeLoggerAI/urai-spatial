import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef } from 'react'

function CameraController() {
  const { camera } = useThree()

  const targetPos = useRef(new THREE.Vector3(0, 1.6, 6))
  const targetLook = useRef(new THREE.Vector3(0, 1.2, 0))

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, 1 - Math.pow(0.01, delta))
    camera.lookAt(targetLook.current)
  })

  return null
}

export default function SpatialScene() {
  return (
    <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }}>
      <CameraController />
      {/* KEEP YOUR EXISTING CONTENT BELOW */}
    </Canvas>
  )
}
