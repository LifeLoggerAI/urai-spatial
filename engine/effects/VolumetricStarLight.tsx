"use client"

import * as THREE from "three"
import { useMemo } from "react"

const RADIUS = 2
const HEIGHT = 40
const SEGMENTS = 32

export default function VolumetricStarLight() {
  const geometry = useMemo(() => {
    const g = new THREE.ConeGeometry(RADIUS, HEIGHT, SEGMENTS, 1, true)

    // Move origin to beam base so the mesh anchors at its source point.
    g.translate(0, -HEIGHT * 0.5, 0)

    return g
  }, [])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        color: { value: new THREE.Color("#cfe6ff") },
        beamHeight: { value: HEIGHT },
        opacity: { value: 0.06 },
      },
      vertexShader: `
        varying float vY;

        void main() {
          vY = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float beamHeight;
        uniform float opacity;
        varying float vY;

        void main() {
          float baseY = -beamHeight * 0.5;
          float tipY = 0.0;

          float fade = smoothstep(baseY, tipY, vY);

          // Slight soft falloff so the tip is not too harsh.
          fade = pow(fade, 1.35);

          gl_FragColor = vec4(color, fade * opacity);
        }
      `,
    })
  }, [])

  return (
    <mesh
      geometry={geometry}
      rotation-x={Math.PI / 2}
      frustumCulled={false}
    >
      <primitive object={material} attach="material" />
    </mesh>
  )
}