// CAMERA AUTHORITY LOCK: XR locomotion disabled for Tier1
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { useSceneStore } from "@/spatial/store/useSceneStore";
import { useXrSessionStore } from "@/spatial/xr/xrSessionStore";
import { useXrLocomotionStore } from "@/spatial/xr/xrLocomotionStore";
import {
  createEmptyXrLocomotionState,
  type XrLocomotionState,
} from "@/spatial/xr/xrLocomotionTypes";

const DEADZONE = 0.16;
const MOVE_SPEED = 2.0;
const TURN_SPEED = 1.8;

function applyDeadzone(value: number): number {
  return Math.abs(value) < DEADZONE ? 0 : value;
}

function readLocomotionInput(session: any): {
  moveX: number;
  moveY: number;
  turnX: number;
} {
  let moveX = 0;
  let moveY = 0;
  let turnX = 0;

  const inputSources = Array.from((session?.inputSources ?? []) as any[]);

  for (const source of inputSources) {
    const gamepad = source?.gamepad;
    if (!gamepad) continue;

    const axes = Array.isArray(gamepad.axes) ? gamepad.axes : [];
    const axisX = Number(axes[2] ?? axes[0] ?? 0);
    const axisY = Number(axes[3] ?? axes[1] ?? 0);
    const handedness = String(source?.handedness ?? "");

    if (handedness === "left") {
      moveX = axisX;
      moveY = axisY;
      continue;
    }

    if (handedness === "right") {
      turnX = axisX;
      continue;
    }

    if (moveX === 0 && moveY === 0) {
      moveX = axisX;
      moveY = axisY;
    }
  }

  return {
    moveX: applyDeadzone(moveX),
    moveY: applyDeadzone(moveY),
    turnX: applyDeadzone(turnX),
  };
}

function samePose(a: XrLocomotionState, b: XrLocomotionState): boolean {
  return (
    a.active === b.active &&
    a.mode === b.mode &&
    a.userX === b.userX &&
    a.userY === b.userY &&
    a.userZ === b.userZ &&
    a.yaw === b.yaw &&
    a.inputMoveX === b.inputMoveX &&
    a.inputMoveY === b.inputMoveY &&
    a.inputTurnX === b.inputTurnX
  );
}

export default function XrLocomotionRuntime() {
  const gl = useThree((s) => s.gl as any);
  const scene = useThree((s) => s.scene);
  const mode = useSceneStore((s) => s.mode);
  const xrPresenting = useXrSessionStore((s) => s.presenting);
  const setPose = useXrLocomotionStore((s) => s.setPose);
  const reset = useXrLocomotionStore((s) => s.reset);

  const poseRef = useRef<XrLocomotionState>(createEmptyXrLocomotionState());
  const forwardRef = useRef(new Vector3());
  const rightRef = useRef(new Vector3());

  useEffect(() => {
    return () => {
      poseRef.current = createEmptyXrLocomotionState();
      // XR LOCKED: scene.position.set(0, 0, 0);
      // XR LOCKED: scene.rotation.set(0, 0, 0);
      reset();
    };
  }, [scene, reset]);

  useEffect(() => {
    if (xrPresenting) return;
    poseRef.current = createEmptyXrLocomotionState();
    // XR LOCKED: scene.position.set(0, 0, 0);
    // XR LOCKED: scene.rotation.set(0, 0, 0);
    reset();
  }, [xrPresenting, scene, reset]);

  useFrame((_state, delta) => {
    if (!xrPresenting) return;
    if (mode === "REPLAY") return;

    const session = gl?.xr?.getSession?.();
    if (!session) return;

    const { moveX, moveY, turnX } = readLocomotionInput(session);
    const current = poseRef.current;

    const yaw = current.yaw - turnX * TURN_SPEED * delta;
    const forwardIntent = -moveY;

    rightRef.current.set(Math.cos(yaw), 0, Math.sin(yaw));
    forwardRef.current.set(Math.sin(yaw), 0, -Math.cos(yaw));

    const step = MOVE_SPEED * delta;
    const next: XrLocomotionState = {
      active:
        Math.abs(moveX) > 0 || Math.abs(moveY) > 0 || Math.abs(turnX) > 0,
      mode:
        Math.abs(moveX) > 0 || Math.abs(moveY) > 0 || Math.abs(turnX) > 0
          ? "smooth-stick"
          : "idle",
      userX:
        current.userX +
        (rightRef.current.x * moveX + forwardRef.current.x * forwardIntent) *
          step,
      userY: 0,
      userZ:
        current.userZ +
        (rightRef.current.z * moveX + forwardRef.current.z * forwardIntent) *
          step,
      yaw,
      inputMoveX: moveX,
      inputMoveY: moveY,
      inputTurnX: turnX,
    };

    poseRef.current = next;

    // XR LOCKED: scene.position.set(-next.userX, -next.userY, -next.userZ);
    // XR LOCKED: scene.rotation.set(0, -next.yaw, 0);

    if (!samePose(current, next)) {
      setPose(next);
    }
  });

  return null;
}
