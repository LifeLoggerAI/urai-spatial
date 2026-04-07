import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useRef, useState, useMemo } from 'react'

/* =========================
   CAMERA CONTROLLER
========================= */

function CameraController({ phase, transition, onTransitionComplete }) {
  const { camera } = useThree()

  const HOME_POS = new THREE.Vector3(0, 1.6, 6)
  const HOME_LOOK = new THREE.Vector3(0, 1.2, 0)

  const LIFEMAP_POS = new THREE.Vector3(0, 0, 2)
  const LIFEMAP_LOOK = new THREE.Vector3(0, 0, -10)

  const t = useRef(0)

  useFrame((_, delta) => {
    if (transition === 'ASCENT') {
      t.current += delta / 2
      const k = Math.min(t.current, 1)

      camera.position.lerpVectors(HOME_POS, LIFEMAP_POS, k)
      const look = HOME_LOOK.clone().lerp(LIFEMAP_LOOK, k)
      camera.lookAt(look)

      if (k >= 1) {
        t.current = 0
        onTransitionComplete()
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

/* =========================
   STARFIELD SYSTEM
========================= */

function generateStars(count, spread, zRange, sizeRange) {
  const arr = []

  for (let i = 0; i < count; i++) {
    arr.push({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        THREE.MathUtils.lerp(zRange[0], zRange[1], Math.random())
      ),
      size: THREE.MathUtils.lerp(sizeRange[0], sizeRange[1], Math.random()),
      intensity: Math.random()
    })
  }

  return arr
}

function Star({ data }) {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return

    const t = state.clock.elapsedTime
    const pulse = 1 + Math.sin(t * 2 + data.id) * 0.15

    ref.current.scale.setScalar(data.size * pulse)
  })

  return (
    <mesh position={data.position} ref={ref}>
      <sphereGeometry args={[0.05, 8, 8]} />
      <meshStandardMaterial
        emissive={'#88ccff'}
        emissiveIntensity={0.5 + data.intensity}
        color={'#ffffff'}
      />
    </mesh>
  )
}

function StarLayer({ stars }) {
  return (
    <>
      {stars.map((s) => (
        <Star key={s.id} data={s} />
      ))}
    </>
  )
}

function LifeMapField({ active }) {
  const near = useMemo(() => generateStars(80, 8, [-3, -6], [0.04, 0.08]), [])
  const mid = useMemo(() => generateStars(120, 20, [-10, -20], [0.05, 0.12]), [])
  const far = useMemo(() => generateStars(200, 40, [-30, -80], [0.02, 0.05]), [])

  if (!active) return null

  return (
    <>
      <StarLayer stars={far} />
      <StarLayer stars={mid} />
      <StarLayer stars={near} />
    </>
  )
}

/* =========================
   SKY CLICK
========================= */

function SkyClickLayer({ onClick, enabled }) {
  return (
    <mesh position={[0, 0, -10]} onClick={enabled ? onClick : undefined}>
      <planeGeometry args={[100, 100]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

/* =========================
   MAIN
========================= */

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
      <ambientLight intensity={0.3} />

      <CameraController
        phase={phase}
        transition={transition}
        onTransitionComplete={completeAscent}
      />

      <SkyClickLayer onClick={startAscent} enabled={!inputLocked} />

      <LifeMapField active={phase === 'LIFEMAP'} />
    </Canvas>
  )
}
