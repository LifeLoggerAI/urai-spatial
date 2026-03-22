"use client";

import { SPATIAL_STARS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

type StarMeshProps = {
  id: string;
  position: [number, number, number];
  color: string;
  scale: number;
  selected: boolean;
  interactive: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: string) => void;
};

function StarMesh(props: StarMeshProps) {
  const size = props.selected ? props.scale * 1.3 : props.scale;

  return (
    <group
      position={props.position}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (props.interactive) props.onHover(props.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        if (props.interactive) props.onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (props.interactive) props.onClick(props.id);
      }}
    >
      <mesh>
        <sphereGeometry args={[size, 18, 18]} />
        <meshBasicMaterial color={props.color} transparent opacity={0.9} />
      </mesh>
      <mesh scale={2.4}>
        <sphereGeometry args={[size, 14, 14]} />
        <meshBasicMaterial color={props.color} transparent opacity={0.08} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Starfield() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const hoverStar = useSceneStore((s) => s.hoverStar);
  const selectStar = useSceneStore((s) => s.selectStar);

  if (mode !== "lifemap" && mode !== "replay") return null;

  return (
    <group>
      {SPATIAL_STARS.map((star) => (
        <StarMesh
          key={star.id}
          id={star.id}
          position={star.position}
          color={star.color}
          scale={star.size}
          selected={selectedStar === star.id}
          interactive={true}
          onHover={hoverStar}
          onClick={selectStar}
        />
      ))}
    </group>
  );
}
