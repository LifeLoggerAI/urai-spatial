"use client";

import { GROUND_OBJECTS } from "../data/stars";
import { useSceneStore } from "../state/sceneStore";

function GroundNode({
  id,
  kind,
  position,
  scale,
  selected,
  onSelect,
}: {
  id: string;
  kind: "cube" | "cone" | "capsule";
  position: [number, number, number];
  scale: number;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <group
      position={position}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
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

      <mesh position={[0, -0.9 * scale, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.62 * scale, 1.02 * scale, 36]} />
        <meshBasicMaterial color="#7ca8ff" transparent opacity={selected ? 0.24 : 0.1} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function GroundWorld() {
  const mode = useSceneStore((state) => state.mode);
  const selectedObject = useSceneStore((state) => state.selectedObject);
  const focusObject = useSceneStore((state) => state.focusObject);
  const returnFromObject = useSceneStore((state) => state.returnFromObject);

  const visible = mode === "ground" || mode === "object";
  if (!visible) return null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#082da7" roughness={0.98} metalness={0.02} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -3.2]}>
        <ringGeometry args={[13.5, 17.5, 64]} />
        <meshBasicMaterial color="#2864ff" transparent opacity={0.22} depthWrite={false} />
      </mesh>

      <mesh position={[-6.2, 2.4, -6.0]}>
        <coneGeometry args={[0.65, 5.2, 5]} />
        <meshStandardMaterial color="#06162d" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[6.8, 1.9, -6.8]}>
        <boxGeometry args={[1.3, 3.8, 1.3]} />
        <meshStandardMaterial color="#07172f" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[3.7, 1.4, -4.8]}>
        <coneGeometry args={[0.5, 3.1, 5]} />
        <meshStandardMaterial color="#081734" roughness={1} metalness={0} />
      </mesh>

      {GROUND_OBJECTS.map((item) => (
        <GroundNode
          key={item.id}
          id={item.id}
          kind={item.kind}
          position={item.position}
          scale={item.scale}
          selected={selectedObject === item.id}
          onSelect={focusObject}
        />
      ))}

      <mesh
        visible={mode === "object"}
        position={[0, 0, 0]}
        onClick={(event) => {
          event.stopPropagation();
          returnFromObject();
        }}
      >
        <sphereGeometry args={[100, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} side={2} />
      </mesh>
    </group>
  );
}
