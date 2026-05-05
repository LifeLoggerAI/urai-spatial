"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AdditiveBlending, Color, type Mesh, type MeshBasicMaterial } from "three";
import type { CinematicPattern } from "./cinematicPatterns";
import { createCinematicPattern } from "./cinematicPatterns";

type EnvironmentEventDetail = {
  archetype?: string;
  intervention?: {
    interventionType?: string;
  };
  directive?: {
    mode?: string;
    immediate?: boolean;
  };
};

type ActivePattern = CinematicPattern & {
  id: string;
  startedAt: number;
};

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function colorForPattern(kind: CinematicPattern["kind"]) {
  switch (kind) {
    case "ripple":
      return "#8fd7ff";
    case "threshold":
      return "#d7a5ff";
    case "bloom":
      return "#b9ffe8";
    case "focus":
      return "#dbeafe";
    case "spark":
      return "#ffd08a";
    default:
      return "#ffffff";
  }
}

export default function CinematicRenderer() {
  const { camera } = useThree();
  const ringRefs = useRef<Array<Mesh | null>>([]);
  const rootRef = useRef<Mesh>(null);
  const baseCameraZ = useRef(camera.position.z);
  const [activePattern, setActivePattern] = useState<ActivePattern | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onEnvironment = (event: Event) => {
      const detail = (event as CustomEvent<EnvironmentEventDetail>).detail;
      const pattern = createCinematicPattern({
        directiveMode: detail?.directive?.mode,
        interventionType: detail?.intervention?.interventionType,
        archetype: detail?.archetype,
      });

      if (pattern.kind === "none") return;

      setActivePattern({
        ...pattern,
        id: `pattern_${Date.now()}`,
        startedAt: performance.now(),
      });
    };

    window.addEventListener("urai:environment", onEnvironment);
    return () => window.removeEventListener("urai:environment", onEnvironment);
  }, []);

  const rings = useMemo(() => Array.from({ length: 6 }, (_, index) => index), []);

  useFrame(() => {
    if (!activePattern) return;

    const now = performance.now();
    const elapsed = now - activePattern.startedAt;
    const totalDuration = activePattern.durationMs + activePattern.staggerMs * activePattern.ringCount;

    if (elapsed > totalDuration) {
      setActivePattern(null);
      camera.position.z += (baseCameraZ.current - camera.position.z) * 0.08;
      return;
    }

    const patternColor = new Color(colorForPattern(activePattern.kind));

    ringRefs.current.forEach((ring, index) => {
      if (!ring) return;
      const material = ring.material as MeshBasicMaterial;
      const ringElapsed = elapsed - index * activePattern.staggerMs;
      const progress = clamp01(ringElapsed / Math.max(1, activePattern.durationMs));
      const eased = activePattern.transition === "snap" ? progress : easeOut(progress);
      const visible = index < activePattern.ringCount && ringElapsed >= 0 && progress < 1;
      const scale = activePattern.scaleFrom + (activePattern.scaleTo - activePattern.scaleFrom) * eased;
      const opacity = activePattern.opacityFrom + (activePattern.opacityTo - activePattern.opacityFrom) * eased;

      ring.visible = visible;
      ring.scale.setScalar(reducedMotion ? activePattern.scaleTo : scale);
      material.opacity = reducedMotion ? opacity * 0.35 : opacity;
      material.color.copy(patternColor);
    });

    if (!reducedMotion) {
      const cameraPulse = Math.sin(clamp01(elapsed / Math.max(1, activePattern.durationMs)) * Math.PI);
      const direction = activePattern.kind === "focus" ? -1 : 1;
      camera.position.z = baseCameraZ.current + cameraPulse * 0.08 * direction;
    }
  });

  return (
    <group name="cinematic-renderer" position={[-0.52, 0.03, 0]} renderOrder={20}>
      {rings.map((index) => (
        <mesh
          key={index}
          ref={(node) => {
            ringRefs.current[index] = node;
          }}
          rotation={[-Math.PI / 2, 0, 0]}
          visible={false}
          renderOrder={20 + index}
        >
          <ringGeometry args={[0.72 + index * 0.06, 0.78 + index * 0.06, 96]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0}
            depthWrite={false}
            blending={AdditiveBlending}
          />
        </mesh>
      ))}
      <mesh ref={rootRef} visible={false} />
    </group>
  );
}
