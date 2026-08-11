"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type HomeAvatarProps = {
  interactive?: boolean;
  focused?: boolean;
  position?: [number, number, number];
  lowPoly?: boolean;
};

function Limb({
  position,
  rotation = [0, 0, 0],
  radius,
  length,
  color,
  skin = false,
  lowPoly = false,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  radius: number;
  length: number;
  color: string;
  skin?: boolean;
  lowPoly?: boolean;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <capsuleGeometry args={[radius, length, lowPoly ? 3 : 7, lowPoly ? 8 : 14]} />
      <meshStandardMaterial color={color} roughness={skin ? 0.56 : 0.9} metalness={0.01} />
    </mesh>
  );
}

export default function HomeAvatar({
  interactive = true,
  focused = false,
  position = [-0.52, 0.17, 0.34],
  lowPoly = false,
}: HomeAvatarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const accentRef = useRef<THREE.Mesh>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useFrame(({ clock }) => {
    if (!rootRef.current) return;
    const t = clock.getElapsedTime();
    const breath = reducedMotion ? 0 : Math.sin(t * 1.45) * 0.004;
    rootRef.current.position.y = position[1] + breath;
    rootRef.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.28) * 0.006;
    if (headRef.current) {
      headRef.current.rotation.y = reducedMotion ? 0 : Math.sin(t * 0.22) * 0.024;
      headRef.current.rotation.x = reducedMotion ? 0 : Math.sin(t * 0.16) * 0.006;
    }
    if (accentRef.current) {
      const material = accentRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = focused ? 0.2 : interactive ? 0.08 : 0.04;
    }
  });

  const skin = "#b77d63";
  const hair = "#241a16";
  const shirt = focused ? "#405b70" : "#394b5a";
  const trousers = "#242a30";
  const shoes = "#17191b";
  const accent = focused ? "#b8ebff" : "#8bcbe8";

  return (
    <group
      ref={rootRef}
      position={position}
      name="home-human-presence"
      userData={{
        representation: "human-proportioned-runtime-presence",
        realWorldHeightMeters: 1.78,
        replaceableByRiggedGlb: true,
      }}
    >
      {/* Shoes and grounded feet */}
      <mesh position={[-0.09, 0.07, 0.04]} scale={[0.09, 0.055, 0.18]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={shoes} roughness={0.84} />
      </mesh>
      <mesh position={[0.09, 0.07, 0.04]} scale={[0.09, 0.055, 0.18]} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={shoes} roughness={0.84} />
      </mesh>

      {/* Legs */}
      <Limb position={[-0.085, 0.39, 0]} radius={0.066} length={0.43} color={trousers} lowPoly={lowPoly} />
      <Limb position={[0.085, 0.39, 0]} radius={0.066} length={0.43} color={trousers} lowPoly={lowPoly} />
      <Limb position={[-0.09, 0.78, 0]} radius={0.078} length={0.39} color={trousers} lowPoly={lowPoly} />
      <Limb position={[0.09, 0.78, 0]} radius={0.078} length={0.39} color={trousers} lowPoly={lowPoly} />

      {/* Pelvis and torso */}
      <mesh position={[0, 1.0, 0]} scale={[0.22, 0.16, 0.14]} castShadow>
        <sphereGeometry args={[1, lowPoly ? 10 : 20, lowPoly ? 8 : 16]} />
        <meshStandardMaterial color={trousers} roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.26, 0]} scale={[0.27, 0.34, 0.155]} castShadow receiveShadow>
        <capsuleGeometry args={[0.58, 0.72, lowPoly ? 3 : 7, lowPoly ? 10 : 18]} />
        <meshStandardMaterial color={shirt} roughness={0.88} metalness={0.01} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 1.52, 0]} castShadow>
        <cylinderGeometry args={[0.058, 0.064, 0.13, lowPoly ? 10 : 16]} />
        <meshStandardMaterial color={skin} roughness={0.56} />
      </mesh>

      {/* Arms and hands */}
      <Limb position={[-0.29, 1.28, 0]} rotation={[0, 0, -0.09]} radius={0.055} length={0.28} color={shirt} lowPoly={lowPoly} />
      <Limb position={[0.29, 1.28, 0]} rotation={[0, 0, 0.09]} radius={0.055} length={0.28} color={shirt} lowPoly={lowPoly} />
      <Limb position={[-0.315, 1.02, 0.015]} radius={0.047} length={0.25} color={skin} skin lowPoly={lowPoly} />
      <Limb position={[0.315, 1.02, 0.015]} radius={0.047} length={0.25} color={skin} skin lowPoly={lowPoly} />
      {[-0.318, 0.318].map((x) => (
        <mesh key={x} position={[x, 0.82, 0.035]} scale={[0.052, 0.082, 0.04]} castShadow>
          <sphereGeometry args={[1, lowPoly ? 10 : 16, lowPoly ? 8 : 12]} />
          <meshStandardMaterial color={skin} roughness={0.56} />
        </mesh>
      ))}

      {/* Head, face and hair */}
      <group ref={headRef}>
        <mesh position={[0, 1.68, 0]} scale={[0.115, 0.145, 0.113]} castShadow receiveShadow>
          <sphereGeometry args={[1, lowPoly ? 14 : 26, lowPoly ? 10 : 20]} />
          <meshStandardMaterial color={skin} roughness={0.56} metalness={0} />
        </mesh>
        {[-0.116, 0.116].map((x) => (
          <mesh key={x} position={[x, 1.68, 0]} scale={[0.018, 0.035, 0.02]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={skin} roughness={0.56} />
          </mesh>
        ))}
        <mesh position={[0, 1.675, 0.112]} rotation={[Math.PI / 2, 0, 0]} scale={[0.017, 0.034, 0.017]}>
          <coneGeometry args={[1, 1.6, lowPoly ? 8 : 12]} />
          <meshStandardMaterial color={skin} roughness={0.56} />
        </mesh>
        {[-0.042, 0.042].map((x) => (
          <group key={x} position={[x, 1.704, 0.102]}>
            <mesh scale={[0.019, 0.011, 0.009]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshStandardMaterial color="#eef2ef" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0.009]} scale={[0.0065, 0.0065, 0.004]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color="#303936" roughness={0.25} />
            </mesh>
          </group>
        ))}
        <mesh position={[0, 1.625, 0.105]} scale={[0.035, 0.007, 0.008]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#7d4a42" roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.725, -0.045]} scale={[0.108, 0.088, 0.101]} castShadow>
          <sphereGeometry args={[1, lowPoly ? 12 : 20, lowPoly ? 8 : 16, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
          <meshStandardMaterial color={hair} roughness={0.96} />
        </mesh>
      </group>

      {/* Quiet symbolic accent: physical person remains visually primary. */}
      <mesh ref={accentRef} position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <ringGeometry args={[0.27, 0.33, lowPoly ? 32 : 64]} />
        <meshBasicMaterial color={accent} transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.008, 0.12]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.42, 1, 1]} renderOrder={0}>
        <circleGeometry args={[0.38, lowPoly ? 24 : 40]} />
        <meshBasicMaterial color="#050706" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
