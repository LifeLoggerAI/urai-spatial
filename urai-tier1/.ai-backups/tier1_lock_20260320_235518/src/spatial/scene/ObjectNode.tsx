"use client";

import type { ObjectNodeData } from "../types";
import { useSceneStore } from "../state/sceneStore";

export default function ObjectNode({ id, position, scale = 1.5, kind = "cube" }: ObjectNodeData) {
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const selectObject = useSceneStore((state) => state.selectObject);
  const selected = selectedObject === id;

  const common = (
    <meshStandardMaterial
      color="#eef5ff"
      emissive="#a4c2ff"
      emissiveIntensity={selected ? 0.7 : 0.18}
      roughness={0.14}
      metalness={0.06}
    />
  );

  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        selectObject(id);
      }}
    >
      <mesh castShadow receiveShadow>
        {kind === "capsule" ? (
          <capsuleGeometry args={[0.56 * scale, 1.65 * scale, 10, 18]} />
        ) : kind === "cone" ? (
          <coneGeometry args={[0.72 * scale, 1.55 * scale, 24]} />
        ) : (
          <boxGeometry args={[1.1 * scale, 1.1 * scale, 1.1 * scale]} />
        )}
        {common}
      </mesh>

      <mesh position={[0, -1.02 * scale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58 * scale, 1.02 * scale, 36]} />
        <meshBasicMaterial color="#78a8ff" transparent opacity={selected ? 0.22 : 0.09} />
      </mesh>
    </group>
  );
}
