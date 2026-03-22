"use client";

import { Float } from "@react-three/drei";
import { useSceneStore } from "../state/sceneStore";

export default function HomeWorld() {
  const mode = useSceneStore((s) => s.mode);
  const phase = useSceneStore((s) => s.phase);
  const homeToLifemap = useSceneStore((s) => s.homeToLifemap);
  const enterGround = useSceneStore((s) => s.enterGround);

  const visible = mode === "home" || phase === "to-lifemap" || phase === "to-home";
  const fade = phase === "to-lifemap" ? 0.15 : phase === "to-home" ? 0.75 : 1;

  if (!visible) return null;

  return (
    <group scale={[fade, fade, fade]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <circleGeometry args={[18, 72]} />
        <meshStandardMaterial color="#061a5e" roughness={0.96} metalness={0.02} />
      </mesh>

      <mesh position={[-5.0, 1.2, -6.2]}>
        <coneGeometry args={[0.55, 2.8, 6]} />
        <meshStandardMaterial color="#071632" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[5.5, 1.7, -5.7]}>
        <boxGeometry args={[1.0, 3.5, 1.0]} />
        <meshStandardMaterial color="#08142c" roughness={1} metalness={0} />
      </mesh>

      <Float speed={1.1} rotationIntensity={0.08} floatIntensity={0.16}>
        <group position={[0, 1.25, 0.08]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation();
              if (mode === "home") homeToLifemap();
            }}
          >
            <sphereGeometry args={[1.05, 48, 48]} />
            <meshPhysicalMaterial
              color="#f7fbff"
              emissive="#8ab2ff"
              emissiveIntensity={0.9}
              roughness={0.08}
              transmission={0.16}
              thickness={0.8}
              clearcoat={1}
              clearcoatRoughness={0.08}
            />
          </mesh>

          <mesh scale={2.55}>
            <sphereGeometry args={[1.05, 48, 48]} />
            <meshBasicMaterial color="#7fa6ff" transparent opacity={0.085} depthWrite={false} />
          </mesh>
        </group>
      </Float>

      <mesh position={[0, 3.25, -3.3]}>
        <capsuleGeometry args={[0.28, 2.7, 10, 18]} />
        <meshStandardMaterial color="#184bff" emissive="#3b73ff" emissiveIntensity={0.4} roughness={0.22} metalness={0.15} />
      </mesh>

      <mesh
        position={[4.6, 5.0, -9.6]}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "home") homeToLifemap();
        }}
      >
        <planeGeometry args={[7.5, 5.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      <mesh
        position={[-4.7, 2.6, -4.0]}
        onClick={(e) => {
          e.stopPropagation();
          if (mode === "home") enterGround();
        }}
      >
        <planeGeometry args={[8.0, 4.0]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </group>
  );
}
