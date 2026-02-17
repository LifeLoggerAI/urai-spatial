"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Points, PointMaterial, OrbitControls, Stars } from "@react-three/drei"
import { useRef, useMemo, useEffect } from "react"
import * as THREE from "three"
import gsap from "gsap"
import { XR, VRButton } from "@react-three/xr"

function Starfield() {
  const ref = useRef<THREE.Points>(null!)

  const positions = useMemo(() => {
    const count = 1500
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 50
      arr[i * 3 + 1] = (Math.random() - 0.5) * 50
      arr[i * 3 + 2] = (Math.random() - 0.5) * 50
    }
    return arr
  }, [])

  useFrame(() => {
    ref.current.rotation.y += 0.0005
  })

  return (
    <Points ref={ref} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.05}
        sizeAttenuation
        depthWrite={false}
      />
    </Points>
  )
}

function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const scale = 1 + Math.sin(t * 1.5) * 0.05
    meshRef.current.scale.set(scale, scale, scale)
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.2, 64, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#66ccff"
        emissiveIntensity={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

function CameraRig() {
  const { camera } = useThree()

  useEffect(() => {
    gsap.timeline()
      .to(camera.position, {
        z: 3,
        duration: 2,
        ease: "power2.inOut",
      })
      .to(camera.position, {
        z: -20,
        duration: 2,
        ease: "power4.in",
      })
  }, [camera])

  return null
}

export default function XRCanvas() {
  return (
    <div className="w-screen h-screen bg-black">
      <VRButton />
      <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
        <XR>
          <CameraRig />
          <ambientLight intensity={0.3} />
          <Starfield />
          <Orb />
          
        </XR>
      </Canvas>
    </div>
  )
}
