"use client";

import { useMemo } from "react";
import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";

function WorldSilhouettes() {
  const items = useMemo(() => {
    const count = 14;
    return Array.from({ length: count }).map((_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 5.4 + (i % 4) * 0.6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 0.8;
      const h = 1.5 + ((i * 7) % 5) * 0.55;
      const w = 0.3 + (i % 3) * 0.08;
      return { x, z, h, w, r: angle * 0.6 };
    });
  }, []);

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          castShadow
          receiveShadow
          position={[it.x, it.h / 2, it.z]}
          rotation={[0, it.r, 0]}
        >
          <boxGeometry args={[it.w, it.h, it.w]} />
          <meshStandardMaterial
            color="#05070f"
            transparent
            opacity={0.35}
            roughness={0.95}
            metalness={0.02}
          />
        </mesh>
      ))}
    </group>
  );
}

export function HomeWorld() {
  const enterLifemap = useSceneStore((s) => s.enterLifemap);

  return (
    <group>
      <Orb interactive active onClick={enterLifemap} />
      <WorldSilhouettes />
    </group>
  );
}

export default HomeWorld;
