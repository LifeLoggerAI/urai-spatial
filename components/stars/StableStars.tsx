'use client'

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

const STAR_COUNT = 4000

function seededRandom(seed: number) {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export default function StableStars() {
  const pointsRef = useRef<THREE.Points | null>(null)

  const positions = useMemo(() => {
    const rand = seededRandom(98765)
    const arr = new Float32Array(STAR_COUNT * 3)

    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3 + 0] = (rand() - 0.5) * 40
      arr[i * 3 + 1] = (rand() - 0.5) * 40
      arr[i * 3 + 2] = (rand() - 0.5) * 40
    }

    return arr
  }, [])

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color('#d9c8a3') },
      uSize: { value: 2.0 },
      uOpacity: { value: 0.25 }
    }),
    []
  )

  useFrame((_, delta) => {
    const points = pointsRef.current
    if (!points) return

    points.rotation.y += delta * 0.002
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          array={positions}
          count={STAR_COUNT}
          itemSize={3}
        />
      </bufferGeometry>

      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending}
        uniforms={uniforms}
        vertexShader={`
          uniform float uSize;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (300.0 / max(-mvPosition.z, 0.1));
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform float uOpacity;

          void main() {
            vec2 uv = gl_PointCoord - vec2(0.5);
            float d = length(uv);

            if (d > 0.5) discard;

            float falloff = 1.0 - smoothstep(0.0, 0.5, d);
            gl_FragColor = vec4(uColor * falloff, falloff * uOpacity);
          }
        `}
      />
    </points>
  )
}