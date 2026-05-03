import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type HomeEnvironmentProps = {
  visible?: boolean;
  interactive?: boolean;
  dim?: number;
  phase?: string;
  onSkySelect?: () => void;
  onGroundSelect?: () => void;
  onOrbSelect?: () => void;
};

function EmbeddedOrb({
  dim = 0,
  interactive = true,
  onOrbSelect,
}: {
  dim?: number;
  interactive?: boolean;
  onOrbSelect?: () => void;
}) {
  const orbRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pulse = 0.92 + Math.sin(t * 0.55) * 0.05;

    if (orbRef.current) {
      orbRef.current.position.y = 0.9 + Math.sin(t * 0.45) * 0.03;
      orbRef.current.rotation.y += 0.0018;
      const mat = orbRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = (0.72 - dim * 0.18) * pulse;
    }

    if (glowRef.current) {
      glowRef.current.intensity = (2.8 - dim * 0.5) * pulse;
    }
  });

  return (
    <group position={[3.2, 0, -6.6]}>
      <mesh position={[0.08, 0.04, 0.14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.9, 64]} />
        <meshStandardMaterial color="#162131" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[0.08, 0.08, 0.14]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[1.6, 3.1, 64]} />
        <meshStandardMaterial color="#253247" roughness={1} metalness={0} transparent opacity={0.96} />
      </mesh>

      <mesh position={[0.1, 0.34, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[2.3, 64, 64]} />
        <meshStandardMaterial color="#162334" roughness={1} metalness={0} />
      </mesh>

      <mesh
        ref={orbRef}
        position={[0, 0.9, 0]}
        castShadow
        receiveShadow
        onPointerDown={interactive ? () => onOrbSelect?.() : undefined}
      >
        <sphereGeometry args={[1.32, 64, 64]} />
        <meshStandardMaterial
          color="#9fd0ff"
          emissive="#6da8ff"
          emissiveIntensity={0.72}
          roughness={0.22}
          metalness={0.04}
        />
      </mesh>

      <mesh position={[0, 0.9, 0]} renderOrder={2}>
        <sphereGeometry args={[1.38, 48, 48]} />
        <meshBasicMaterial color="#77a8ff" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <pointLight
        ref={glowRef}
        position={[0.2, 1.9, 0.25]}
        color="#8dc0ff"
        intensity={2.8}
        distance={18}
        decay={2}
      />
    </group>
  );
}

export function HomeEnvironment({
  visible = true,
  interactive = true,
  dim = 0,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
}: HomeEnvironmentProps) {
  if (!visible) return null;

  return (
    <group visible={visible}>
      <color attach="background" args={['#22344a']} />
      <fog attach="fog" args={['#22344a', 18, 88]} />

      <hemisphereLight color="#c3dbff" groundColor="#10151d" intensity={1.15 - dim * 0.2} />
      <ambientLight intensity={0.36 - dim * 0.06} />
      <directionalLight
        position={[-10, 15, 9]}
        intensity={2.3 - dim * 0.3}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[12, 7, -8]} intensity={0.62 - dim * 0.08} color="#7ea6d9" />
      <pointLight position={[-7, 4, -2]} intensity={0.5 - dim * 0.08} color="#8fb3e0" distance={36} />

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.04, -4]}
        receiveShadow
        onPointerDown={interactive ? () => onGroundSelect?.() : undefined}
      >
        <planeGeometry args={[96, 96, 1, 1]} />
        <meshStandardMaterial color="#1a2637" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, -0.12]} position={[-5.8, 0.18, -2.1]} receiveShadow>
        <circleGeometry args={[9.2, 64]} />
        <meshStandardMaterial color="#2d4057" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0.16]} position={[4.9, 0.12, -9.4]} receiveShadow>
        <circleGeometry args={[11.8, 64]} />
        <meshStandardMaterial color="#233347" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-10.8, 2.25, -3.3]} scale={[9.2, 4.7, 6.0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#0f1822" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[12.2, 1.95, -5.8]} scale={[7.8, 4.2, 5.4]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#121c28" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-3.8, 1.55, -11.2]} scale={[7.0, 3.0, 4.1]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#2a3b50" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[8.2, 2.0, -13.1]} scale={[8.8, 3.5, 5.0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#31445b" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[1.4, 3.2, -18.2]} scale={[12.5, 5.6, 6.0]} castShadow receiveShadow>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color="#44566d" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-12.8, 4.8, -21.5]} scale={[5.8, 12.2, 5.8]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.8, 1, 32]} />
        <meshStandardMaterial color="#3c5068" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[13.4, 5.0, -22.3]} scale={[5.4, 12.8, 5.4]} castShadow receiveShadow>
        <cylinderGeometry args={[0.9, 1.7, 1, 32]} />
        <meshStandardMaterial color="#42566e" roughness={1} metalness={0} />
      </mesh>

      <mesh position={[-2.2, 0.74, -1.5]} rotation={[0.08, -0.28, -0.08]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1.05, 1]} />
        <meshStandardMaterial color="#6a8eb1" roughness={0.58} metalness={0.16} emissive="#1a2f4f" emissiveIntensity={0.26} />
      </mesh>

      <mesh position={[-0.9, 0.18, -0.45]} rotation={[-Math.PI / 2, 0, 0.28]} receiveShadow>
        <ringGeometry args={[1.25, 2.5, 48]} />
        <meshStandardMaterial color="#33475e" roughness={1} metalness={0} transparent opacity={0.94} />
      </mesh>

      <mesh position={[6.0, 0.56, -2.95]} rotation={[0.02, 0.46, 0]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.92, 1]} />
        <meshStandardMaterial color="#7da0c5" roughness={0.5} metalness={0.2} emissive="#29466f" emissiveIntensity={0.22} />
      </mesh>

      <mesh position={[8.0, 0.33, -5.8]} rotation={[-Math.PI / 2, 0, -0.24]} receiveShadow>
        <circleGeometry args={[1.28, 40]} />
        <meshStandardMaterial color="#425870" roughness={1} metalness={0} />
      </mesh>

      <EmbeddedOrb dim={dim} interactive={interactive} onOrbSelect={onOrbSelect} />

      <mesh position={[0, 8, -20]} onPointerDown={interactive ? () => onSkySelect?.() : undefined}>
        <sphereGeometry args={[48, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <meshBasicMaterial color="#9bbef0" transparent opacity={0.003} side={THREE.BackSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default HomeEnvironment;
