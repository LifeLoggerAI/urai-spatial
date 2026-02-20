'use client';
/* eslint-disable react/no-unknown-property */
import { useFrame, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useRef } from 'react'

const NebulaMaterial = shaderMaterial(
  // Uniforms
  {
    uTime: 0,
    uColor1: new THREE.Color('#050a15'), // Deep space blue
    uColor2: new THREE.Color('#101525'), // Lighter nebula blue
    uNoiseScale: 2.5,
    uSeed: Math.random() * 1000,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uNoiseScale;
    uniform float uSeed;
    varying vec2 vUv;

    // 2D Random
    float random (vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233)) + uSeed) * 43758.5453123);
    }

    // 2D Noise
    float noise (vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);

        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));

        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) +
                (c - a)* u.y * (1.0 - u.x) +
                (d - b) * u.x * u.y;
    }

    void main() {
      vec2 st = vUv * uNoiseScale;
      st += uTime * 0.005; // Slow evolution over time
      float n = noise(st * 2.0);

      vec3 color = mix(uColor1, uColor2, n);

      // Add a subtle vignette
      float vignette = 1.0 - length(vUv - 0.5) * 1.1;
      color *= vignette;

      gl_FragColor = vec4(color, 1.0);
    }
  `
)

extend({ NebulaMaterial })

export default function ProceduralNebula() {
  const ref = useRef<THREE.ShaderMaterial>(null!)
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh position={[0, 0, -15]} scale={[60, 60, 1]}>
      <planeGeometry args={[1, 1]} />
      {/* @ts-ignore */}
      <nebulaMaterial ref={ref} />
    </mesh>
  )
}
