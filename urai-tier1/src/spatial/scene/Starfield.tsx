"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { uraiRandom } from "@/lib/uraiDeterminism";

type Star = {
  id: number;
  position: [number, number, number];
  size: number;
};

export default function Starfield({ visible = true }) {
  const group = useRef<THREE.Group>(null);

  const stars: Star[] = [];
  const COUNT = 120;

  for (let i = 0; i < COUNT; i++) {
    stars.push({
      id: i,
      position: [
        (uraiRandom() - 0.5) * 20,
        (uraiRandom() - 0.5) * 12,
        -10 - uraiRandom() * 40,
      ],
      size: 0.15 + uraiRandom() * 0.25,
    });
  }

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.03;
  });

  if (!visible) return null;

  return (
    <group ref={group}>
      {stars.map((s) => (
        <mesh key={s.id} position={s.position}>
          <sphereGeometry args={[s.size, 8, 8]} />
          <meshBasicMaterial color="#dbe7ff" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
