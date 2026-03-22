"use client";

import type { ObjectNodeData } from "../types";
import { useSceneStore } from "../state/sceneStore";

export default function ObjectNode({ id, position, scale = 1.5, kind = "cube" }: ObjectNodeData) {
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const selectObject = useSceneStore((state) => state.selectObject);
  const selected = selectedObject === id;

  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        selectObject(id);
      }}
    >
      <mesh castShadow receiveShadow>
        {kind === "capsule" ? (
          <capsuleGeometry args={[0.52 * scale, 1.4 * scale, 10, 18]} />
        ) : kind === "cone" ? (
          <coneGeometry args={[0.66 * scale, 1.45 * scale, 24]} />
        ) : (
          <boxGeometry args={[1.02 * scale, 1.02 * scale, 1.02 * scale]} />
        )}
        <meshStandardMaterial
          color="#eef5ff"
          emissive="#8caeff"
          emissiveIntensity={selected ? 0.95 : 0.24}
          roughness={0.12}
          metalness={0.05}
        />
      </mesh>
    </group>
  );
}
