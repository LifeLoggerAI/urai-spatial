''''use client';

import * as THREE from 'three';
import React, { useRef } from 'react';
import { Sphere, shaderMaterial } from '@react-three/drei';
import { useFrame, extend } from '@react-three/fiber';
import { useSceneStore } from './engine/useSceneStore';

const OrbShaderMaterial = shaderMaterial(
  {
    uColor: new THREE.Color("#7dd3fc"),
    uGlow: 0.3,
  },
  // vertex shader
  /*glsl*/`
    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = vec3(modelViewMatrix * vec4(position, 1.0));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  /*glsl*/`
    uniform vec3 uColor;
    uniform float uGlow;

    varying vec3 vNormal;
    varying vec3 vPosition;

    void main() {
        float fresnel = dot(normalize(vPosition), vNormal);
        fresnel = pow(1.0 - fresnel, uGlow * 4.0 + 1.0);

        gl_FragColor = vec4(uColor * fresnel, fresnel);
    }
  `
);

extend({ OrbShaderMaterial });

export default function Orb() {
  const materialRef = useRef<THREE.ShaderMaterial>(null!);
  const { rhythmState, mentalLoad } = useSceneStore();

  const colorMap = {
    stable: new THREE.Color("#7dd3fc"),
    off: new THREE.Color("#facc15"),
    overstimulated: new THREE.Color("#f87171"),
  };

  useFrame(() => {
    if (materialRef.current) {
        materialRef.current.uniforms.uColor.value.lerp(colorMap[rhythmState], 0.1);
        materialRef.current.uniforms.uGlow.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uGlow.value, mentalLoad, 0.1);
    }
  });

  return (
    <Sphere args={[1, 64, 64]}>
      <orbShaderMaterial ref={materialRef} transparent />
    </Sphere>
  );
}
'''