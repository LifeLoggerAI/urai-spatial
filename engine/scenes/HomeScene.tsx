import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useRouter } from 'next/navigation'

function Ground({ onClick }: { onClick: () => void }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, 0]}
      onClick={onClick}
      onPointerOver={(e) => (document.body.style.cursor = 'pointer')}
      onPointerOut={(e) => (document.body.style.cursor = 'default')}
    >
      <planeGeometry args={[30, 30]} />
      <meshStandardMaterial color="#0f2e0f" />
    </mesh>
  )
}

function Sky({ onClick }: { onClick: () => void }) {
  return (
    <mesh 
      position={[0, 5, -10]} 
      onClick={onClick}
      onPointerOver={(e) => (document.body.style.cursor = 'pointer')}
      onPointerOut={(e) => (document.body.style.cursor = 'default')}
    >
      <sphereGeometry args={[40, 64, 64]} />
      <meshBasicMaterial color="#000000" side={THREE.BackSide} />
    </mesh>
  )
}

function Orb({ onClick }: { onClick: () => void }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    ref.current.position.y = 0.8 + Math.sin(t * 0.8) * 0.1
    ref.current.rotation.y += 0.002

    const mat = ref.current.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.7 + Math.sin(t * 1.2) * 0.1
  })

  return (
    <mesh 
      ref={ref} 
      position={[0, 0.8, 0]} 
      onClick={onClick}
      onPointerOver={(e) => (document.body.style.cursor = 'pointer')}
      onPointerOut={(e) => (document.body.style.cursor = 'default')}
    >
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshStandardMaterial
        color="#1e3a8a"
        emissive="#1e3a8a"
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

export default function HomeScene() {
  const router = useRouter()

  return (
    <>
      {/* Atmosphere */}
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 6, 18]} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 5, 2]} intensity={1} />

      <Sky onClick={() => router.push('/lifemap')} />
      <Ground onClick={() => router.push('/ground')} />
      <Orb onClick={() => router.push('/chat')} />
    </>
  )
}
