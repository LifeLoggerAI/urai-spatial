'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useSceneModeStore } from '../state/useSceneModeStore'

export default function CameraController() {
  const { camera } = useThree()
  const mode = useSceneModeStore((s) => s.mode)

  const drift = useRef(0)

  // Stable reusable vectors (prevents GC spikes)
  const center = useMemo(() => new THREE.Vector3(0, 3, 0), [])

  useFrame((state, delta) => {
    drift.current += delta * 0.05

    if (mode === 'HOME') {
      const x = Math.sin(drift.current) * 0.2
      const y = 6 + Math.sin(drift.current * 0.5) * 0.1
      const z = 14 + Math.cos(drift.current * 0.7) * 0.15

      const newPos = new THREE.Vector3(x, y, z)
      camera.position.lerp(newPos, 0.04)
      camera.lookAt(center)
    }
  })

  return null
}
