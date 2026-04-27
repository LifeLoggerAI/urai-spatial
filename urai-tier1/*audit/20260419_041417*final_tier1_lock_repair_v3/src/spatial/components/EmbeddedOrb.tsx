import * as React from 'react';

type EmbeddedOrbProps = {
  position?: [number, number, number];
  scale?: number;
  interactive?: boolean;
  dim?: boolean;
  onSelect?: () => void;
};

export default function EmbeddedOrb({
  position = [-0.9, -0.1, 0.28],
  scale = 1,
  interactive = false,
  dim = false,
  onSelect,
}: EmbeddedOrbProps) {
  const clickProps = interactive && onSelect ? { onClick: onSelect } : {};
  const emissiveIntensity = dim ? 0.18 : 0.42;
  const haloOpacity = dim ? 0.07 : 0.12;

  return (
    <group position={position} scale={scale}>
      <mesh
        position={[0.04, -0.22, 0.08]}
        rotation={[-Math.PI / 2, 0.08, 0]}
        receiveShadow
        renderOrder={1}
      >
        <circleGeometry args={[1.04, 48]} />
        <meshBasicMaterial color="#020611" transparent opacity={0.34} />
      </mesh>

      <mesh
        position={[0, -0.2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[0.54, 0.9, 48]} />
        <meshBasicMaterial color="#08224f" transparent opacity={0.2} />
      </mesh>

      <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.63, 48, 48]} />
        <meshStandardMaterial
          color="#030915"
          roughness={0.96}
          metalness={0.03}
        />
      </mesh>

      <mesh
        position={[0, -0.02, 0]}
        castShadow
        receiveShadow
        {...clickProps}
      >
        <sphereGeometry args={[0.55, 64, 64]} />
        <meshStandardMaterial
          color="#afc7ff"
          roughness={0.22}
          metalness={0.08}
          emissive="#173d8f"
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>

      <mesh position={[0, -0.18, 0]} scale={[1.05, 0.72, 1.05]} receiveShadow>
        <sphereGeometry args={[0.62, 48, 48]} />
        <meshStandardMaterial
          color="#05101f"
          roughness={0.9}
          metalness={0.02}
        />
      </mesh>

      <mesh
        position={[0.02, -0.05, 0.02]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry args={[0.88, 0.1, 20, 72]} />
        <meshBasicMaterial color="#2b69ff" transparent opacity={haloOpacity} />
      </mesh>

      <pointLight
        position={[-0.22, 0.36, 0.28]}
        intensity={dim ? 0.36 : 0.62}
        distance={6.4}
        decay={2}
        color="#6fa3ff"
      />
    </group>
  );
}
