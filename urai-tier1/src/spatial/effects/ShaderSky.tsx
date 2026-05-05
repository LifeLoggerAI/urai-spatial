"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function ShaderSky() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <mesh scale={[20, 20, 1]}>
      <planeGeometry />
      <shaderMaterial
        ref={materialRef}
        uniforms={{ uTime: { value: 0 } }}
        fragmentShader={`
          uniform float uTime;
          void main() {
            vec2 uv = gl_FragCoord.xy / vec2(1920.0, 1080.0);
            float glow = sin(uv.y * 6.0 + uTime * 0.5) * 0.1;
            vec3 color = vec3(
              0.02 + glow,
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
