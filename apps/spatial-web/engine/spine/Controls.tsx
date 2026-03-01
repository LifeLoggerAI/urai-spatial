'use client'

import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

export default function Controls() {
  const { camera, gl } = useThree()

  return (
    <OrbitControls
      args={[camera, gl.domElement]}
      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      enableDamping={true}
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.8}

      // 🚀 FULL 360° UNLOCK
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}

      minDistance={5}
      maxDistance={600}
    />
  )
}