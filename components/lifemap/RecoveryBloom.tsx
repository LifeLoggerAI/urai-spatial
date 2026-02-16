import { useMemo, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { useLifeMapData, StarType } from "@/lib/lifemap/useLifeMapData"
import bloomVertex from "@/lib/lifemap/shaders/bloomVertex.glsl"
import bloomFragment from "@/lib/lifemap/shaders/bloomFragment.glsl"

export default function RecoveryBloom() {
  const { nodes } = useLifeMapData()
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const recoveryNodes = useMemo(() => {
    return nodes.filter((node) => node.type === StarType.RecoveryBloom)
  }, [nodes])

  useFrame(({ clock }) => {
    materialRef.current.uniforms.time.value = clock.elapsedTime
  })

  return (
    <>
      {recoveryNodes.map((node) => (
        <mesh key={node.id} position={node.position}>
          <sphereGeometry args={[5, 32, 32]} />
          <shaderMaterial
            ref={materialRef}
            vertexShader={bloomVertex}
            fragmentShader={bloomFragment}
            transparent
            uniforms={{
              time: { value: 0 },
            }}
          />
        </mesh>
      ))}
    </>
  )
}
