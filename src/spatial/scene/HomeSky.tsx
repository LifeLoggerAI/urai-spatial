"use client";

import { useMemo } from "react";
import { BackSide } from "three";

import { useSceneStore } from "../state/sceneStore";

type HomeSkyProps = {
  hazeNear?: number;
  hazeFar?: number;
};

function hash(n: number) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export default function HomeSky({ hazeNear = 4.4, hazeFar = 16 }: HomeSkyProps) {
  const mode = useSceneStore((s) => s.mode);

  const stars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const a = hash(i + 1);
        const b = hash(i + 2);
        const c = hash(i + 3);
        return {
          id: `home-sky-star-${i}`,
          position: [a * 18 - 9, b * 5 + 2.1, -(c * 6 + 5.5)] as [number, number, number],
          scale: 0.007 + hash(i + 4) * 0.014,
          opacity: 0.14 + hash(i + 5) * 0.2,
        };
      }),
    []
  );

  if (mode !== "home") return null;

  return (
    <group>
      <fog attach="fog" color="#0b1026" near={hazeNear} far={hazeFar} />

      <mesh position={[0, 2.8, -8.6]}>
        <sphereGeometry args={[11, 42, 24, 0, Math.PI * 2, 0, Math.PI * 0.66]} />
        <meshBasicMaterial color="#6eb7ff" transparent opacity={0.06} side={BackSide} depthWrite={false} />
      </mesh>

      <mesh position={[0, 3.1, -8.8]}>
        <sphereGeometry args={[11.6, 42, 24, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
        <meshBasicMaterial color="#b7d4ff" transparent opacity={0.03} side={BackSide} depthWrite={false} />
      </mesh>

      {stars.map((star) => (
        <mesh key={star.id} position={star.position} scale={star.scale}>
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial color="#cfe0ff" transparent opacity={star.opacity} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
