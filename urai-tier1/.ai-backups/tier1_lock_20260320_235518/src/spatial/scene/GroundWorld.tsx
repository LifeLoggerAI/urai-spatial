"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { useSceneStore } from "../state/sceneStore";
import ObjectNode from "./ObjectNode";

export default function GroundWorld() {
  const mode = useSceneStore((state) => state.mode);
  const visible = mode === "ground" || mode === "object";
  const horizonRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (horizonRef.current) {
      horizonRef.current.position.y = 0.08 + Math.sin(state.clock.elapsedTime * 0.2) * 0.02;
    }
  });

  if (!visible) return null;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial color="#0a3ec0" roughness={0.95} metalness={0.03} />
      </mesh>

      <mesh ref={horizonRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -3.4]}>
        <ringGeometry args={[13.8, 17.8, 64]} />
        <meshBasicMaterial color="#2156ff" transparent opacity={0.22} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[1.8, 3.3, 48]} />
        <meshBasicMaterial color="#5ea2ff" transparent opacity={0.12} />
      </mesh>

      <mesh position={[-6.3, 2.4, -5.8]}>
        <coneGeometry args={[0.6, 5.4, 5]} />
        <meshStandardMaterial color="#071736" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[6.7, 1.8, -6.6]}>
        <boxGeometry args={[1.2, 3.7, 1.2]} />
        <meshStandardMaterial color="#08152b" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[3.9, 1.2, -4.6]}>
        <coneGeometry args={[0.45, 2.8, 5]} />
        <meshStandardMaterial color="#0a1635" roughness={1} metalness={0} />
      </mesh>

      <ObjectNode id="object-cube" position={[-2.8, 1.2, -0.8]} kind="cube" scale={1.9} />
      <ObjectNode id="object-capsule" position={[0.9, 2.1, -0.4]} kind="capsule" scale={1.7} />
      <ObjectNode id="object-cone" position={[3.8, 1.7, -0.6]} kind="cone" scale={2.0} />
    </group>
  );
}
