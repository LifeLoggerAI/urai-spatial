"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";

type Props = {
  position?: [number, number, number];
};

export default function OrbGlow({ position = [0, 0, 0] }: Props) {
  const haloRef = useRef<Mesh | null>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (haloRef.current) {
      const s = 1.7 + Math.sin(t * 1.8) * 0.05;
      haloRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={haloRef} position={position} renderOrder={1}>
      <sphereGeometry args={[1.08, 48, 48]} />
      <meshBasicMaterial color="#7fc2ff" transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
}
