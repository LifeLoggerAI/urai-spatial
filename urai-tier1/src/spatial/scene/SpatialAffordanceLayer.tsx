"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Props = {
  phase: "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
  onOpenLifeMap: () => void;
  onBack: () => void;
  onReplay: () => void;
};

export default function SpatialAffordanceLayer({ phase, onOpenLifeMap, onBack, onReplay }: Props) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const s = 1 + Math.sin(t * 1.8) * 0.06;
    if (ringRef.current) ringRef.current.rotation.z = t * 0.25;
    if (pulseRef.current) pulseRef.current.scale.setScalar(s);
  });

  const isHome = phase === "HOME";
  const canReplay = phase === "FOCUS";

  return (
    <group>
      {isHome && (
        <group position={[3.2, 1.0, -6.6]} onPointerDown={onOpenLifeMap}>
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.8, 0.08, 16, 72]} />
            <meshBasicMaterial color="#92d9ff" transparent opacity={0.82} toneMapped={false} />
          </mesh>
          <mesh ref={pulseRef}>
            <sphereGeometry args={[0.3, 24, 24]} />
            <meshBasicMaterial color="#b7ebff" toneMapped={false} />
          </mesh>
          <pointLight color="#8fdcff" intensity={2.6} distance={14} />
        </group>
      )}

      {!isHome && (
        <group position={[-4.6, 1.35, -5.8]} onPointerDown={onBack}>
          <mesh>
            <octahedronGeometry args={[0.42, 0]} />
            <meshBasicMaterial color="#cbd9ff" transparent opacity={0.86} toneMapped={false} />
          </mesh>
          <pointLight color="#8e9fff" intensity={1.8} distance={10} />
        </group>
      )}

      {canReplay && (
        <group position={[0, 1.7, -10.5]} onPointerDown={onReplay}>
          <mesh>
            <icosahedronGeometry args={[0.45, 1]} />
            <meshBasicMaterial color="#ffe7a2" transparent opacity={0.88} toneMapped={false} />
          </mesh>
          <pointLight color="#ffd892" intensity={2.2} distance={12} />
        </group>
      )}
    </group>
  );
}
