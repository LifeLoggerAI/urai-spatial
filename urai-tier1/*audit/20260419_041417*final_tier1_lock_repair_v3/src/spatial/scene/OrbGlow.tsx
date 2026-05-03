import { uraiNow, uraiRandom, uraiTime } from "@/lib/uraiDeterminism";
"use client";

import { useRef } from "react";




import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

type Props = {
  position?: [number, number, number];
};

export default function OrbGlow({ position = [0, 0, 0] }: Props) {
  const __uraiEpochRef = useRef<number>(uraiTime())
  const __uraiLocalTime = useRef(uraiTime())

  const haloRef = useRef<Mesh | null>(null);

  useFrame(() => {
    const t = ((uraiTime() - __uraiLocalTime.current) / 1000);
    if (haloRef.current) {
      const s = 1.7 + Math.sin(t * 1.8) * 0.05;
      haloRef.current.scale.set(s, s, s);
    }
  });

  return (
    <mesh ref={haloRef} position={position} renderOrder={1}>
      <sphereGeometry args={[1.08, 48, 48]} />
      <meshBasicMaterial color="#7fc2ff" transparent opacity={0.75} depthWrite={false} />
    </mesh>
  );
}
