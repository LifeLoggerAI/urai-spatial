"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function NebulaBackground() {
  const materialRef = useRef<any>();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <mesh scale={[500, 500, 1]} position={[0, 0, -200]}>
      <planeGeometry />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTime: { value: 0 }
        }}
        fragmentShader={`
          uniform float uTime;
          void main() {
            vec2 uv = gl_FragCoord.xy / vec2(1920.0,1080.0);
            float noise = sin(uv.x*10.0 + uTime*0.2) * cos(uv.y*10.0 + uTime*0.3);
            float nebula = smoothstep(0.2, 0.8, noise);
            gl_FragColor = vec4(vec3(nebula * 0.08, nebula * 0.02, nebula * 0.15), 1.0);
          }
        `}
      />
    </mesh>
  );
}
