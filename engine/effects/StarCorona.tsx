"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

const CORONA_COUNT = 900
const INNER_RADIUS = 120
const OUTER_RADIUS = 500

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default function StarCorona() {
  const matRef = useRef<THREE.ShaderMaterial>(null!)
  const { size } = useThree()

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const points = useMemo(() => {
    const rng = mulberry32(4242)

    const positions = new Float32Array(CORONA_COUNT * 3)
    const sizes = new Float32Array(CORONA_COUNT)
    const colors = new Float32Array(CORONA_COUNT * 3)

    const color = new THREE.Color()

    for (let i = 0; i < CORONA_COUNT; i++) {
      const i3 = i * 3

      const t = rng()
      const r = INNER_RADIUS + Math.pow(t, 0.68) * (OUTER_RADIUS - INNER_RADIUS)

      const u = rng()
      const v = rng()

      const theta = u * Math.PI * 2
      const zUnit = v * 2 - 1
      const xy = Math.sqrt(Math.max(0, 1 - zUnit * zUnit))

      const x = r * xy * Math.cos(theta)
      const y = r * xy * Math.sin(theta)
      const z = r * zUnit

      positions[i3] = x
      positions[i3 + 1] = y
      positions[i3 + 2] = z

      sizes[i] = 26 + rng() * 54

      color.setRGB(
        1.0,
        0.88 + rng() * 0.12,
        0.72 + rng() * 0.20
      )

      colors[i3] = color.r
      colors[i3 + 1] = color.g
      colors[i3 + 2] = color.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,

      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uViewportHeight: { value: size.height },
      },

      vertexShader: `
        attribute float size;

        uniform float uPixelRatio;
        uniform float uViewportHeight;

        varying vec3 vColor;
        varying float vDepth;

        void main() {
          vColor = color;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float depth = max(-mvPosition.z, 0.001);
          vDepth = depth;

          float perspective = uViewportHeight / depth;
          float spriteScale = clamp(perspective * 0.11, 0.6, 5.5);

          gl_PointSize = size * spriteScale * uPixelRatio;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,

      fragmentShader: `
        uniform float uTime;

        varying vec3 vColor;
        varying float vDepth;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);

          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));

          vec2 u = f * f * (3.0 - 2.0 * f);

          return mix(a, b, u.x)
               + (c - a) * u.y * (1.0 - u.x)
               + (d - b) * u.x * u.y;
        }

        void main() {
          vec2 uv = gl_PointCoord - vec2(0.5);
          float r = length(uv);

          if (r > 0.5) discard;

          float softCore = smoothstep(0.5, 0.0, r);
          float innerGlow = smoothstep(0.28, 0.0, r);

          float flicker = 0.94 + sin(uTime * 2.2 + r * 24.0) * 0.06;
          float turbulence = noise(uv * 6.0 + vec2(uTime * 0.22, -uTime * 0.14));
          float wisps = 0.76 + turbulence * 0.5;

          float corona = softCore * flicker * wisps;
          float alpha = corona * 0.42 + innerGlow * 0.22;

          vec3 col = vColor * (corona * 1.2 + innerGlow * 0.9);

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(col, alpha);
        }
      `,
    })

    return { geo, mat }
  }, [size.height])

  useEffect(() => {
    const mat = matRef.current
    if (!mat) return

    mat.uniforms.uViewportHeight.value = size.height
    mat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2)
  }, [size.height])

  useEffect(() => {
    return () => {
      points.geo.dispose()
      points.mat.dispose()
    }
  }, [points])

  return (
    <points geometry={points.geo} frustumCulled={false}>
      <primitive
        object={points.mat}
        ref={matRef}
        attach="material"
      />
    </points>
  )
}