import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function StableStars() {
  const ref = useRef<THREE.Points>(null!)

  const { positions } = useMemo(() => {
    const count = 4000
    const arr = new Float32Array(count * 3)

    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * 40
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40
      arr[i * 3 + 2] = (Math.random() - 0.5) * 40
    }

    return { positions: arr }
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.002
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={positions.length / 3}
          itemSize={3}
        />
      </bufferGeometry>

      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={{
          uColor: { value: new THREE.Color('#d9c8a3') }
        }}
        vertexShader={`
          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = 2.0 * (300.0 / -mvPosition.z);
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;

          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;

            float falloff = 1.0 - smoothstep(0.0, 0.5, d);
            gl_FragColor = vec4(uColor * falloff, falloff * 0.25);
          }
        `}
      />
    </points>
  )
}
