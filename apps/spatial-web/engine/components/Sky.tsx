'use client'

import * as THREE from 'three'
import { useMemo } from 'react'
import { ThreeEvent } from '@react-three/fiber'

export default function Sky({ onClick }: { onClick?: () => void }) {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          vec3 top = vec3(0.02,0.05,0.15);
          vec3 horizon = vec3(0.08,0.12,0.25);
          vec3 col = mix(horizon, top, h);
          gl_FragColor = vec4(col,1.0);
        }
      `
    })
  }, [])

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()

    // Only trigger if click point is ABOVE horizon
    if (e.point.y > 2.5) {
      onClick?.()
    }
  }

  return (
    <mesh onClick={handleClick}>
      <sphereGeometry args={[200, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
