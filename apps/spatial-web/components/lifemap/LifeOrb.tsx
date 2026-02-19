"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function LifeOrb() {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }) => {
    if (ref.current && ref.current.material) {
      (ref.current.material as THREE.ShaderMaterial).uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.7, 128, 128]} />
      <shaderMaterial
        transparent
        uniforms={{
          uTime: { value: 0 },
        }}
        vertexShader={`
          varying vec3 vNormal;
          void main() {
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uTime;
          varying vec3 vNormal;

          void main() {
            float pulse = 0.5 + 0.5 * sin(uTime * 2.0);
            float intensity = pow(0.8 - dot(vNormal, vec3(0.0,0.0,1.0)), 2.0);
            vec3 color = vec3(0.0, 0.6, 1.0) * intensity * pulse;
            gl_FragColor = vec4(color, intensity);
          }
        `}
      />
    </mesh>
  );
}
