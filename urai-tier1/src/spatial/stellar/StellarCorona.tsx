"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/** Camera-facing plasma plumes, depth-tested against the actual stellar surface. */
export default function StellarCorona({ radius, color, reducedMotion, intensity = 1 }: {
  radius: number;
  color: string;
  reducedMotion: boolean;
  intensity?: number;
}) {
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 centerView = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec2 worldScale = vec2(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz));
        centerView.xy += position.xy * worldScale;
        gl_Position = projectionMatrix * centerView;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - 0.5) * 2.0;
        float radius = length(p);
        float angle = atan(p.y, p.x);
        float time = uTime * 0.045;
        float plume = 0.5 + 0.5 * sin(angle * 7.0 + sin(angle * 13.0 - time) * 1.8 + time);
        float fine = 0.5 + 0.5 * sin(angle * 31.0 + sin(angle * 19.0 + time) * 2.4);
        float reach = 0.055 + pow(plume, 3.0) * 0.23 + fine * 0.035;
        float outside = max(0.0, radius - 0.49);
        float envelope = exp(-outside / reach * 3.8);
        float filaments = 0.18 + pow(fine, 5.0) * 0.82;
        float alpha = smoothstep(0.43, 0.50, radius) * envelope * filaments;
        alpha *= 1.0 - smoothstep(0.83, 1.0, radius);
        if (alpha < 0.003) discard;
        vec3 warm = mix(vec3(1.0, 0.42, 0.075), vec3(1.0, 0.83, 0.39), envelope);
        warm = mix(warm, uColor, 0.08);
        gl_FragColor = vec4(warm * uIntensity, alpha * 0.74);
        #include <colorspace_fragment>
      }
    `,
  }), [color, intensity]);
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }) => { material.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime; });
  return (
    <mesh name="stellar-irregular-corona-plumes" raycast={() => null}>
      <planeGeometry args={[radius * 4, radius * 4]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
