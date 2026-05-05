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
  position = [-1.08, 0.62, 0.18],
  lowPoly = false,
}: HomeAvatarProps) {
  const rootRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
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

  const auraColor = focused ? "#a7e3ff" : "#5fc7ff";

  useFrame(({ clock }) => {
    const root = rootRef.current;
    if (!root) return;

    const t = clock.getElapsedTime();
    const amplitude = reducedMotion ? 0.01 : 0.035;
    const sway = reducedMotion ? 0.015 : 0.06;

    root.position.y = position[1] + Math.sin(t * 1.3) * amplitude;
    root.rotation.y = Math.sin(t * 0.6) * sway;

    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = focused ? 0.36 : interactive ? 0.18 : 0.1;
    }

    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t * 0.75) * 0.08;
    }
  });

  return (
    <group ref={rootRef} position={position}>
      <mesh ref={bodyRef} position={[0, 0.55, 0]} castShadow receiveShadow>
        <capsuleGeometry args={lowPoly ? [0.12, 0.46, 3, 8] : [0.12, 0.5, 6, 12]} />
        <meshStandardMaterial
          color={bodyColor}
          roughness={0.48}
          metalness={0.08}
          emissive={auraColor}
          emissiveIntensity={0.18}
        />
      </mesh>

      <mesh ref={headRef} position={[0, 0.95, 0.03]} castShadow>
        {lowPoly ? (
          <icosahedronGeometry args={[0.16, 0]} />
        ) : (
          <sphereGeometry args={[0.16, 20, 20]} />
        )}
        <meshStandardMaterial
          color="#f8fbff"
          roughness={0.35}
          metalness={0.04}
          emissive={auraColor}
          emissiveIntensity={focused ? 0.42 : 0.22}
        />
      </mesh>

      <mesh
        position={[0, 0.03, 0]}
        receiveShadow
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1}
      >
        <circleGeometry args={[0.22, 24]} />
        <meshBasicMaterial
          color="#6fd7ff"
          transparent
          opacity={focused ? 0.22 : 0.12}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}