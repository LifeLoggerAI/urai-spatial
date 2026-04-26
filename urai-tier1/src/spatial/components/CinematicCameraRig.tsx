"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useMemo, useRef } from "react";

type Phase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";

type Props = {
  phase: Phase;
  selected?: THREE.Vector3 | [number, number, number] | null;
};

function uraiEaseOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 3);
}

function uraiArrivalSettle(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - x, 4);
}


function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function smoothstep(t: number) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function asVec3(v: Props["selected"]) {
  if (!v) return new THREE.Vector3(0, 1.2, -8);
  if (Array.isArray(v)) return new THREE.Vector3(v[0], v[1], v[2]);
  return v.clone();
}


// URAI_HANDOFF_LOCK_V2
const uraiDamp = (c, t, l, d) => c + (t - c) * (1 - Math.exp(-l * d));

export default function CinematicCameraRig({ phase, selected }: Props) {
  // URAI_CAMERA_TARGET_ANCHOR_LOCK
  const uraiStableTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const uraiStablePositionRef = useRef(new THREE.Vector3(0, 2.2, 8));
  const uraiLastPhaseRef = useRef<string | null>(null);

  // URAI_TARGET_FREEZE_LOCK
  const uraiLockedTargetRef = useRef(new THREE.Vector3(0,0,0));

  const uraiPrevPhase = useRef(null);

  const { camera } = useThree();

  const ascentClock = useRef(0);
  const focusClock = useRef(0);
  const replayClock = useRef(0);
  const look = useRef(new THREE.Vector3(0, 0.4, 0));
  const selectedTarget = useMemo(() => asVec3(selected), [selected]);

  useFrame((_, delta) => {
    // URAI_CAMERA_TARGET_ANCHOR_LOCK
    const uraiPhaseChanged = uraiLastPhaseRef.current !== phase;

    if (uraiPhaseChanged && (phase === "FOCUS" || phase === "REPLAY")) {
      uraiLockedTargetRef.current.copy(selectedTarget);
    }
    if (uraiPhaseChanged) {
      uraiLastPhaseRef.current = phase;
      uraiStableTargetRef.current.copy(camera.position).multiplyScalar(0.15);
      uraiStablePositionRef.current.copy(camera.position);
    }

    if (uraiPrevPhase.current !== phase) {
      uraiPrevPhase.current = phase;
    }

    if (phase === "ASCENT") {
      ascentClock.current = Math.min(1, ascentClock.current + delta / 2.35);
    } else if (phase === "HOME") {
      ascentClock.current = 0;
    } else {
      ascentClock.current = 1;
    }

    /* FOCUS_ARRIVAL_CLOCK_LOCK */
    if (phase === "FOCUS") {
      focusClock.current = Math.min(1, focusClock.current + delta / 0.42);
    } else if (phase !== "REPLAY") {
      focusClock.current = 0;
    }

    const focusArrival = smoothstep(focusClock.current);
    // URAI_FINAL_CINEMATIC_POLISH_LOCK
    const focusOvershoot = Math.sin(focusArrival * Math.PI) * 0.18;
    const focusSettle = 1 - Math.exp(-focusClock.current * 5.5);

    /* REPLAY_ENTRY_CLOCK_LOCK */
    if (phase === "REPLAY") {
      replayClock.current = Math.min(1, replayClock.current + delta / 0.85);
    } else {
      replayClock.current = 0;
    }
    const r = replayClock.current;
    const rEase = r * r * (3 - 2 * r);

    const a = smoothstep(ascentClock.current);
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();

    if (phase === "HOME") {
      pos.set(0, 0.22, 11.5);
      target.set(0, 0.35, 0);
    } else if (phase === "ASCENT") {
      pos.set(0, 0.65 + a * 2.35, 11.5 - a * 20.5);
      target.set(0, 0.85 + a * 1.55, -4.0 - a * 15.0);
    } else if (phase === "LIFEMAP") {
      pos.set(0, 1.45, -7.6);
      target.set(0, 1.15, -15);
    } else if (phase === "FOCUS") {
      /* FOCUS_DISTANCE_CAP */
      const baseDist = 4.85;         // stable viewing distance
      const minDist = 4.55;          // never closer than this
      const dist = Math.max(minDist, baseDist - focusOvershoot * 0.35);

      const backward = new THREE.Vector3(0, 0.42 + focusSettle * 0.08, dist);
      pos.copy(uraiLockedTargetRef.current).add(backward);

      target.copy(uraiLockedTargetRef.current);
    } else {
      /* REPLAY enclosure — pulled back + controlled forward entry */
      const base = new THREE.Vector3(0, 0.46, 4.25);
      const entry = new THREE.Vector3(0, 0.08, -1.05).multiplyScalar(rEase);
      pos.copy(uraiLockedTargetRef.current).add(base).add(entry);

      const lookOffset = new THREE.Vector3(0, 0.04, -0.55 * rEase);
      target.copy(uraiLockedTargetRef.current).add(lookOffset);
    }

    camera.position.x = THREE.MathUtils.damp(camera.position.x, pos.x, phase === "FOCUS" ? 4.35 : phase === "ASCENT" ? 3.75 : phase === "REPLAY" ? 3.15 : 3.25, delta);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, pos.y, phase === "FOCUS" ? 4.15 : phase === "ASCENT" ? 3.35 : phase === "REPLAY" ? 3.05 : 3.2, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, pos.z, phase === "FOCUS" ? 4.25 : phase === "ASCENT" ? 3.65 : phase === "REPLAY" ? 3.0 : 3.2, delta);

    look.current.x = THREE.MathUtils.damp(look.current.x, target.x, phase === "FOCUS" ? 4.8 : phase === "ASCENT" ? 3.45 : phase === "REPLAY" ? 3.4 : 3.55, delta);
    look.current.y = THREE.MathUtils.damp(look.current.y, target.y, phase === "FOCUS" ? 4.75 : phase === "ASCENT" ? 3.15 : phase === "REPLAY" ? 3.25 : 3.5, delta);
    look.current.z = THREE.MathUtils.damp(look.current.z, target.z, phase === "FOCUS" ? 4.7 : phase === "ASCENT" ? 3.35 : phase === "REPLAY" ? 3.2 : 3.55, delta);

    {
      const uraiNextLookTarget = look.current;
      if (uraiNextLookTarget && typeof uraiNextLookTarget === "object" && "x" in uraiNextLookTarget) {
        uraiStableTargetRef.current.lerp(uraiNextLookTarget, 1 - Math.exp(-4.2 * delta));
        const uraiLookTarget = uraiStableTargetRef.current.clone ? uraiStableTargetRef.current.clone() : uraiStableTargetRef.current;

    if (phase === "FOCUS" && uraiLookTarget.y !== undefined) {
      uraiLookTarget.y += Math.sin(clock.elapsedTime * 0.65) * 0.012;
      uraiLookTarget.x += Math.sin(clock.elapsedTime * 0.45) * 0.01;
    }

    if (phase === "LIFEMAP" && uraiLookTarget.y !== undefined) {
      uraiLookTarget.y += Math.sin(clock.elapsedTime * 0.5) * 0.008;
    }

    camera.lookAt(uraiLookTarget);
      } else {
        camera.lookAt(0, 0, 0);
      }
    }

    const cam = camera as THREE.PerspectiveCamera;
    if (typeof cam.fov === "number") {
      cam.fov = THREE.MathUtils.damp(
        cam.fov,
        phase === "REPLAY" ? 32 : phase === "FOCUS" ? 35 : phase === "ASCENT" ? 37 : 36,
        3.2,
        delta
      );
      cam.updateProjectionMatrix();
    }
  });

  return null;
}

export { CinematicCameraRig };


/* URAI_CAMERA_EASING_ARRIVAL_SETTLE
   Surgical Tier-2 camera pass:
   - Adds non-linear arrival easing.
   - Adds subtle Lifemap and Focus settle weight.
   - Does not touch state, authority, narrator, props, or scene contracts.
*/


/* URAI_SAFE_CAMERA_ARRIVAL_PASS
   Safe camera arrival tuning:
   - Slows terminal damping for LIFEMAP / FOCUS / REPLAY.
   - Adds tiny post-arrival embodied look drift.
   - No state, authority, props, scene contracts, or narrator changes.
*/


/* URAI_FOCUS_CURVATURE_ARRIVAL_HOLD
   Final Tier-2 focus-arrival pass:
   - Adds slight curved camera approach in FOCUS.
   - Adds terminal damping so FOCUS feels like arrival, not zoom.
   - Leaves state machine, authority, props, scene contracts, and narrator untouched.
*/


/* URAI_ASCENT_LIFEMAP_HANDOFF_GLITCH_GUARD
   Surgical Tier-2 guard:
   - slows terminal ASCENT/LIFEMAP damping
   - offsets target slightly to prevent perceptual snap at handoff
   - does not touch phase authority, state machine, replay, narrator, or props
*/
