"use client";

import { useMemo } from "react";
import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";

function WorldSilhouettes() {
  const items = useMemo(
    () => [
      { x: -4.8, z: -2.8, h: 2.8, w: 0.42, r: 0.2, o: 0.26 },
      { x: -3.9, z: -5.6, h: 3.7, w: 0.54, r: -0.14, o: 0.22 },
      { x: -2.6, z: -7.6, h: 4.2, w: 0.72, r: 0.08, o: 0.18 },
      { x: -0.9, z: -8.9, h: 3.4, w: 0.5, r: -0.08, o: 0.15 },
      { x: 1.7, z: -8.2, h: 3.0, w: 0.48, r: 0.11, o: 0.14 },
      { x: 3.7, z: -6.4, h: 2.7, w: 0.44, r: -0.12, o: 0.16 },
      { x: 5.1, z: -4.6, h: 2.35, w: 0.38, r: 0.07, o: 0.18 }
    ],
    []
  );

  return (
    <group position={[0, 0, -0.2]}>
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
            color="#04060d"
            transparent
            opacity={it.o}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}

function OrbLightCatchers() {
  const catchers = useMemo(
    () => [
      { x: -2.3, z: -2.2, s: 0.9, o: 0.06 },
      { x: -1.6, z: -3.4, s: 1.2, o: 0.045 },
      { x: 0.1, z: -2.6, s: 1.0, o: 0.05 }
    ],
    []
  );

  return (
    <group>
      {catchers.map((c, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[c.x, 0.015, c.z]}>
          <meshBasicMaterial color="#65bfff" transparent opacity={c.o} depthWrite={false} />
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
      <OrbLightCatchers />
      <WorldSilhouettes />
    </group>
  );
}

export default HomeWorld;
