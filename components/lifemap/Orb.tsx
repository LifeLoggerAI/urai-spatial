import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import orbVertex from "@/lib/lifemap/shaders/orbVertex.glsl"
import orbFragment from "@/lib/lifemap/shaders/orbFragment.glsl"

export default function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame(({ clock }) => {
    materialRef.current.uniforms.time.value = clock.elapsedTime
    const scale = 1.0 + 0.05 * Math.sin(clock.elapsedTime * 0.5)
    if (meshRef.current) {
      meshRef.current.scale.set(scale, scale, scale)
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1.5, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={orbVertex}
        fragmentShader={orbFragment}
        uniforms={{
          time: { value: 0 },
        }}
      />
    </mesh>
  )
}
