"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

type URAISpatialLookAtAuthorityProps = {
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

function ascentEase(value: number) {
  const raw = clamp01(value);

  if (raw < 0.22) {
    return 0.1 * smoothstep(raw / 0.22);
  }

  return 0.1 + 0.9 * smoothstep((raw - 0.22) / 0.78);
}

function getCameraTarget(
  camera: THREE.Camera,
  target: THREE.Vector3,
  direction: THREE.Vector3,
  distance = 42
) {
  camera.getWorldDirection(direction);
  target.copy(camera.position).add(direction.multiplyScalar(distance));
  return target;
}

function applyCameraProjection(camera: THREE.Camera, fov: number) {
  if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    perspectiveCamera.near = 0.03;
    perspectiveCamera.far = 2200;
    perspectiveCamera.fov = fov;
    perspectiveCamera.updateProjectionMatrix();
    return;
  }

  if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
    const orthographicCamera = camera as THREE.OrthographicCamera;
    orthographicCamera.near = 0.03;
    orthographicCamera.far = 2200;
    orthographicCamera.updateProjectionMatrix();
  }
}

const ASCENT_DURATION = 6.35;
const HOME_RETURN_DURATION = 2.15;

const ASCENT_END_POS = new THREE.Vector3(0, 23.5, -82);
const ASCENT_END_TARGET = new THREE.Vector3(0, 22.4, -190);

const LIFEMAP_POS = new THREE.Vector3(0, 23.5, -82);
const LIFEMAP_TARGET = new THREE.Vector3(0, 22.4, -190);

const FOCUS_POS = new THREE.Vector3(0, 20.0, -104);
const FOCUS_TARGET = new THREE.Vector3(0, 18.8, -182);

const REPLAY_POS = new THREE.Vector3(0, 17.8, -126);
const REPLAY_TARGET = new THREE.Vector3(0, 16.8, -202);

export function URAISpatialLookAtAuthority({ phase }: URAISpatialLookAtAuthorityProps) {
  const activePhaseRef = useRef("");
  const elapsedRef = useRef(0);

  const directionRef = useRef(new THREE.Vector3());

  const homePoseValidRef = useRef(false);
  const homePosRef = useRef(new THREE.Vector3());
  const homeTargetRef = useRef(new THREE.Vector3());

  const ascentFromPosRef = useRef(new THREE.Vector3());
  const ascentFromTargetRef = useRef(new THREE.Vector3());

  const lastNonHomeValidRef = useRef(false);
  const lastNonHomePosRef = useRef(new THREE.Vector3());
  const lastNonHomeTargetRef = useRef(new THREE.Vector3());

  const returnActiveRef = useRef(false);
  const returnElapsedRef = useRef(0);
  const returnFromPosRef = useRef(new THREE.Vector3());
  const returnFromTargetRef = useRef(new THREE.Vector3());
  const returnToPosRef = useRef(new THREE.Vector3());
  const returnToTargetRef = useRef(new THREE.Vector3());

  const desiredPosRef = useRef(new THREE.Vector3());
  const desiredTargetRef = useRef(new THREE.Vector3());
  const smoothedTargetRef = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    const phaseName = normalizePhase(phase);
    const dt = Math.min(Math.max(delta, 0), 1 / 20);

    if (activePhaseRef.current !== phaseName) {
      const previousPhase = activePhaseRef.current;
      activePhaseRef.current = phaseName;
      elapsedRef.current = 0;

      if (phaseName === "ASCENT") {
        returnActiveRef.current = false;

        if (homePoseValidRef.current) {
          ascentFromPosRef.current.copy(homePosRef.current);
          ascentFromTargetRef.current.copy(homeTargetRef.current);
        } else {
          ascentFromPosRef.current.copy(camera.position);
          getCameraTarget(camera, ascentFromTargetRef.current, directionRef.current);
        }

        smoothedTargetRef.current.copy(ascentFromTargetRef.current);
      } else if (phaseName === "HOME" && previousPhase && previousPhase !== "HOME") {
        returnActiveRef.current = true;
        returnElapsedRef.current = 0;

        if (lastNonHomeValidRef.current) {
          returnFromPosRef.current.copy(lastNonHomePosRef.current);
          returnFromTargetRef.current.copy(lastNonHomeTargetRef.current);
        } else {
          returnFromPosRef.current.copy(camera.position);
          getCameraTarget(camera, returnFromTargetRef.current, directionRef.current);
        }

        returnToPosRef.current.copy(camera.position);
        getCameraTarget(camera, returnToTargetRef.current, directionRef.current);
      } else {
        returnActiveRef.current = false;
      }
    } else {
      elapsedRef.current += dt;
    }

    if (phaseName === "HOME" || phaseName === "") {
      if (returnActiveRef.current) {
        returnElapsedRef.current += dt;
        const t = smoothstep(returnElapsedRef.current / HOME_RETURN_DURATION);

        desiredPosRef.current.copy(returnFromPosRef.current).lerp(returnToPosRef.current, t);
        desiredTargetRef.current.copy(returnFromTargetRef.current).lerp(returnToTargetRef.current, t);

        camera.position.copy(desiredPosRef.current);
        applyCameraProjection(camera, 52);
        camera.lookAt(desiredTargetRef.current);

        if (t >= 0.999) {
          returnActiveRef.current = false;
          homePoseValidRef.current = true;
          homePosRef.current.copy(returnToPosRef.current);
          homeTargetRef.current.copy(returnToTargetRef.current);
        }

        return;
      }

      homePoseValidRef.current = true;
      homePosRef.current.copy(camera.position);
      getCameraTarget(camera, homeTargetRef.current, directionRef.current);
      return;
    }

    const desiredPos = desiredPosRef.current;
    const desiredTarget = desiredTargetRef.current;

    if (phaseName === "ASCENT") {
      const t = ascentEase(elapsedRef.current / ASCENT_DURATION);

      desiredPos.copy(ascentFromPosRef.current).lerp(ASCENT_END_POS, t);
      desiredTarget.copy(ascentFromTargetRef.current).lerp(ASCENT_END_TARGET, t);

      camera.position.copy(desiredPos);
      smoothedTargetRef.current.copy(desiredTarget);

      applyCameraProjection(camera, 54);
      camera.lookAt(smoothedTargetRef.current);
    } else {
      if (phaseName === "LIFEMAP") {
        desiredPos.copy(LIFEMAP_POS);
        desiredTarget.copy(LIFEMAP_TARGET);
      } else if (phaseName === "FOCUS") {
        desiredPos.copy(FOCUS_POS);
        desiredTarget.copy(FOCUS_TARGET);
      } else if (phaseName === "REPLAY") {
        desiredPos.copy(REPLAY_POS);
        desiredTarget.copy(REPLAY_TARGET);
      } else {
        return;
      }

      const lambda =
        phaseName === "LIFEMAP" ? 4.2 :
        phaseName === "FOCUS" ? 3.8 :
        3.4;

      const step = clamp01(1 - Math.exp(-dt * lambda));

      camera.position.lerp(desiredPos, step);
      smoothedTargetRef.current.lerp(desiredTarget, step);

      applyCameraProjection(camera, phaseName === "LIFEMAP" ? 50 : 46);
      camera.lookAt(smoothedTargetRef.current);
    }

    lastNonHomeValidRef.current = true;
    lastNonHomePosRef.current.copy(camera.position);
    lastNonHomeTargetRef.current.copy(smoothedTargetRef.current);
  });

  return null;
}

export default URAISpatialLookAtAuthority;
