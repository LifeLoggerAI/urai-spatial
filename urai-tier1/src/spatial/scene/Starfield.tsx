import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Starfield({ visible = true }) {
  const group = useRef<THREE.Group>(null);

  const stars = [];
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
          <meshBasicMaterial
            color="#dbe7ff"
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
