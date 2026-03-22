"use client";

import { useSceneStore } from "../state/sceneStore";

type ObjectNodeKind = "cube" | "sphere" | "plane" | "capsule" | "cone";

type ObjectNodeData = {
  id: string;
  position: [number, number, number];
  scale?: number;
  kind?: ObjectNodeKind;
};

export default function ObjectNode({
  id,
  position,
  scale = 1.5,
  kind = "cube",
}: ObjectNodeData) {
  const selectedObject = useSceneStore((state) => state.selectedStarId);
  const selected = selectedObject === id;

  const selectObject = (nextId: string) => {
    const state = useSceneStore.getState() as {
      setSelectedStarId?: (id: string | null) => void;
    };
    state.setSelectedStarId?.(nextId);
  };

  return (
    <group position={position} onClick={() => selectObject(id)}>
      <mesh castShadow receiveShadow>
        {kind === "capsule" ? (
          <capsuleGeometry args={[0.52 * scale, 1.4 * scale, 10, 18]} />
        ) : kind === "cone" ? (
          <coneGeometry args={[0.66 * scale, 1.45 * scale, 24]} />
        ) : kind === "sphere" ? (
          <sphereGeometry args={[0.75 * scale, 24, 24]} />
        ) : kind === "plane" ? (
          <planeGeometry args={[1.6 * scale, 1.6 * scale]} />
        ) : (
          <boxGeometry args={[1.2 * scale, 1.2 * scale, 1.2 * scale]} />
        )}
        <meshStandardMaterial
          color={selected ? "#ffffff" : "#8ea4ff"}
          roughness={0.35}
          metalness={0.15}
        />
      </mesh>
    </group>
  );
}
