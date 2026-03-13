
"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function Nebula() {
  const meshRef = useRef<THREE.Mesh>(null!);

  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(256, 256, 0, 256, 256, 256);
    gradient.addColorStop(0, "rgba(255,255,255,0.2)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -100]} scale={[200, 200, 200]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        blending={THREE.AdditiveBlending}
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  );
}
