"use client";

import * as THREE from "three";
import { Stars } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";

type HomeEnvironmentProps = {
  visible?: boolean;
  interactive?: boolean;
  dim?: number;
  phase?: string;
  onSkySelect?: () => void;
  onGroundSelect?: () => void;
  onOrbSelect?: () => void;
  ascentOffset?: number;
  opacity?: number;
};

const GROUND_RADIUS = 40;
const GROUND_Y = -1.15;
const ORB_Y = 0.2;
const SKY_RADIUS = 120;

const ORB_BASE_COLOR = "#cfd8ff";
const ORB_EMISSIVE = "#7da6ff";

export default function HomeEnvironment({
  opacity = 1,
  visible = true,
  interactive = true,
  dim = 0,
  onSkySelect,
  onGroundSelect,
  onOrbSelect,
  ascentOffset = 0,
}: HomeEnvironmentProps) {
  const rootRef = useRef<THREE.Group>(null);
  const orbGroupRef = useRef<THREE.Group>(null);
  const ringARef = useRef<THREE.Mesh>(null);
  const ringBRef = useRef<THREE.Mesh>(null);

  const safeOpacity = useMemo(() => {
    const v = 1 - Math.min(0.85, Math.max(0, dim));
    return visible ? v * opacity : 0;
  }, [dim, visible, opacity]);

  useFrame((state) => {
    if (!rootRef.current || !orbGroupRef.current || !ringARef.current || !ringBRef.current) return;

    const t = state.clock.elapsedTime;
    const ascent = Math.max(0, Math.min(1, ascentOffset));
    const lift = 1 - Math.pow(1 - ascent, 3);

    rootRef.current.position.y = -lift * 2.2;

    orbGroupRef.current.position.y = ORB_Y + Math.sin(t * 0.8) * 0.03 - lift * 1.1;
    orbGroupRef.current.position.z = -lift * 0.9;
    orbGroupRef.current.rotation.y = t * 0.12;

    ringARef.current.rotation.z += 0.0015;
    ringARef.current.rotation.y = Math.sin(t * 0.15) * 0.08;
    ringARef.current.scale.setScalar(1 - lift * 0.06);

    ringBRef.current.rotation.z -= 0.0011;
    ringBRef.current.rotation.x = Math.cos(t * 0.12) * 0.05;
    ringBRef.current.scale.setScalar(1 - lift * 0.10);
  });

  return (
    <group ref={rootRef} visible={visible} scale={1}>
      <group>
        <mesh
          position={[0, GROUND_Y, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={interactive ? onGroundSelect : undefined}
        >
          <circleGeometry args={[GROUND_RADIUS, 128]} />
          <meshStandardMaterial
            color="#18264a"
            roughness={0.95}
            metalness={0}
            transparent
            opacity={0.95 * safeOpacity}
          />
        </mesh>

        <mesh position={[0, GROUND_Y + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[GROUND_RADIUS * 0.6, 64]} />
          <meshBasicMaterial
            color="#0b1328"
            transparent
            opacity={0.35 * safeOpacity}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, GROUND_Y + 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[4.5, 12, 96]} />
          <meshBasicMaterial
            color="#162447"
            transparent
            opacity={0.08 * safeOpacity}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={orbGroupRef} position={[0, ORB_Y, 0]}>
        <mesh onClick={interactive ? onOrbSelect : undefined}>
          <sphereGeometry args={[0.6, 64, 64]} />
          <meshStandardMaterial
            color={ORB_BASE_COLOR}
            emissive={ORB_EMISSIVE}
            emissiveIntensity={0.9}
            roughness={0.25}
            metalness={0.1}
            transparent
            opacity={safeOpacity}
          />
        </mesh>

        <mesh scale={1.42}>
          <sphereGeometry args={[0.6, 48, 48]} />
          <meshBasicMaterial
            color="#7da6ff"
            transparent
            opacity={0.08 * safeOpacity}
            depthWrite={false}
          />
        </mesh>

        <mesh scale={2.0}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <meshBasicMaterial
            color="#4a6fff"
            transparent
            opacity={0.04 * safeOpacity}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={ringARef} rotation={[Math.PI / 2.4, 0, 0]}>
          <torusGeometry args={[1.4, 0.015, 16, 100]} />
          <meshBasicMaterial
            color="#9fb6ff"
            transparent
            opacity={0.18 * safeOpacity}
            depthWrite={false}
          />
        </mesh>

        <mesh ref={ringBRef} rotation={[Math.PI / 2.4, 0.6, 0]}>
          <torusGeometry args={[1.6, 0.01, 16, 100]} />
          <meshBasicMaterial
            color="#9fb6ff"
            transparent
            opacity={0.12 * safeOpacity}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group>
        <mesh onClick={interactive ? onSkySelect : undefined}>
          <sphereGeometry args={[SKY_RADIUS, 64, 64]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.BackSide} depthWrite={false} depthTest={false} />
        </mesh>


      </group>
    </group>
  );
}

      {/* CUSTOM SKY STARFIELD (NO SPHERE) */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={1200}
            array={new Float32Array(Array.from({length: 3600}, () => (Math.random()-0.5)*200))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.6} sizeAttenuation transparent opacity={0.6} color="#ffffff" depthWrite={false} />
      </points>
