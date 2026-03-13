'use client'

import { useRef, useEffect, Suspense } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { useSpatialStore } from "../state/spatialStore";

function MemoryContent({ starInfo }: { starInfo: any }) {
  const texture = useLoader(THREE.TextureLoader, starInfo.image);
  return <meshBasicMaterial map={texture} side={THREE.BackSide} />;
}

export default function MemorySphere() {
  const selectedStarId = useSpatialStore((s) => s.selectedStarId);
  const stars = useSpatialStore((s) => s.stars) ?? [];

  const sphereRef = useRef<THREE.Mesh>(null);

  const starInfo = stars?.find?.((s: any) => s.id === selectedStarId) ?? null;

  useEffect(() => {
    if (!sphereRef.current) return;

    if (starInfo) {
      // Reset for cinematic spawn
      sphereRef.current.scale.set(0.01, 0.01, 0.01);
    } else {
      sphereRef.current.scale.set(0, 0, 0);
    }
  }, [starInfo]);

  useFrame(() => {
    if (!sphereRef.current) return;

    if (starInfo) {
      sphereRef.current.position.set(
        starInfo.position[0],
        starInfo.position[1],
        starInfo.position[2]
      );

      sphereRef.current.scale.lerp(
        new THREE.Vector3(1, 1, 1),
        0.12
      );
    } else {
      sphereRef.current.scale.set(0, 0, 0);
    }
  });

  if (!starInfo) return null;

  return (
    <mesh ref={sphereRef}>
      <sphereGeometry args={[2, 64, 64]} />
      <Suspense fallback={<meshStandardMaterial color="#000" />}>
        <MemoryContent starInfo={starInfo} />
      </Suspense>
    </mesh>
  );
}