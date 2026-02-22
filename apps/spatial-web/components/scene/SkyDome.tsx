'use client'

import { BackSide } from 'three'
import { useMemo } from 'react'
import { ShaderMaterial } from 'three'

export default function SkyDome() {

  const material = useMemo(() => {
    return new ShaderMaterial({
      side: BackSide,
      uniforms: {
        topColor: { value: { r: 0.01, g: 0.05, b: 0.15 } },
        bottomColor: { value: { r: 0.0, g: 0.01, b: 0.03 } },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;

        void main() {
          float h = normalize(vWorldPosition).y;
          float mixFactor = smoothstep(-0.2, 0.8, h);
          gl_FragColor = vec4(mix(bottomColor, topColor, mixFactor), 1.0);
        }
      `,
    })
  }, [])

  return (
    <mesh>
      <sphereGeometry args={[200, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
