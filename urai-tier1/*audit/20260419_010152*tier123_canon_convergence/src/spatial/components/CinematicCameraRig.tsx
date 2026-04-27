"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { UraiPhase } from "@/lib/uraiCanon/types";

type Vec3Tuple = [number, number, number];

type Pose = {
  position: Vec3Tuple;
  lookAt: Vec3Tuple;
  damping: number;
};

type Props = {
  phase: UraiPhase;
  selected?: Vec3Tuple;
};

const TMP_LOOK = new THREE.Vector3();
const TMP_POS = new THREE.Vector3();
const TMP_TARGET = new THREE.Vector3();

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpTuple(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function resolvePose(phase: UraiPhase, selected?: Vec3Tuple): Pose {
  const star: Vec3Tuple = selected ?? [0, 0, -8];

  const HOME: Pose = {
    position: [0, 1.8, 10.5],
    lookAt: [0, 1.2, 0],
    damping: 0.09,
  };

  const ASCENT: Pose = {
    position: [0, 4.4, 7.6],
    lookAt: [0, 1.8, -3.5],
    damping: 0.07,
  };

  const LIFEMAP: Pose = {
    position: [0, 1.4, 5.2],
    lookAt: [0, 0.2, -10],
    damping: 0.08,
  };

  const FOCUS: Pose = {
    position: [star[0] * 0.24, star[1] * 0.22 + 0.35, star[2] + 3.2],
    lookAt: [star[0] * 0.12, star[1] * 0.12, star[2] - 0.4],
    damping: 0.11,
  };

  const REPLAY: Pose = {
    position: [star[0] * 0.14, star[1] * 0.14 + 0.18, star[2] + 1.8],
    lookAt: [star[0] * 0.06, star[1] * 0.06, star[2] - 2.2],
    damping: 0.12,
  };

  switch (phase) {
    case "HOME":
      return HOME;
    case "ASCENT":
      return ASCENT;
    case "LIFEMAP":
      return LIFEMAP;
    case "FOCUS":
      return FOCUS;
    case "REPLAY":
      return REPLAY;
    default:
      return HOME;
  }
}

function transitionDurationMs(from: UraiPhase, to: UraiPhase): number {
  if (from === "HOME" && to === "ASCENT") return 1800;
  if (from === "ASCENT" && to === "LIFEMAP") return 1600;
  if (from === "LIFEMAP" && to === "FOCUS") return 950;
  if (from === "FOCUS" && to === "REPLAY") return 1200;
  if (from === "REPLAY" && to === "FOCUS") return 1200;
  if (from === "FOCUS" && to === "LIFEMAP") return 950;
  if (from === "LIFEMAP" && to === "HOME") return 1500;
  return 1000;
}

export default function CinematicCameraRig({ phase, selected }: Props) {
  const { camera } = useThree();

  const phaseRef = useRef<UraiPhase>(phase);
  const fromPoseRef = useRef<Pose>(resolvePose(phase, selected));
  const toPoseRef = useRef<Pose>(resolvePose(phase, selected));
  const transitionStartRef = useRef<number>(0);
  const transitionMsRef = useRef<number>(1000);

  const selectedKey = useMemo(() => JSON.stringify(selected ?? null), [selected]);

  useEffect(() => {
    const previousPhase = phaseRef.current;
    const previousPose = resolvePose(previousPhase, selected);
    const nextPose = resolvePose(phase, selected);

    fromPoseRef.current = previousPose;
    toPoseRef.current = nextPose;
    transitionStartRef.current = performance.now();
    transitionMsRef.current = transitionDurationMs(previousPhase, phase);
    phaseRef.current = phase;
  }, [phase, selectedKey]);

  useEffect(() => {
    const initial = resolvePose(phase, selected);
    camera.position.set(initial.position[0], initial.position[1], initial.position[2]);
    TMP_LOOK.set(initial.lookAt[0], initial.lookAt[1], initial.lookAt[2]);
    camera.lookAt(TMP_LOOK);
    if ("updateProjectionMatrix" in camera) {
      camera.updateProjectionMatrix();
    }
  }, [camera]);

  useFrame(() => {
    const now = performance.now();
    const elapsed = now - transitionStartRef.current;
    const duration = Math.max(1, transitionMsRef.current);
    const t = smootherstep(elapsed / duration);

    const fromPose = fromPoseRef.current;
    const toPose = toPoseRef.current;

    const pos = lerpTuple(fromPose.position, toPose.position, t);
    const look = lerpTuple(fromPose.lookAt, toPose.lookAt, t);

    TMP_POS.set(pos[0], pos[1], pos[2]);
    TMP_TARGET.set(look[0], look[1], look[2]);

    camera.position.lerp(TMP_POS, toPose.damping + (1 - t) * 0.06);
    TMP_LOOK.lerp(TMP_TARGET, toPose.damping + (1 - t) * 0.05);
    camera.lookAt(TMP_LOOK);
  });

  return null;
}
