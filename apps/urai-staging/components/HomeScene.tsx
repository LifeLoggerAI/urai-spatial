"use client"

import { Canvas } from "@react-three/fiber"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

function Orb() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.3
    }
  })

  return (
    <mesh ref={ref} position={[0, -1.4, 0]}>
      <sphereGeometry args={[1.6, 64, 64]} />
      <meshStandardMaterial
        color="#e6edf3"
        emissive="#ffffff"
        emissiveIntensity={0.35}
        roughness={0.25}
      />
    </mesh>
  )
}

function Ground() {
  return (
    <mesh
      position={[0, -3.2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <circleGeometry args={[8, 64]} />
      <meshStandardMaterial color="#050505" />
    </mesh>
  )
}

function Sky({ onClick }: { onClick: () => void }) {
  return (
    <mesh position={[0, 3, -5]} onClick={onClick}>
      <planeGeometry args={[30, 18]} />
      <meshBasicMaterial color="#5f7f8c" />
    </mesh>
  )
}

export default function HomeScene() {
  const router = useRouter()

  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      gl={{ alpha: true }}
      style={{ width: "100vw", height: "100vh", background: "black" }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[3, 5, 5]} intensity={1.2} />

      <Sky onClick={() => router.push("/life-map")} />
      <Ground />
      <Orb />
    </Canvas>
  )
}