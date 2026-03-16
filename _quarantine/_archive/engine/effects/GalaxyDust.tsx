"use client"

import { useMemo, useRef, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const COUNT = 12000
const RADIUS = 450

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function GalaxyDust() {
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.time.value = state.clock.elapsedTime
    }
  })

  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(2026)

    const positions = new Float32Array(COUNT * 3)
    const scales = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const r = Math.sqrt(rand()) * RADIUS
      const theta = rand() * Math.PI * 2
      const y = (rand() - 0.5) * 80

      const x = Math.cos(theta) * r
      const z = Math.sin(theta) * r

      const i3 = i * 3
      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      scales[i] = 0.6 + rand() * 1.2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("aScale", new THREE.BufferAttribute(scales, 1))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      uniforms: {
        time: { value: 0 },
      },
      vertexShader: `
        uniform float time;
        attribute float aScale;
        varying float vRadius;
        varying float vAlpha;

        void main() {
          vec3 p = position;

          float swirl = sin(time * 0.4 + p.x * 0.02) * 4.0;
          float drift = cos(time * 0.3 + p.z * 0.02) * 4.0;

          p.x += swirl;
          p.z += drift;

          vRadius = length(p.xz);
          vAlpha = aScale;

          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);

          float size = aScale * (220.0 / max(1.0, -mvPosition.z));
          gl_PointSize = clamp(size, 0.8, 6.0);

          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vRadius;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          float particle = smoothstep(0.5, 0.0, d);
          float radialFalloff = smoothstep(520.0, 0.0, vRadius);

          vec3 color = vec3(0.6, 0.7, 1.0);
          float alpha = particle * radialFalloff * vAlpha * 0.16;

          gl_FragColor = vec4(color, alpha);
        }
      `,
    })

    return { geometry: geo, material: mat }
  }, [])

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <points geometry={geometry} frustumCulled={false}>
      <primitive object={material} ref={matRef} attach="material" />
    </points>
  )
}