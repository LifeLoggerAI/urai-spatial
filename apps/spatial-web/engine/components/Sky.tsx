'use client'
import * as THREE from 'three'
import { useMemo } from 'react'

export default function Sky() {
  const material = useMemo(() => {
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `

    const fragmentShader = `
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 top = vec3(0.02, 0.05, 0.12);
        vec3 horizon = vec3(0.05, 0.1, 0.2);
        vec3 bottom = vec3(0.01, 0.02, 0.05);

        vec3 color = mix(horizon, top, max(h, 0.0));
        color = mix(bottom, color, smoothstep(-0.3, 0.3, h));

        gl_FragColor = vec4(color, 1.0);
      }
    `

    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      side: THREE.BackSide,
    })
  }, [])

  return (
    <mesh>
      <sphereGeometry args={[400, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
