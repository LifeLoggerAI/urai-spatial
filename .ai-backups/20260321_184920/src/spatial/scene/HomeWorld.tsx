"use client";

import { useMemo } from "react";
import Orb from "../components/Orb";
import { useSceneStore } from "../state/sceneStore";

function WorldSilhouettes() {
  const items = useMemo(
    () => [
      { x: -4.6, z: -3.1, h: 2.6, w: 0.36, r: 0.18, o: 0.22 },
      { x: -3.5, z: -5.1, h: 3.2, w: 0.46, r: -0.08, o: 0.18 },
      { x: -1.8, z: -7.0, h: 2.9, w: 0.42, r: 0.05, o: 0.14 },
      { x: 1.2, z: -6.9, h: 2.7, w: 0.4, r: -0.07, o: 0.14 },
      { x: 3.2, z: -5.1, h: 2.5, w: 0.38, r: 0.09, o: 0.16 },
      { x: 4.8, z: -3.4, h: 2.8, w: 0.44, r: -0.06, o: 0.2 }
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

function OrbGroundSpill() {
  const spills = useMemo(
    () => [
      { x: -0.48, z: -0.08, r: 1.45, o: 0.08 },
      { x: -0.72, z: -0.18, r: 0.92, o: 0.12 },
      { x: -0.2, z: 0.06, r: 0.52, o: 0.09 }
    ],
    []
  );

  return (
    <group>
      {spills.map((s, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[s.x, 0.014 + i * 0.001, s.z]}>
          <circleGeometry args={[s.r, 40]} />
          <meshBasicMaterial color="#67c4ff" transparent opacity={s.o} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function OrbContactShadow() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.5, 0.012, -0.06]} receiveShadow>
      <circleGeometry args={[1.12, 40]} />
      <shadowMaterial opacity={0.52} />
    </mesh>
  );
}

export function HomeWorld() {
  const enterLifemap = useSceneStore((s) => s.enterLifemap);

  return (
    <group>
      <OrbGroundSpill />
      <OrbContactShadow />
      <Orb interactive active onClick={enterLifemap} />
      <WorldSilhouettes />
    </group>
  );
}

export default HomeWorld;
