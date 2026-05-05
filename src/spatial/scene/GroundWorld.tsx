"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Mesh } from "three";

export default function GroundWorld() {
  const emissiveRingRef = useRef<Mesh>(null);
  const contactShadowRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const hoverPulse = 0.5 + 0.5 * Math.sin(t * 1.15);

    if (emissiveRingRef.current) {
      const mat = emissiveRingRef.current.material as { opacity: number };
      mat.opacity = 0.08 + hoverPulse * 0.05;
    }

    if (contactShadowRef.current) {
      const mat = contactShadowRef.current.material as { opacity: number };
      mat.opacity = 0.22 + hoverPulse * 0.08;
      contactShadowRef.current.scale.setScalar(1 + hoverPulse * 0.045);
    }
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial color="#02040a" roughness={1} metalness={0.01} />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.009, -0.05]}
        receiveShadow
        renderOrder={2}
      >
        <circleGeometry args={[1.15, 64]} />
        <shadowMaterial transparent opacity={0.26} />
      </mesh>

      <mesh
        ref={contactShadowRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.011, 0]}
        receiveShadow
        renderOrder={3}
      >
        <ringGeometry args={[0.58, 1.02, 64]} />
        <meshBasicMaterial
          color="#050a18"
          transparent
          opacity={0.26}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      <mesh
        ref={emissiveRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.013, 0]}
        renderOrder={4}
      >
        <ringGeometry args={[1.0, 1.45, 96]} />
        <meshBasicMaterial
          color="#73c5ff"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={AdditiveBlending}
          polygonOffset
          polygonOffsetFactor={-3}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.012, 0]}
        renderOrder={5}
      >
        <ringGeometry args={[1.46, 1.9, 96]} />
        <meshBasicMaterial
          color="#6fb7ff"
          transparent
          opacity={0.05}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-4}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.007, 0]}
        receiveShadow
        renderOrder={1}
      >
        <ringGeometry args={[0.3, 3.2, 128]} />
        <meshStandardMaterial
          color="#091327"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.07}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, -0.45]} receiveShadow renderOrder={-1}>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#03091a" roughness={1} metalness={0} transparent opacity={0.22} />
      </mesh>
    </group>
  );
}
