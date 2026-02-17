import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import * as THREE from "three"
import { useRef } from "react"

function BreathingOrb() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const scale = 1 + Math.sin(t * 1.2) * 0.04
    ref.current.scale.set(scale, scale, scale)
  })

  return (
    <mesh ref={ref} position={[0, 2.2, 0]}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshPhysicalMaterial
        color="#88ddee"
        emissive="#bb88ff"
        emissiveIntensity={0.5}
        roughness={0.2}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0}
      />
    </mesh>
  )
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#0a0f1e" />
    </mesh>
  )
}

function Avatar() {
  return (
    <mesh position={[0, 1, -3]}>
      <capsuleGeometry args={[0.4, 1.6, 8, 16]} />
      <meshStandardMaterial color="#111827" />
    </mesh>
  )
}

function FloatingCamera() {
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    state.camera.position.y = 2.5 + Math.sin(t * 0.4) * 0.05
  })
  return null
}

export default function LifeMapScene() {
  return (
    <Canvas
      camera={{ position: [0, 2.5, 7], fov: 50 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#05070d"]} />

      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} />

      {/* Deep layered stars */}
      <Stars radius={150} depth={60} count={6000} factor={4} fade speed={0.3} />
      <Stars radius={80} depth={30} count={3000} factor={6} fade speed={0.6} />

      <BreathingOrb />
      <Avatar />
      <Ground />
      <FloatingCamera />

      <OrbitControls enableZoom={false} />
    </Canvas>
  )
}
