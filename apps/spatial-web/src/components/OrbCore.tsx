import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

interface OrbCoreProps {
  emotionalIntensity?: number
  active?: boolean
}

export default function OrbCore({
  emotionalIntensity = 0.6,
  active = true
}: OrbCoreProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame(({ clock }) => {
    if (!materialRef.current) return

    const time = clock.getElapsedTime()

    materialRef.current.uniforms.uTime.value = time
    materialRef.current.uniforms.uIntensity.value = emotionalIntensity
    materialRef.current.uniforms.uActive.value = active ? 1 : 0
  })

  return (
    <mesh>
      <sphereGeometry args={[1.2, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        transparent
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
          uIntensity: { value: emotionalIntensity },
          uActive: { value: 1 }
        }}
        vertexShader={`
          uniform float uTime;
          uniform float uIntensity;
          varying vec3 vNormal;

          void main() {
            vNormal = normal;

            float pulse = sin(uTime * 2.0) * 0.1 * uIntensity;
            vec3 newPosition = position + normal * pulse;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          uniform float uIntensity;
          uniform float uActive;
          varying vec3 vNormal;

          void main() {
            float glow = pow(1.0 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.0);

            float breath = 0.6 + sin(uTime * 2.0) * 0.2;

            vec3 baseColor = mix(
              vec3(0.3,0.6,1.0),
              vec3(1.0,0.4,0.6),
              uIntensity
            );

            vec3 color = baseColor * breath * uActive;

            gl_FragColor = vec4(color + glow * 0.5, 1.0);
          }
        `}
      />
    </mesh>
  )
}
