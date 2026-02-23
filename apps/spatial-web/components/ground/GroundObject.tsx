import { useState, useRef, useEffect } from "react";
import { useGroundState, GroundObject as GroundObjectType } from "./ground-state";
import { Text } from "@react-three/drei";
import { DURATION_FAST, EASE_STANDARD } from "../../lib/motion";
import { Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import gsap from 'gsap';

// Shape component for geometric differentiation
function Shape({ type }: { type: GroundObjectType['type'] }) {
  switch (type) {
    case "home":
      return <boxGeometry args={[2, 1.2, 2]} />;
    case "work":
      return <boxGeometry args={[1.5, 3, 1.5]} />;
    case "relationship":
      return <cylinderGeometry args={[0.6, 0.6, 1.8, 16]} />;
    case "health":
      return <boxGeometry args={[0.6, 2.5, 0.6]} />;
    case "finance":
      return <boxGeometry args={[1.2, 1, 1.2]} />;
    default:
      return <boxGeometry args={[1.5, 1.5, 1.5]} />;
  }
}

export default function GroundObject({ data }: { data: GroundObjectType }) {
  const [hovered, setHovered] = useState(false);
  const select = useGroundState((s) => s.select);
  const selected = useGroundState((s) => s.selected);

  const isSelected = selected === data.id;
  const intensity = data.intensity ?? 0.5;

  const meshRef = useRef<Mesh>(null!);

  useEffect(() => {
    if (!meshRef.current) return;

    // Animate scale
    gsap.to(meshRef.current.scale, {
      x: isSelected ? 1.2 : 1 + intensity * 0.05,
      y: isSelected ? 1.2 : 1 + intensity * 0.05,
      z: isSelected ? 1.2 : 1 + intensity * 0.05,
      duration: DURATION_FAST,
      ease: EASE_STANDARD,
    });

    // Animate color
    gsap.to(meshRef.current.material.color, {
      r: isSelected ? 0.372 : hovered ? 0.29 : 0.164,
      g: isSelected ? 0.658 : hovered ? 0.29 : 0.164,
      b: isSelected ? 1.0 : hovered ? 0.29 : 0.164,
      duration: DURATION_FAST,
      ease: EASE_STANDARD,
    });

  }, [isSelected, hovered, intensity]);

  return (
    <mesh
      ref={meshRef}
      position={data.position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={() => select(data.id)}
      castShadow
      receiveShadow
    >
      <Shape type={data.type} />
      <meshStandardMaterial
        color="#2a2a2a"
        emissive="#3a6aff"
        emissiveIntensity={intensity * 0.4}
        roughness={0.9}
      />
      {hovered && (
        <Text
          position={[0, data.type === 'work' ? 2.2 : 1.5, 0]}
          fontSize={0.4}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {data.label}
        </Text>
      )}
    </mesh>
  );
}
