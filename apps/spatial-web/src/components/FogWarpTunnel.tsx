import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

interface FogWarpTunnelProps {
  active: boolean
}

export default function FogWarpTunnel({ active }: FogWarpTunnelProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!materialRef.current) return
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    materialRef.current.uniforms.uActive.value = active ? 1 : 0
  })

  return (
    <mesh position={[0, 0, -2]}>
      <planeGeometry args={[20, 20]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uActive: { value: 0 }
        }}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uActive;
          varying vec2 vUv;

          void main() {
            vec2 uv = vUv - 0.5;
            float dist = length(uv);

            float angle = atan(uv.y, uv.x);
            float swirl = sin(angle * 6.0 + uTime * 4.0) * 0.1;

            float radial = smoothstep(0.5, 0.0, dist);
            float intensity = radial * (0.6 + swirl);

            intensity *= uActive;

            gl_FragColor = vec4(vec3(0.6,0.8,1.0) * intensity, intensity);
          }
        `}
      />
    </mesh>
  )
}
