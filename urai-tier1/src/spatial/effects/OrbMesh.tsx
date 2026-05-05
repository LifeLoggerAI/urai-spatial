"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export default function OrbMesh({ audioLevel = 0 }: { audioLevel?: number }) {
  const orbRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.25) * 0.035 + audioLevel * 0.22;

    if (orbRef.current) {
      orbRef.current.scale.setScalar(pulse);
      orbRef.current.rotation.y = t * 0.18;
      orbRef.current.rotation.x = Math.sin(t * 0.4) * 0.08;
    }

    if (haloRef.current) {
      haloRef.current.scale.setScalar(1.42 + Math.sin(t * 0.8) * 0.04 + audioLevel * 0.28);
      haloRef.current.rotation.z = t * 0.08;
    }
  });

  return (
    <group position={[0, -0.12, 1.1]}>
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 2]} intensity={4.5} color="#7dd3fc" />
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.88, 48, 48]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.16} wireframe />
      </mesh>
      <mesh ref={orbRef}>
        <sphereGeometry args={[0.62, 64, 64]} />
        <meshStandardMaterial
          color="#7dd3fc"
          emissive="#38bdf8"
          emissiveIntensity={1.65 + audioLevel * 2.5}
          roughness={0.16}
          metalness={0.28}
        />
      </mesh>
    </group>
  );
}
