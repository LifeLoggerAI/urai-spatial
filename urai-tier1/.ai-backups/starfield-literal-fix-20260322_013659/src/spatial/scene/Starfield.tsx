"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import * as THREE from "three";

type Star = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
};

const STARS: Star[] = [
  { id: "s1", position: [-4.4, 1.2, -10], color: "#ffd580", size: 0.12 },
  { id: "s2", position: [-2.2, 1.9, -12], color: "#b0c7ff", size: 0.1 },
  { id: "s3", position: [0.1, 1.0, -9], color: "#fff1b3", size: 0.14 },
  { id: "s4", position: [2.8, 2.2, -12.5], color: "#9dc1ff", size: 0.1 },
  { id: "s5", position: [4.8, 0.8, -10.6], color: "#ffd8a8", size: 0.11 },
  { id: "s6", position: [1.6, -0.8, -13.5], color: "#c9d8ff", size: 0.08 },
  { id: "s7", position: [-3.0, -0.6, -14.5], color: "#ffe2a8", size: 0.09 },
  { id: "s8", position=[0.0, 3.1, -15.2], color: "#9db8ff", size: 0.09 },
  { id: "s9", position=[-6.0, 2.8, -17.5], color: "#8fb3ff", size: 0.07 },
  { id: "s10", position=[5.9, 2.7, -18], color: "#ffe9a6", size: 0.07 },
];

function StarMesh({
  star,
  hovered,
  selected,
  interactive,
}: {
  star: Star;
  hovered: boolean;
  selected: boolean;
  interactive: boolean;
}) {
  const setHoveredStarId = useSceneStore((s) => s.setHoveredStarId);
  const focusStar = useSceneStore((s) => s.focusStar);

  const scale = selected ? 1.9 : hovered ? 1.45 : 1;
  const opacity = selected ? 1 : hovered ? 0.95 : 0.72;
  const haloOpacity = selected ? 0.24 : hovered ? 0.18 : 0.08;

  return (
    <group position={star.position}>
      <mesh
        scale={[scale, scale, scale]}
        onPointerOver={() => interactive && setHoveredStarId(star.id)}
        onPointerOut={() => interactive && setHoveredStarId(null)}
        onClick={() => interactive && focusStar(star.id)}
      >
        <sphereGeometry args={[star.size, 24, 24]} />
        <meshBasicMaterial color={star.color} transparent opacity={opacity} />
      </mesh>

      <mesh scale={[scale * 3.2, scale * 3.2, scale * 3.2]}>
        <sphereGeometry args={[star.size, 20, 20]} />
        <meshBasicMaterial color={star.color} transparent opacity={haloOpacity} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Starfield() {
  const mode = useSceneStore((s) => s.mode);
  const hoveredStarId = useSceneStore((s) => s.hoveredStarId);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const enterLifeMap = useSceneStore((s) => s.enterLifeMap);
  const groupRef = useMemo(() => ({ current: null as THREE.Group | null }), []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.08) * 0.02;
    if (mode === "sky") {
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, 0, 0.06);
    }
  });

  const visible = mode !== "home";

  return (
    <group
      ref={(r) => {
        groupRef.current = r;
      }}
      visible={visible}
      onClick={() => {
        if (mode === "sky") enterLifeMap();
      }}
    >
      {STARS.map((star) => (
        <StarMesh
          key={star.id}
          star={star}
          hovered={hoveredStarId === star.id}
          selected={selectedStarId === star.id}
          interactive={mode === "lifemap" || mode === "focus"}
        />
      ))}
    </group>
  );
}
