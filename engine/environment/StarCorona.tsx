import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { StarCoronaShader } from '../shaders/StarCoronaShader';

export default function StarCorona() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const { geometry, shader } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const shader = StarCoronaShader;
    return { geometry, shader };
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.u_time.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={[500, 500, 500]} frustumCulled={false}>
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