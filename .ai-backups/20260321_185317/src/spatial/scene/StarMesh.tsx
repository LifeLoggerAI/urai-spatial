"use client";

import { Mesh } from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { SpatialStar } from "../types";
import { useSceneStore } from "../state/sceneStore";

export default function StarMesh({ star }: { star: SpatialStar }) {
  const ref = useRef<Mesh>(null!);
  const hover = useSceneStore((s) => s.hoverStarId === star.id);
  const setHover = useSceneStore((s) => s.setHoverStar);
  const setSelected = useSceneStore((s) => s.setSelectedStar);
  const setMode = useSceneStore((s) => s.setMode);

  useFrame(() => {
    const scale = hover ? 1.6 : 1;
    ref.current.scale.lerp({ x: scale, y: scale, z: scale } as any, 0.12);
  });

  return (
    <mesh
      ref={ref}
      position={star.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(star.id);
      }}
      onPointerOut={() => setHover(null)}
      onClick={(e) => {
        e.stopPropagation();
        setSelected(star);
        setMode("replay");
      }}
    >
      <sphereGeometry args={[star.size, 16, 16]} />
      <meshStandardMaterial
        emissive={star.color}
        emissiveIntensity={hover ? 3 : 1.2}
        color={"black"}
      />
    </mesh>
  );
}
