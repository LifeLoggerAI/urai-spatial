"use client";

import { useSceneStore } from "../state/sceneStore";

type StarMeshProps = {
  id: string;
  position: [number, number, number];
  color?: string;
  glow?: number;
  scale?: number;
};

export default function StarMesh({ id, position, color = "#ffffff", scale = 0.16 }: StarMeshProps) {
  const hoverStar = useSceneStore((s) => s.hoverStar);
  const selectStar = useSceneStore((s) => s.selectStar);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const hoveredStar = useSceneStore((s) => s.hoveredStar);
  const mode = useSceneStore((s) => s.mode);

  const isSelected = selectedStar === id;
  const isHovered = hoveredStar === id;
  const size = isSelected ? scale * 1.3 : isHovered ? scale * 1.15 : scale;
  const interactive = mode === "lifemap" || mode === "replay";

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (interactive) hoverStar(id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (interactive) hoverStar(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (interactive) selectStar(id);
      }}
    >
      <mesh>
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial color={color} transparent opacity={0.92} />
      </mesh>
      <mesh scale={2.4}>
        <sphereGeometry args={[size, 14, 14]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}
