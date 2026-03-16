'''"use client";

import { useSceneStore } from "@/spatial/state/sceneStore";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function MemorySphere() {
  const focusedStarId = useSceneStore((s) => s.focusedStarId);
  const mesh = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    if (mesh.current) {
      mesh.current.rotation.y += 0.01;
    }
  });

  if (!focusedStarId) return null;

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[15, 32, 32]} />
      <meshBasicMaterial color="lightblue" wireframe />
    </mesh>
  );
}
'''