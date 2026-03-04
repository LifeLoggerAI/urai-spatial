'use client'

import { useSceneStore } from "../../urai-tier1/src/spatial/state/sceneStore";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useRef } from "react";

export default function MemorySphere() {
  const { mode, selectedStarPosition } = useSceneStore();
  const mesh = useRef<THREE.Mesh>(null!)

  if (mode !== 'memory' || !selectedStarPosition) {
    return null;
  }

  return (
    <mesh ref={mesh} position={selectedStarPosition}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
    </mesh>
  );
}
