"use client"

import { useRef, useMemo, forwardRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface StarProps {
  star: { id: number; position: [number, number, number] };
  selected: boolean;
  dimOthers: boolean;
  onClick: () => void;
}

export const Star = forwardRef<THREE.Group, StarProps>(({ star, selected, dimOthers, onClick }, ref) => {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(({ clock }) => {
    if (matRef.current) {
      if (selected) {
        const pulse = 1.4 + Math.sin(clock.elapsedTime * 2) * 0.25;
        matRef.current.emissiveIntensity = pulse;
        matRef.current.color.lerp(new THREE.Color("#ffffff"), 0.08);
      } else {
        matRef.current.emissiveIntensity = dimOthers ? 0.05 : 0.25;
        matRef.current.color.lerp(dimOthers ? new THREE.Color("#1a1a1a") : new THREE.Color("#8fb3ff"), 0.08);
      }
    }
  });

  return (
    <group ref={ref} position={star.position}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <sphereGeometry args={[0.9, 24, 24]} />
        <meshStandardMaterial
          ref={matRef}
          color={selected ? "#ffffff" : (dimOthers ? "#1a1a1a" : "#8fb3ff")}
          emissive={selected ? "#ffffff" : (dimOthers ? "#1a1a1a" : "#111111")}
          emissiveIntensity={selected ? 1.5 : (dimOthers ? 0.05 : 0.25)}
        />
      </mesh>
      <mesh scale={[4.5, 4.5, 4.5]}>
        <sphereGeometry args={[0.9, 16, 16]} />
        <meshBasicMaterial
          color="#8fb3ff"
          transparent
          opacity={0.75}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

Star.displayName = "Star";
