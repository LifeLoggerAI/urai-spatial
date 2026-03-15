import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HyperspaceStreaksShader } from '../shaders/HyperspaceStreaksShader';

export default function HyperspaceStreaks() {
  const meshRef = useRef<THREE.Points>(null!);

  const { geometry, shader } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const shader = HyperspaceStreaksShader;

    return { geometry, shader };
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <points ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        attach="material"
        args={[shader]}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}