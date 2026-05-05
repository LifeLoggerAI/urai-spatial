"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import useDepthParallax from "./useDepthParallax";

export default function ShaderSky() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { x, y } = useDepthParallax();

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uParallax.value = new THREE.Vector2(x, y);
    }
  });

  return (
    <mesh scale={[20, 20, 1]}>
      <planeGeometry />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTime: { value: 0 },
          uParallax: { value: new THREE.Vector2(0, 0) },
        }}
        fragmentShader={`
          uniform float uTime;
          uniform vec2 uParallax;

          float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
          }

          void main() {
            vec2 uv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
            uv += uParallax * 0.05;

            float n = hash(uv * 100.0 + uTime * 0.1);
            float nebula = sin(uv.y * 6.0 + uTime * 0.4) * 0.1;

            vec3 color = vec3(
              0.02 + nebula + n * 0.05,
              0.05 + uv.y * 0.2,
              0.15 + sin(uTime * 0.2) * 0.05
            );

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}
