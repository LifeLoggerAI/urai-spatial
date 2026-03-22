"use client";

import { StarData } from "../types";

type Props = {
  stars: StarData[];
};

export default function Starfield({ stars }: Props) {
  return (
    <group>
      {stars.map((s) => (
        <mesh key={s.id} position={s.position}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={s.color || "white"} />
        </mesh>
      ))}
    </group>
  );
}
