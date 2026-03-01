'use client'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'
import SceneRouter from './SceneRouter'
import { useSceneStore } from '../state/useSceneStore'

function TransitionController() {
  const { camera } = useThree()

  const scene = useSceneStore((s) => s.scene)
  const startTime = useSceneStore((s) => s.transitionStartTime)
  const setScene = useSceneStore((s) => s.setScene)

  const duration = 1200

  const startPos = new THREE.Vector3(0, 0, 120)
  const endPos = new THREE.Vector3(0, 32, 0)

  const startLook = new THREE.Vector3(0, 0, 0)
  const endLook = new THREE.Vector3(0, 20, -30)

  const startFov = 40
  const endFov = 40

  useFrame(() => {
    if (scene !== 'transition' || !startTime) return

    const elapsed = performance.now() - startTime
    const t = Math.min(elapsed / duration, 1)

    const eased =
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2

    camera.position.lerpVectors(startPos, endPos, eased)

    const currentLook = new THREE.Vector3().lerpVectors(
      startLook,
      endLook,
      eased
    )

    camera.lookAt(currentLook)

    camera.fov = THREE.MathUtils.lerp(startFov, endFov, eased)
    camera.updateProjectionMatrix()

    if (t === 1) {
      setScene('lifemap')
    }
  })

  return (
    <OrbitControls
      makeDefault

      /* FULL 360 */
      minPolarAngle={0}
      maxPolarAngle={Math.PI}
      minAzimuthAngle={-Infinity}
      maxAzimuthAngle={Infinity}

      enablePan={false}
      enableZoom={true}
      enableRotate={true}
      enableDamping
      dampingFactor={0.08}

      /* ONLY disable during transition */
      enabled={scene !== 'transition'}
    />
  )
}

export default function EngineSpine() {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      camera={{
        position: [0, 0, 120], // <-- FIXED BASELINE
        fov: 40,
      }}
    >
      <ambientLight intensity={0.2} />

      <directionalLight
        position={[10, 20, 15]}
        intensity={1.2}
        color="#bcdcff"
        castShadow
      />

      <TransitionController />

      <SceneRouter />
    </Canvas>
  )
}