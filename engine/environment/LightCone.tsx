import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LightConeShader } from '../shaders/LightConeShader';

export default function LightCone() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const { geometry, shader } = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0, 1, 2, 32, 1, true);
    const shader = LightConeShader;
    return { geometry, shader };
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        attach="material"
        args={[shader]}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}