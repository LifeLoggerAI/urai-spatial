'use client';

import { useThree, useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo } from 'react';
import { SharedMemoryArchetype } from '@/lib/storytime';

/**
 * The Abstraction Chamber: A data-driven liminal space for consenting to share a memory archetype.
 * The chamber's appearance is determined by the emotional valence and magnitude of the memory.
 */
export function AbstractionChamber({
  onConsent,
  onDeny,
  archetype,
}: {
  onConsent: () => void;
  onDeny: () => void;
  archetype: SharedMemoryArchetype;
}) {
  const { camera } = useThree();

  const chamberMaterial = new THREE.MeshBasicMaterial({ color: '#111', side: THREE.BackSide });
  const chamberGeometry = new THREE.SphereGeometry(20, 32, 32);

  // --- Archetype Visualization ---
  const { orbColor, orbIntensity, orbScale } = useMemo(() => {
    // Valence (-1 to 1) maps to color (cool blue to warm orange)
    const hue = 0.6 + archetype.valence * 0.15;
    const orbColor = new THREE.Color().setHSL(hue, 0.8, 0.6);

    // Magnitude (0 to 1) maps to intensity and scale
    const orbIntensity = 1.5 + archetype.magnitude * 4;
    const orbScale = 0.4 + archetype.magnitude * 0.8;
    return { orbColor, orbIntensity, orbScale };
  }, [archetype]);

  const orbMaterial = new THREE.MeshBasicMaterial({ color: orbColor, emissive: orbColor, emissiveIntensity: orbIntensity });
  const orbGeometry = new THREE.SphereGeometry(orbScale, 32, 32);

  useFrame((state) => {
    // Slow, calming rotation for the entire scene
    state.scene.rotation.y += 0.0002;
  });

  return (
    <group>
      <mesh geometry={chamberGeometry} material={chamberMaterial} />
      <mesh geometry={orbGeometry} material={orbMaterial} position={[0, 1, -5]} />

      {/* Display Keywords floating around the orb */}
      {archetype.keywords.map((keyword, i) => {
        const angle = (i / archetype.keywords.length) * Math.PI * 2;
        const radius = 2.5;
        return (
          <Text
            key={keyword}
            position={[Math.cos(angle) * radius, 1, -5 + Math.sin(angle) * radius]}
            rotation={[0, angle + Math.PI / 2, 0]}
            fontSize={0.2}
            color="#ccc"
            anchorX="center"
          >
            {keyword}
          </Text>
        );
      })}

      <Text position={[0, 3, -5]} fontSize={0.5} color="#fff" anchorX="center" anchorY="middle">
        Share this memory?
      </Text>
      <Text position={[0, 2.4, -5]} fontSize={0.2} color="#aaa" anchorX="center" anchorY="middle">
        An abstracted, anonymous version of this memory will be shared.
      </Text>

      {/* Consent & Deny Buttons */}
      <group position={[0, -1, -5]}>
        <mesh onClick={onConsent} position={[-1.5, 0, 0]}>
          <planeGeometry args={[2, 0.75]} />
          <meshBasicMaterial color="#007bff" transparent opacity={0.8} />
          <Text position={[0, 0, 0.1]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">
            Consent
          </Text>
        </mesh>
        <mesh onClick={onDeny} position={[1.5, 0, 0]}>
          <planeGeometry args={[2, 0.75]} />
          <meshBasicMaterial color="#6c757d" transparent opacity={0.8} />
          <Text position={[0, 0, 0.1]} fontSize={0.3} color="#fff" anchorX="center" anchorY="middle">
            Deny
          </Text>
        </mesh>
      </group>
    </group>
  );
}
