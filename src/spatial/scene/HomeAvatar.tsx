"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type HomeAvatarProps = {
  interactive?: boolean;
  focused?: boolean;
  position?: [number, number, number];
  lowPoly?: boolean;
};

export default function HomeAvatar({
  interactive = true,
  focused = false,
  position = [-0.52, 0.17, 0.34],
  lowPoly = false,
}: HomeAvatarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const baseRingRef = useRef<THREE.Mesh>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);

    onChange();
    media.addEventListener("change", onChange);

    return () => media.removeEventListener("change", onChange);
  }, []);

  const bodyColor = useMemo(
    () => new THREE.Color(focused ? "#eff8ff" : "#dbeafe"),
    [focused]
  );

  const auraColor = focused ? "#c7f2ff" : "#79d7ff";

  useFrame(({ clock }) => {
    const root = rootRef.current;
    if (!root) return;

    const t = clock.getElapsedTime();
    const amplitude = reducedMotion ? 0.006 : 0.018;
    const sway = reducedMotion ? 0.006 : 0.026;

    root.position.y = position[1] + Math.sin(t * 1.12) * amplitude;
    root.rotation.y = Math.sin(t * 0.52) * sway;

    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = focused ? 0.34 : interactive ? 0.16 : 0.08;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.68) * 0.045;
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(t * 0.9) * 0.025);
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = focused ? 0.12 : 0.075;
    }

    if (baseRingRef.current) {
      baseRingRef.current.rotation.z = reducedMotion ? 0 : t * 0.08;
      const mat = baseRingRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = focused ? 0.18 : 0.1;
    }
  });

  return (
    <group ref={rootRef} position={position}>
      <mesh ref={auraRef} position={[0, 0.58, -0.02]} renderOrder={1}>
        <sphereGeometry args={[0.46, 32, 32]} />
        <meshBasicMaterial
          color={auraColor}
          transparent
          opacity={0.075}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={bodyRef} position={[0, 0.42, 0]} castShadow receiveShadow>
        <capsuleGeometry args={lowPoly ? [0.105, 0.38, 3, 8] : [0.105, 0.42, 6, 14]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.5}
          metalness={0.06}
          emissive={auraColor}
          emissiveIntensity={0.16}
          transparent
          opacity={0.74}
        />
      </mesh>

      <mesh ref={headRef} position={[0, 0.8, 0.025]} castShadow>
        {lowPoly ? (
          <icosahedronGeometry args={[0.135, 0]} />
        ) : (
          <sphereGeometry args={[0.135, 22, 22]} />
        )}
        <meshStandardMaterial
          color="#f8fbff"
          roughness={0.34}
          metalness={0.04}
          emissive={auraColor}
          emissiveIntensity={focused ? 0.42 : 0.22}
          transparent
          opacity={0.86}
        />
      </mesh>

      <mesh
        ref={baseRingRef}
        position={[0, 0.018, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <ringGeometry args={[0.19, 0.34, 48]} />
        <meshBasicMaterial
          color="#9eeaff"
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh
        position={[0, 0.014, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#02050c" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
}
