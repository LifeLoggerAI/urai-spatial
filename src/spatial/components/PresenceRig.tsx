"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group, Mesh, Vector3Tuple } from "three";

import type { ScenePhase } from "../state/sceneStore";

type PresenceRigProps = {
  visible: boolean;
  phase: ScenePhase;
  focusTarget?: Vector3Tuple;
};

const AVATAR_BASE_POS: Vector3Tuple = [-0.96, 0.02, -0.14];
const HEAD_OFFSET: Vector3Tuple = [0, 0.52, 0.01];

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();

    query.addEventListener("change", sync);

    return () => {
      query.removeEventListener("change", sync);
    };
  }, []);

  return reduced;
}

export default function PresenceRig({ visible, phase, focusTarget }: PresenceRigProps) {
  const groupRef = useRef<Group>(null);
  const headRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const reducedMotion = useReducedMotion();

  const targetVisible = visible && (phase === "HOME" || phase === "ASCENT");

  const lookTarget = useMemo<Vector3Tuple>(() => {
    if (focusTarget) return focusTarget;
    return [-0.52, 0.38, -0.05];
  }, [focusTarget]);

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime();

    const root = groupRef.current;
    if (!root) return;

    const fadeSpeed = phase === "LIFEMAP" ? 3.6 : 4.4;
    const targetOpacity = targetVisible ? 1 : 0;
    root.traverse((obj) => {
      const anyObj = obj as { material?: { transparent?: boolean; opacity?: number } | { transparent?: boolean; opacity?: number }[] };
      const material = anyObj.material;
      if (!material) return;

      const lerpMaterial = (m: { transparent?: boolean; opacity?: number }) => {
        m.transparent = true;
        const current = m.opacity ?? 1;
        m.opacity = current + (targetOpacity - current) * Math.min(1, fadeSpeed * delta);
      };

      if (Array.isArray(material)) {
        material.forEach(lerpMaterial);
      } else {
        lerpMaterial(material);
      }
    });

    if (reducedMotion) {
      root.position.set(AVATAR_BASE_POS[0], AVATAR_BASE_POS[1], AVATAR_BASE_POS[2]);
      root.rotation.set(0, 0.16, 0);
    } else {
      const breath = Math.sin(t * 1.7) * 0.016;
      const sway = Math.sin(t * 0.8) * 0.065;
      root.position.set(AVATAR_BASE_POS[0], AVATAR_BASE_POS[1] + breath, AVATAR_BASE_POS[2]);
      root.rotation.set(0, 0.16 + sway, 0);
    }

    if (phase === "HOME" && headRef.current) {
      headRef.current.lookAt(lookTarget[0], lookTarget[1], lookTarget[2]);
    }

    if (shadowRef.current) {
      const pulse = reducedMotion ? 1 : 0.95 + Math.sin(t * 1.7) * 0.04;
      shadowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={groupRef} position={AVATAR_BASE_POS}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} receiveShadow>
        <circleGeometry args={[0.33, 24]} />
        <shadowMaterial opacity={0.28} />
      </mesh>

      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 26]} />
        <meshBasicMaterial color="#7ec6ff" transparent opacity={0.08} depthWrite={false} />
      </mesh>

      <mesh castShadow receiveShadow position={[0, 0.24, 0]}>
        <capsuleGeometry args={[0.11, 0.34, 8, 14]} />
        <meshStandardMaterial color="#d7e4ff" roughness={0.82} metalness={0.02} />
      </mesh>

      <mesh ref={headRef} castShadow receiveShadow position={HEAD_OFFSET}>
        <sphereGeometry args={[0.12, 14, 14]} />
        <meshStandardMaterial color="#eaf1ff" roughness={0.76} metalness={0.03} />
      </mesh>
    </group>
  );
}
