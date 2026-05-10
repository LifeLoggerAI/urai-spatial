"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  Color,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import { useSceneStore, type ScenePhase } from "../state/sceneStore";

export type GroundMood =
  | "calm"
  | "focused"
  | "hopeful"
  | "tender"
  | "heavy"
  | "charged";

export type GroundPresence = "idle" | "near" | "active";

type GroundWorldProps = {
  mood?: GroundMood;
  presence?: GroundPresence;
  emotionalIntensity?: number;
  recession?: number;
  elevation?: number;
  opacity?: number;
};

type MoodProfile = {
  ground: string;
  innerGlow: string;
  outerGlow: string;
  shimmer: string;
  breathRate: number;
  shimmerStrength: number;
  ringStrength: number;
};

const MOOD_PROFILES: Record<GroundMood, MoodProfile> = {
  calm: {
    ground: "#02040a",
    innerGlow: "#73c5ff",
    outerGlow: "#6fb7ff",
    shimmer: "#6ec6ff",
    breathRate: 0.42,
    shimmerStrength: 0.88,
    ringStrength: 0.82,
  },
  focused: {
    ground: "#030512",
    innerGlow: "#8cc8ff",
    outerGlow: "#7fb2ff",
    shimmer: "#9fd2ff",
    breathRate: 0.36,
    shimmerStrength: 0.72,
    ringStrength: 0.72,
  },
  hopeful: {
    ground: "#04100e",
    innerGlow: "#9af6d1",
    outerGlow: "#7ce8ff",
    shimmer: "#b9ffe8",
    breathRate: 0.5,
    shimmerStrength: 1,
    ringStrength: 0.92,
  },
  tender: {
    ground: "#090713",
    innerGlow: "#d7a5ff",
    outerGlow: "#90c7ff",
    shimmer: "#ffc5ee",
    breathRate: 0.32,
    shimmerStrength: 0.66,
    ringStrength: 0.74,
  },
  heavy: {
    ground: "#020309",
    innerGlow: "#4b78b8",
    outerGlow: "#355e95",
    shimmer: "#557bb0",
    breathRate: 0.24,
    shimmerStrength: 0.38,
    ringStrength: 0.48,
  },
  charged: {
    ground: "#08040d",
    innerGlow: "#ffb36e",
    outerGlow: "#ff6f91",
    shimmer: "#ffd08a",
    breathRate: 0.74,
    shimmerStrength: 1.16,
    ringStrength: 1.1,
  },
};

const PRESENCE_MULTIPLIER: Record<GroundPresence, number> = {
  idle: 0.7,
  near: 0.92,
  active: 1.18,
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function phaseOpacity(phase: ScenePhase) {
  switch (phase) {
    case "HOME":
      return 1;
    case "ASCENT":
      return 0.42;
    default:
      return 0;
  }
}

function useReducedMotionPreference() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => media.removeEventListener("change", sync);
  }, []);

  return reducedMotion;
}

export default function GroundWorld({
  mood = "calm",
  presence = "idle",
  emotionalIntensity = 0.42,
  recession = 0,
  elevation = 0,
  opacity = 1,
}: GroundWorldProps) {
  const phase = useSceneStore((s) => s.phase);
  const hoveredStarId = useSceneStore((s) => s.hoveredStarId);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);

  const safeIntensity = clamp01(emotionalIntensity);
  const safeRecession = clamp01(recession);
  const safeElevation = clamp01(elevation);
  const safeOpacity = clamp01(opacity);
  const resolvedPresence: GroundPresence = selectedStarId
    ? "active"
    : hoveredStarId
      ? "near"
      : presence;

  const presenceLift = PRESENCE_MULTIPLIER[resolvedPresence];
  const profile = MOOD_PROFILES[mood] ?? MOOD_PROFILES.calm;
  const reducedMotion = useReducedMotionPreference();

  const rootRef = useRef<Group>(null);
  const groundMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const contactShadowRef = useRef<Mesh>(null);
  const contactShadowMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const innerRingRef = useRef<Mesh>(null);
  const innerRingMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const outerRingMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const terrainVeilMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const horizonMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const shimmerMaterialRef = useRef<MeshStandardMaterial | null>(null);
  const orbShadowMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const orbGlowMaterialRef = useRef<MeshBasicMaterial | null>(null);

  const colors = useMemo(
    () => ({
      ground: new Color(profile.ground),
      innerGlow: new Color(profile.innerGlow),
      outerGlow: new Color(profile.outerGlow),
      shimmer: new Color(profile.shimmer),
    }),
    [profile]
  );

  useEffect(() => {
    groundMaterialRef.current?.color.copy(colors.ground);

    if (innerRingMaterialRef.current) {
      innerRingMaterialRef.current.color.copy(colors.innerGlow);
    }

    if (outerRingMaterialRef.current) {
      outerRingMaterialRef.current.color.copy(colors.outerGlow);
    }

    if (horizonMaterialRef.current) {
      horizonMaterialRef.current.color.copy(colors.outerGlow);
      horizonMaterialRef.current.emissive.copy(colors.outerGlow);
    }

    if (shimmerMaterialRef.current) {
      shimmerMaterialRef.current.color.copy(colors.shimmer);
      shimmerMaterialRef.current.emissive.copy(colors.shimmer);
    }

    if (orbGlowMaterialRef.current) {
      orbGlowMaterialRef.current.color.copy(colors.innerGlow);
    }
  }, [colors]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const visibleOpacity = phaseOpacity(phase) * safeOpacity;
    const active = visibleOpacity > 0;

    if (rootRef.current) {
      rootRef.current.position.y = safeElevation * 0.035;
      rootRef.current.scale.setScalar(1 + safeRecession * 0.018);
    }

    const breath = reducedMotion
      ? 0.5
      : 0.5 + 0.5 * Math.sin(t * profile.breathRate);

    const presencePulse = reducedMotion
      ? 0.5
      : 0.5 + 0.5 * Math.sin(t * (1.05 + safeIntensity * 0.65));

    const intensityLift = 0.68 + safeIntensity * 0.62;
    const ringEnergy =
      visibleOpacity * presenceLift * intensityLift * profile.ringStrength;
    const shimmerEnergy =
      visibleOpacity * intensityLift * profile.shimmerStrength;

    if (groundMaterialRef.current) {
      groundMaterialRef.current.opacity = 0.94 * visibleOpacity;
    }

    if (contactShadowRef.current) {
      contactShadowRef.current.scale.setScalar(
        active && !reducedMotion ? 1 + presencePulse * 0.045 * presenceLift : 1
      );
    }

    if (contactShadowMaterialRef.current) {
      contactShadowMaterialRef.current.opacity =
        (0.18 + presencePulse * 0.08) * visibleOpacity;
    }

    if (innerRingRef.current) {
      innerRingRef.current.scale.setScalar(
        active && !reducedMotion ? 1 + presencePulse * 0.028 * presenceLift : 1
      );
    }

    if (innerRingMaterialRef.current) {
      innerRingMaterialRef.current.opacity =
        (0.055 + breath * 0.075) * ringEnergy;
    }

    if (outerRingMaterialRef.current) {
      outerRingMaterialRef.current.opacity =
        (0.028 + breath * 0.045) * ringEnergy;
    }

    if (terrainVeilMaterialRef.current) {
      terrainVeilMaterialRef.current.opacity =
        (0.045 + breath * 0.035) * shimmerEnergy;
      terrainVeilMaterialRef.current.emissiveIntensity =
        0.025 + breath * 0.055 * shimmerEnergy;
    }

    if (horizonMaterialRef.current) {
      horizonMaterialRef.current.opacity =
        (0.035 + breath * 0.05) * shimmerEnergy;
      horizonMaterialRef.current.emissiveIntensity =
        0.045 + breath * 0.09 * shimmerEnergy;
    }

    if (shimmerMaterialRef.current) {
      shimmerMaterialRef.current.opacity =
        (0.025 + breath * 0.065) * shimmerEnergy;
      shimmerMaterialRef.current.emissiveIntensity =
        0.04 + breath * 0.14 * shimmerEnergy;
    }

    if (orbShadowMaterialRef.current) {
      orbShadowMaterialRef.current.opacity =
        (0.36 + safeIntensity * 0.18) * visibleOpacity;
    }

    if (orbGlowMaterialRef.current) {
      orbGlowMaterialRef.current.opacity =
        (0.055 + presencePulse * 0.075) * ringEnergy;
    }
  });

  return (
    <group
      ref={rootRef}
      name="living-ground-system"
      userData={{
        mood,
        presence: resolvedPresence,
        emotionalIntensity: safeIntensity,
        recession: safeRecession,
        elevation: safeElevation,
      }}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow renderOrder={0}>
        <circleGeometry args={[3.3, 64]} />
        <meshStandardMaterial
          ref={groundMaterialRef}
          color={profile.ground}
          roughness={0.98}
          metalness={0.02}
          transparent
          opacity={0.94}
        />
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
          ref={contactShadowMaterialRef}
          color="#050a18"
          transparent
          opacity={0.26}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>

      <mesh
        ref={innerRingRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.013, 0]}
        renderOrder={4}
      >
        <ringGeometry args={[1.0, 1.45, 96]} />
        <meshBasicMaterial
          ref={innerRingMaterialRef}
          color={profile.innerGlow}
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
          ref={outerRingMaterialRef}
          color={profile.outerGlow}
          transparent
          opacity={0.05}
          depthWrite={false}
          blending={AdditiveBlending}
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
          ref={terrainVeilMaterialRef}
          color="#091327"
          emissive={profile.shimmer}
          emissiveIntensity={0.03}
          roughness={1}
          metalness={0}
          transparent
          opacity={0.07}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={1}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.015, -0.45]}
        receiveShadow
        renderOrder={-1}
      >
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial
          color="#03091a"
          roughness={1}
          metalness={0}
          transparent
          opacity={0.22}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.013, -0.4]}
        receiveShadow
      >
        <ringGeometry args={[3.7, 5.1, 64]} />
        <meshStandardMaterial
          ref={horizonMaterialRef}
          color={profile.outerGlow}
          emissive={profile.outerGlow}
          emissiveIntensity={0.08}
          roughness={0.66}
          metalness={0.06}
          transparent
          opacity={0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.014, -0.5]}
        receiveShadow
      >
        <ringGeometry args={[5.8, 7.5, 64]} />
        <meshStandardMaterial
          color="#355e95"
          emissive={profile.outerGlow}
          emissiveIntensity={0.06}
          roughness={0.82}
          metalness={0.03}
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.016, -0.62]}
        receiveShadow
      >
        <ringGeometry args={[7.9, 9.6, 64]} />
        <meshStandardMaterial
          ref={shimmerMaterialRef}
          color={profile.shimmer}
          emissive={profile.shimmer}
          emissiveIntensity={0.05}
          roughness={0.88}
          metalness={0.01}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-0.52, 0.012, -0.05]}
        receiveShadow
      >
        <circleGeometry args={[1.1, 36]} />
        <meshBasicMaterial
          ref={orbShadowMaterialRef}
          color="#02040a"
          transparent
          opacity={0.5}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.48, 0.014, -0.08]}>
        <circleGeometry args={[1.5, 40]} />
        <meshBasicMaterial
          ref={orbGlowMaterialRef}
          color={profile.innerGlow}
          transparent
          opacity={0.1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}
