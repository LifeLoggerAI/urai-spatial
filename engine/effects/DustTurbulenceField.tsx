"use client"

import * as THREE from "three"
import { useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"

const COUNT = 12000
const SPREAD_XZ = 900
const SPREAD_Y = 160

function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453123
  return x - Math.floor(x)
}

export default function DustTurbulenceField() {
  const pointsRef = useRef<THREE.Points>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    const size = new Float32Array(COUNT)
    const offset = new Float32Array(COUNT)

    for (let i = 0; i < COUNT; i++) {
      const rx = rand(i * 3 + 1)
      const ry = rand(i * 3 + 2)
      const rz = rand(i * 3 + 3)

      pos[i * 3] = (rx - 0.5) * SPREAD_XZ
      pos[i * 3 + 1] = (ry - 0.5) * SPREAD_Y
      pos[i * 3 + 2] = (rz - 0.5) * SPREAD_XZ

      size[i] = rand(i * 11 + 7) * 2.2 + 0.5
      offset[i] = rand(i * 17 + 5) * Math.PI * 2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
    geo.setAttribute("size", new THREE.BufferAttribute(size, 1))
    geo.setAttribute("offset", new THREE.BufferAttribute(offset, 1))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointScale: { value: 260.0 },
      uAlpha: { value: 0.42 },
    }),
    []
  )

  useFrame(({ clock }) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = clock.elapsedTime
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        depthTest={true}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float size;
          attribute float offset;

          uniform float uTime;
          uniform float uPointScale;

          varying float vHeight;
          varying float vDepthFade;

          void main() {
            vec3 p = position;

            // Mild drifting turbulence
            p.x += sin(uTime * 0.18 + offset + p.z * 0.01) * 2.5;
            p.y += sin(uTime * 0.25 + offset * 1.7 + p.x * 0.02) * 1.2;
            p.z += cos(uTime * 0.16 + offset + p.x * 0.01) * 2.0;

            vHeight = abs(p.y);

            vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
            float dist = max(-mvPosition.z, 1.0);

            float pointSize = size * (uPointScale / dist);
            gl_PointSize = clamp(pointSize, 0.6, 8.0);

            // Softer far fade to reduce overload
            vDepthFade = smoothstep(900.0, 120.0, dist);

            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={`
          uniform float uAlpha;

          varying float vHeight;
          varying float vDepthFade;

          float circle(vec2 uv) {
            float d = length(uv - 0.5);
            return smoothstep(0.5, 0.0, d);
          }

          void main() {
            float dust = circle(gl_PointCoord);

            float planeDensity = smoothstep(180.0, 0.0, vHeight);
            float alpha = dust * planeDensity * vDepthFade * uAlpha;

            // Soft warm-gray dust
            vec3 color = vec3(0.8, 0.78, 0.75);

            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </points>
  )
}