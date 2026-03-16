"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function DustLanes() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
      toneMapped: false,

      uniforms: {
        uTime: { value: 0 },
      },

      vertexShader: `
        varying vec3 vPos;
        varying vec2 vUv;

        void main() {
          vPos = position;
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        varying vec3 vPos;
        varying vec2 vUv;

        uniform float uTime;

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

        float fbm(vec2 p) {
          float value = 0.0;
          float amp = 0.5;

          for (int i = 0; i < 4; i++) {
            value += noise(p) * amp;
            p *= 2.0;
            amp *= 0.5;
          }

          return value;
        }

        void main() {
          vec2 p = vPos.xz;

          float r = length(p);
          float a = atan(p.y, p.x);

          float warpedA =
            a +
            sin(r * 0.012 - uTime * 0.04) * 0.18 +
            fbm(p * 0.008 + vec2(uTime * 0.01, -uTime * 0.008)) * 0.35;

          float spiralWave =
            sin(warpedA * 4.0 + r * 0.038 - uTime * 0.06);

          float armMask =
            smoothstep(0.18, 0.72, spiralWave);

          float laneWidth =
            1.0 - smoothstep(0.0, 0.42, abs(spiralWave));

          float breakup =
            fbm(p * 0.018 + vec2(uTime * 0.015, uTime * 0.01));

          float clumps =
            noise(p * 0.045 - vec2(uTime * 0.01, -uTime * 0.012));

          float innerFade =
            smoothstep(70.0, 170.0, r);

          float outerFade =
            1.0 - smoothstep(240.0, 500.0, r);

          float radialBand = innerFade * outerFade;

          float dust =
            armMask *
            laneWidth *
            radialBand *
            (0.55 + breakup * 0.55) *
            (0.75 + clumps * 0.35);

          float alpha = dust * 0.34;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(vec3(0.0), alpha);
        }
      `,
    })
  }, [])

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[500, 128]} />
      <primitive
        object={material}
        ref={materialRef}
        attach="material"
      />
    </mesh>
  )
}