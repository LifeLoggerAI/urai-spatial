'''"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const tempObject = new THREE.Object3D();

function createStars(count: number, depth: number, spread: number) {
  return Array.from({ length: count }, () => ({
    position: [
      (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread,
      -Math.random() * depth
    ],
    scale: Math.random() * 0.3 + 0.1
  }));
}

export default function Starfield() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    if(groupRef.current) {
        groupRef.current.rotation.y = state.clock.getElapsedTime() * 0.01;
    }
  });

  const stars = useMemo(() => createStars(900, 120, 80), []);

  return (
    <group ref={groupRef}>
        <mesh>
            <sphereGeometry args={[100, 64, 64]} />
            <meshBasicMaterial side={THREE.BackSide} color="#000000" />
        </mesh>
        {stars.map((star, i) => (
            <mesh
            key={i}
            position={star.position as any}
            scale={star.scale}
            >
            <boxGeometry args={[0.05, 0.05, 0.05]} />
            <meshBasicMaterial
                color={"#cccccc"}
                transparent
                opacity={0.8}
            />
            </mesh>
        ))}
    </group>
  );
}
'''