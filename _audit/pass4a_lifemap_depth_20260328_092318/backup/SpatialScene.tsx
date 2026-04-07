import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState } from 'react'

function CameraController({ phase, transition, onTransitionComplete }) {
  const { camera } = useThree()

  const HOME_POS = new THREE.Vector3(0, 1.6, 6)
  const HOME_LOOK = new THREE.Vector3(0, 1.2, 0)

  const LIFEMAP_POS = new THREE.Vector3(0, 0, 0)
  const LIFEMAP_LOOK = new THREE.Vector3(0, 0, -5)

  const t = useRef(0)

  useFrame((_, delta) => {
    if (transition === 'ASCENT') {
      t.current += delta / 2 // ~2s duration

      const clamped = Math.min(t.current, 1)

      const pos = HOME_POS.clone().lerp(LIFEMAP_POS, clamped)
      const look = HOME_LOOK.clone().lerp(LIFEMAP_LOOK, clamped)

      camera.position.copy(pos)
      camera.lookAt(look)

      if (clamped >= 1) {
        onTransitionComplete()
        t.current = 0
      }
    } else if (phase === 'HOME') {
      camera.position.lerp(HOME_POS, 0.05)
      camera.lookAt(HOME_LOOK)
    } else if (phase === 'LIFEMAP') {
      camera.position.lerp(LIFEMAP_POS, 0.05)
      camera.lookAt(LIFEMAP_LOOK)
    }
  })

  return null
}

function SkyClickLayer({ onClick, enabled }) {
  return (
    <mesh
      position={[0, 0, -10]}
      onClick={enabled ? onClick : undefined}
    >
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

export default function SpatialScene() {
  const [phase, setPhase] = useState('HOME')
  const [transition, setTransition] = useState('IDLE')
  const [inputLocked, setInputLocked] = useState(false)

  const startAscent = () => {
    if (inputLocked || phase !== 'HOME') return
    setInputLocked(true)
    setTransition('ASCENT')
  }

  const completeAscent = () => {
    setPhase('LIFEMAP')
    setTransition('IDLE')
    setInputLocked(false)
  }

  return (
    <Canvas camera={{ position: [0, 1.6, 6], fov: 50 }}>
      <CameraController
        phase={phase}
        transition={transition}
        onTransitionComplete={completeAscent}
      />

      <SkyClickLayer onClick={startAscent} enabled={!inputLocked} />

      {/* Existing scene content remains here */}
    </Canvas>
  )
}
