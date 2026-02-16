import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import fogVertex from "@/lib/lifemap/shaders/fogVertex.glsl"
import fogFragment from "@/lib/lifemap/shaders/fogFragment.glsl"

export default function CosmicFog() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame(({ clock }) => {
    materialRef.current.uniforms.time.value = clock.elapsedTime
  })

  return (
    <mesh position={[0, 0, -20]}>
      <planeGeometry args={[500, 500]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={fogVertex}
        fragmentShader={fogFragment}
        transparent
        uniforms={{
          time: { value: 0 }
        }}
      />
    </mesh>
  )
}
