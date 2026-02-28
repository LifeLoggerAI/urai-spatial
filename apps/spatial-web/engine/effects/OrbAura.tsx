'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

const vertexShader = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  varying vec3 vNormal;
  uniform float uTime;
  uniform vec3 uColor;

  void main() {
    float intensity = pow(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    float flicker = 1.0 + sin(uTime * 3.0) * 0.05;
    gl_FragColor = vec4(uColor, intensity * flicker * 0.4);
  }
`

export default function OrbAura() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh>
      <sphereGeometry args={[2.2, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uTime: { value: 0 },
          uColor: { value: new THREE.Color('#8fb5ff') },
        }}
        transparent
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
      />
    </mesh>
  )
}
