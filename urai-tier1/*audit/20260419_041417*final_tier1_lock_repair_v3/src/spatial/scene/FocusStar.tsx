'use client';

import * as THREE from 'three';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export type FocusStarProps = {
  visible?: boolean;
  opacity?: number;
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export default function FocusStar({
  visible = true,
  opacity = 1,
}: FocusStarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state, delta) => {
    if (!visible) return;

    const t = state.clock.getElapsedTime();
    const breath = 0.5 + 0.5 * Math.sin(t * 0.6);
    const micro = Math.sin(t * 2.2) * 0.006;

    if (rootRef.current) {
      rootRef.current.rotation.y += delta * 0.12;
      rootRef.current.position.y = lerp(
        rootRef.current.position.y,
        Math.sin(t * 0.35) * 0.035,
        1 - Math.exp(-delta * 2.4)
      );
    }

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial;
      const scale = lerp(
        coreRef.current.scale.x,
        1 + breath * 0.035 + micro,
        1 - Math.exp(-delta * 4)
      );
      coreRef.current.scale.setScalar(scale);
      mat.opacity = lerp(mat.opacity, opacity, 1 - Math.exp(-delta * 4));
      mat.transparent = opacity < 0.999;
      mat.emissiveIntensity = lerp(
        mat.emissiveIntensity,
        (3.2 + breath * 0.9) * opacity,
        1 - Math.exp(-delta * 4)
      );
    }

    if (shellRef.current) {
      const mat = shellRef.current.material as THREE.MeshBasicMaterial;
      const scale = lerp(
        shellRef.current.scale.x,
        1 + breath * 0.06,
        1 - Math.exp(-delta * 3.8)
      );
      shellRef.current.scale.setScalar(scale);
      mat.opacity = lerp(mat.opacity, 0.18 * opacity, 1 - Math.exp(-delta * 3.8));
    }

    if (auraRef.current) {
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = lerp(mat.opacity, (0.12 + breath * 0.03) * opacity, 1 - Math.exp(-delta * 3.4));
    }

    if (ringRef.current) {
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = lerp(mat.opacity, (0.22 + breath * 0.03) * opacity, 1 - Math.exp(-delta * 3.2));
      ringRef.current.rotation.z += delta * 0.08;
    }

    if (lightRef.current) {
      lightRef.current.intensity = lerp(
        lightRef.current.intensity,
        (8.4 + breath * 1.1) * opacity,
        1 - Math.exp(-delta * 3)
      );
      lightRef.current.distance = lerp(
        lightRef.current.distance,
        18 + breath * 2.2,
        1 - Math.exp(-delta * 2.6)
      );
    }
  });

  return (
    <group ref={rootRef} visible={visible} position={[0, 0, -8]}>
      <pointLight
        ref={lightRef}
        color="#ebf5ff"
        intensity={8.4}
        distance={18}
        decay={2}
        position={[0, 0, 0.3]}
      />

      <mesh ref={auraRef}>
        <sphereGeometry args={[2.2, 48, 48]} />
        <meshBasicMaterial
          color="#7fb2ff"
          transparent
          opacity={0.12 * opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={shellRef}>
        <sphereGeometry args={[1.2, 64, 64]} />
        <meshBasicMaterial
          color="#b7dbff"
          transparent
          opacity={0.18 * opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={coreRef}>
        <sphereGeometry args={[0.72, 72, 72]} />
        <meshStandardMaterial
          color="#f8fcff"
          emissive="#9fd3ff"
          emissiveIntensity={3.2}
          roughness={0.12}
          metalness={0.01}
          transparent
          opacity={opacity}
        />
      </mesh>

      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <ringGeometry args={[1.2, 2.7, 96]} />
        <meshBasicMaterial
          color="#244c8b"
          transparent
          opacity={0.22 * opacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
