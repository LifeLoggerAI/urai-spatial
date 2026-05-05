"use client";

import { useRef, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, type Mesh, type MeshStandardMaterial } from "three";
import { useSceneStore } from "../state/sceneStore";

export default function GroundWorld() {
  const phase = useSceneStore((s) => s.phase);

  const emissiveRingRef = useRef<Mesh>(null);
  const contactShadowRef = useRef<Mesh>(null);
  const shimmerMaterialRef = useRef<MeshStandardMaterial | null>(null);

  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const hoverPulse = 0.5 + 0.5 * Math.sin(t * 1.15);

    // --- emissive ring ---
    if (emissiveRingRef.current) {
      const mat = emissiveRingRef.current.material as { opacity: number };
      mat.opacity = 0.08 + hoverPulse * 0.05;
    }

    // --- contact shadow ---
    if (contactShadowRef.current) {
      const mat = contactShadowRef.current.material as { opacity: number };
      mat.opacity = 0.22 + hoverPulse * 0.08;
      contactShadowRef.current.scale.setScalar(1 + hoverPulse * 0.045);
    }

    // --- shimmer ring (phase-aware) ---
    const shimmerMat = shimmerMaterialRef.current;
    if (!shimmerMat) return;

    if (phase === "HOME" && !reducedMotion) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.45);
      shimmerMat.opacity = 0.05 + pulse * 0.045;
      shimmerMat.emissiveIntensity = 0.05 + pulse * 0.12;
    } else {
      shimmerMat.opacity = 0.05;
      shimmerMat.emissiveIntensity = 0.05;
    }
  });

  return (
    <group>
      {/* ... your JSX unchanged ... */}
    </group>
  );
}