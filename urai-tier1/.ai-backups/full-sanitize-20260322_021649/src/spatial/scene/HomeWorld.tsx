"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useSceneStore } from "../state/sceneStore";
import * as THREE from "three";

export default function HomeWorld() {
  const mode = useSceneStore((s) => s.mode);
  const enterSky = useSceneStore((s) => s.enterSky);

  const ring = useMemo(() => new THREE.TorusGeometry(1.15, 0.05, 24, 96), []);
  const pad = useMemo(() => new THREE.CircleGeometry(3.15, 96), []);
  const orbRef = useMemo(() => ({ current: null as THREE.Mesh | null }), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (orbRef.current && mode === "home") {
      orbRef.current.position.y = 1.18 + Math.sin(t * 0.9) * 0.04;
      orbRef.current.scale.setScalar(1 + Math.sin(t * 1.1) * 0.015);
    }
  });

  const visible = mode === "home";

  return (
    <group visible={visible}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[16, 96]} />
        <meshStandardMaterial color="#07101c" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={pad}>
        <meshBasicMaterial color="#0d2347" transparent opacity={0.82} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} geometry={ring}>
        <meshBasicMaterial color="#a7c4ff" transparent opacity={0.88} />
      </mesh>

      <mesh
        ref={(r) => {
          orbRef.current = r;
        }}
        position={[0, 1.18, 0]}
        onClick={() => enterSky()}
      >
        <sphereGeometry args={[0.95, 64, 64]} />
        <meshPhysicalMaterial
          color="#edf4ff"
          emissive="#dce8ff"
          emissiveIntensity={0.95}
          roughness={0.12}
          metalness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transmission={0.02}
        />
      </mesh>

      <mesh position={[0, 1.18, 0]} scale={[1.85, 1.85, 1.85]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshBasicMaterial color="#86a8ff" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <group position={[-5.8, 1.9, -5]}>
        <mesh position={[0, 1.8, 0]}>
          <boxGeometry args={[0.65, 5.1, 0.65]} />
          <meshStandardMaterial color="#08101d" roughness={1} />
        </mesh>
      </group>

      <group position={[5.4, 1.7, -5.8]}>
        <mesh position={[0, 1.7, 0]}>
          <boxGeometry args={[0.72, 4.8, 0.72]} />
          <meshStandardMaterial color="#08101d" roughness={1} />
        </mesh>
      </group>

      <group position={[0, 0, -14]}>
        <mesh position={[0, 7.5, 0]}>
          <planeGeometry args={[42, 18]} />
          <meshBasicMaterial color="#0a1570" transparent opacity={0.48} />
        </mesh>
      </group>
    </group>
  );
}
