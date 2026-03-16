"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function CoreDistortion() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!)

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      toneMapped: false,

      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#ffe7bf") },
        uHotColor: { value: new THREE.Color("#ffffff") },
      },

      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);

          vWorldPos = worldPos.xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vViewDir = normalize(cameraPosition - worldPos.xyz);

          gl_Position =
            projectionMatrix *
            viewMatrix *
            worldPos;
        }
      `,

      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uHotColor;

        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float noise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);

          f = f * f * (3.0 - 2.0 * f);

          float n000 = hash(i + vec3(0.0, 0.0, 0.0));
          float n100 = hash(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash(i + vec3(1.0, 1.0, 1.0));

          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);

          float nxy0 = mix(nx00, nx10, f.y);
          float nxy1 = mix(nx01, nx11, f.y);

          return mix(nxy0, nxy1, f.z);
        }

        float fbm(vec3 p) {
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
          vec3 n = normalize(vWorldNormal);
          vec3 v = normalize(vViewDir);

          float fresnel = pow(1.0 - abs(dot(n, v)), 2.4);

          vec3 samplePos =
            normalize(vWorldPos) * 3.0 +
            vec3(0.0, 0.0, uTime * 0.12);

          float fieldA = fbm(samplePos * 1.2 + vec3(0.0, uTime * 0.08, 0.0));
          float fieldB = fbm(samplePos * 2.4 - vec3(uTime * 0.06, 0.0, 0.0));

          float turbulence = mix(fieldA, fieldB, 0.45);

          float pulse = 0.94 + sin(uTime * 1.7) * 0.06;
          float shell = smoothstep(0.15, 1.0, fresnel);
          float ripples = 0.82 + sin(turbulence * 9.0 - uTime * 1.8) * 0.18;

          float glow =
            shell *
            (0.35 + turbulence * 0.85) *
            ripples *
            pulse;

          float hotSpots =
            smoothstep(0.7, 1.0, turbulence) *
            shell *
            0.55;

          vec3 color = mix(uColor, uHotColor, hotSpots);

          float alpha = glow * 0.55 + hotSpots * 0.18;

          if (alpha < 0.01) discard;

          gl_FragColor = vec4(color * (glow + hotSpots * 0.7), alpha);
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
    <mesh>
      <sphereGeometry args={[80, 64, 64]} />
      <primitive
        object={material}
        ref={materialRef}
        attach="material"
      />
    </mesh>
  )
}