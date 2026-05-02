"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type URAISpatialVideoLockStarVolumeProps = {
  phase?: unknown;
};

function normalizePhase(value: unknown): string {
  if (typeof value === "string") return value.toUpperCase();

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["phase", "current", "value", "state", "name", "id"]) {
      const candidate = record[key];
      if (typeof candidate === "string") return candidate.toUpperCase();
    }
  }

  return String(value ?? "").toUpperCase();
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const NON_HOME_PHASES = new Set(["ASCENT", "LIFEMAP", "FOCUS", "REPLAY"]);
const HOME_LIFEMAP_HOLD_SECONDS = 3.45;

export function URAISpatialVideoLockStarVolume({ phase }: URAISpatialVideoLockStarVolumeProps) {
  const phaseName = normalizePhase(phase);

  const groupRef = useRef<THREE.Group | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const previousPhaseRef = useRef("");
  const homeHoldElapsedRef = useRef(HOME_LIFEMAP_HOLD_SECONDS + 1);

  const geometry = useMemo(() => {
    const random = seededRandom(734287);
    const count = 3600;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i += 1) {
      const band = random();
      const radius =
        band < 0.28 ? 34 + random() * 28 :
        band < 0.72 ? 66 + random() * 52 :
        122 + random() * 104;

      const angle = random() * Math.PI * 2;
      const vertical =
        (random() - 0.5) *
        (band < 0.28 ? 30 : band < 0.72 ? 62 : 104);

      const depth = -86 - random() * 190;

      positions[i * 3 + 0] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 22 + vertical;
      positions[i * 3 + 2] = depth + Math.sin(angle) * radius * 0.28;
    }

    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    bufferGeometry.computeBoundingSphere();
    return bufferGeometry;
  }, []);

  useFrame((_, delta) => {
    const previousPhase = previousPhaseRef.current;

    if (previousPhase !== phaseName) {
      if (phaseName === "HOME" && NON_HOME_PHASES.has(previousPhase)) {
        homeHoldElapsedRef.current = 0;
      } else if (phaseName !== "HOME") {
        homeHoldElapsedRef.current = HOME_LIFEMAP_HOLD_SECONDS + 1;
      }

      previousPhaseRef.current = phaseName;
    }

    if (phaseName === "HOME") {
      homeHoldElapsedRef.current += Math.min(Math.max(delta, 0), 1 / 20);
    }

    const isNonHome = NON_HOME_PHASES.has(phaseName);
    const isHomeHold = phaseName === "HOME" && homeHoldElapsedRef.current <= HOME_LIFEMAP_HOLD_SECONDS;
    const visible = isNonHome || isHomeHold;

    if (groupRef.current) {
      groupRef.current.visible = visible;
    }

    if (materialRef.current) {
      let opacity = 0;

      if (phaseName === "ASCENT") {
        opacity = 0.46;
      } else if (phaseName === "LIFEMAP") {
        opacity = 0.94;
      } else if (phaseName === "FOCUS" || phaseName === "REPLAY") {
        opacity = 0.76;
      } else if (isHomeHold) {
        opacity = 0.88 * (1 - smoothstep(homeHoldElapsedRef.current / HOME_LIFEMAP_HOLD_SECONDS));
      }

      materialRef.current.opacity = opacity;
      materialRef.current.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef} renderOrder={44}>
      <points
        geometry={geometry}
        frustumCulled={false}
        renderOrder={45}
        raycast={() => undefined}
      >
        <pointsMaterial
          ref={materialRef}
          color="#eef6ff"
          size={0.2}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          depthTest={false}
          fog={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default URAISpatialVideoLockStarVolume;
