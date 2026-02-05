'use client';

import { useMemo } from 'react';
import { BackSide, Color, ShaderMaterial } from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec2 vUv;
  uniform vec3 color1;
  uniform vec3 color2;
  void main() {
    gl_FragColor = vec4(mix(color1, color2, vUv.y), 1.0);
  }
`;

export default function NebulaDome() {
  const material = useMemo(() => {
    return new ShaderMaterial({
      uniforms: {
        color1: { value: new Color('#0a0a2a') },
        color2: { value: new Color('#1a1a3a') },
      },
      vertexShader,
      fragmentShader,
      side: BackSide,
    });
  }, []);

  return (
    <mesh>
      <sphereGeometry args={[500, 32, 32]} />
      <primitive object={material} />
    </mesh>
  );
}
