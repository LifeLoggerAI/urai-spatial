"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function GalacticCore() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,

      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color("#6fa8ff") },
        uColorB: { value: new THREE.Color("#ffffff") },
        uColorC: { value: new THREE.Color("#9fd0ff") },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        varying vec2 vUv;

        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;

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
          vec2 p = vUv * 2.0 - 1.0;

          float r = length(p);
          float a = atan(p.y, p.x);

          float swirl1 = sin(a * 6.0 - uTime * 1.1 + r * 10.0) * 0.5 + 0.5;
          float swirl2 = sin(a * 11.0 + uTime * 0.8 - r * 14.0) * 0.5 + 0.5;

          float n1 = noise(p * 4.5 + vec2(uTime * 0.08, -uTime * 0.06));
          float n2 = noise(p * 8.0 + vec2(-uTime * 0.05, uTime * 0.04));

          float core = smoothstep(0.42, 0.0, r);
          float halo = smoothstep(1.0, 0.18, r);
          float rim = smoothstep(0.75, 0.28, r) - smoothstep(0.28, 0.0, r);

          float textureField =
            mix(swirl1, swirl2, 0.5) * 0.45 +
            n1 * 0.35 +
            n2 * 0.20;

          float pulse = 0.94 + sin(uTime * 1.6) * 0.06;

          float glow =
            core * (1.15 + textureField * 0.9) * pulse +
            halo * 0.28 +
            rim * textureField * 0.25;

          vec3 color =
            mix(uColorA, uColorC, clamp(textureField, 0.0, 1.0));

          color = mix(color, uColorB, core * 0.9);

          float alpha =
            glow * smoothstep(1.02, 0.0, r) * 0.62;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(color * glow, alpha);
        }
      `,
    })
  }, [])

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }

    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.035
      meshRef.current.rotation.y += delta * 0.12
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh ref={meshRef} scale={120}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive
        object={material}
        ref={materialRef}
        attach="material"
      />
    </mesh>
  )
}"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function GalacticCore() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,

      uniforms: {
        uTime: { value: 0 },
        uColorA: { value: new THREE.Color("#6fa8ff") },
        uColorB: { value: new THREE.Color("#ffffff") },
        uColorC: { value: new THREE.Color("#9fd0ff") },
      },

      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        varying vec2 vUv;

        uniform float uTime;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        uniform vec3 uColorC;

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
          vec2 p = vUv * 2.0 - 1.0;

          float r = length(p);
          float a = atan(p.y, p.x);

          float swirl1 = sin(a * 6.0 - uTime * 1.1 + r * 10.0) * 0.5 + 0.5;
          float swirl2 = sin(a * 11.0 + uTime * 0.8 - r * 14.0) * 0.5 + 0.5;

          float n1 = noise(p * 4.5 + vec2(uTime * 0.08, -uTime * 0.06));
          float n2 = noise(p * 8.0 + vec2(-uTime * 0.05, uTime * 0.04));

          float core = smoothstep(0.42, 0.0, r);
          float halo = smoothstep(1.0, 0.18, r);
          float rim = smoothstep(0.75, 0.28, r) - smoothstep(0.28, 0.0, r);

          float textureField =
            mix(swirl1, swirl2, 0.5) * 0.45 +
            n1 * 0.35 +
            n2 * 0.20;

          float pulse = 0.94 + sin(uTime * 1.6) * 0.06;

          float glow =
            core * (1.15 + textureField * 0.9) * pulse +
            halo * 0.28 +
            rim * textureField * 0.25;

          vec3 color =
            mix(uColorA, uColorC, clamp(textureField, 0.0, 1.0));

          color = mix(color, uColorB, core * 0.9);

          float alpha =
            glow * smoothstep(1.02, 0.0, r) * 0.62;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(color * glow, alpha);
        }
      `,
    })
  }, [])

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }

    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.035
      meshRef.current.rotation.y += delta * 0.12
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh ref={meshRef} scale={120}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <primitive
        object={material}
        ref={materialRef}
        attach="material"
      />
    </mesh>
  )
}