"use client";

import { useEffect } from "react";
import { buildUnityRuntimePayload } from "./buildUnityRuntimePayload";
import { useSceneStore } from "../state/sceneStore";
import { useXrStore } from "../state/xrStore";
import { resolveStarById } from "../data/stars";

declare global {
  interface Window {
    __URAI_UNITY_RUNTIME_PAYLOAD__?: ReturnType<typeof buildUnityRuntimePayload>;
  }
}

export function UnityRuntimePayloadBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarKey = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();

  useEffect(() => {
    const selectedStar = selectedStarKey ? resolveStarById(selectedStarKey) ?? null : null;

    const payload = buildUnityRuntimePayload({
      mode,
      selectedStar,
      presenting: xrState?.presenting ?? false,
      hasHeadsetPose: xrState?.hasHeadsetPose ?? false,
      xrInput: {
        controllers: xrState?.xrInput?.controllers ?? {
          left: {
            connected: false,
            profile: null,
            selecting: false,
            squeezing: false,
            hasGamepad: false,
          },
          right: {
            connected: false,
            profile: null,
            selecting: false,
            squeezing: false,
            hasGamepad: false,
          },
        },
        hands: xrState?.xrInput?.hands ?? {
          left: {
            connected: false,
            tracking: false,
            pinching: false,
            jointsTracked: 0,
            trackingState: "idle",
          },
          right: {
            connected: false,
            tracking: false,
            pinching: false,
            jointsTracked: 0,
            trackingState: "idle",
          },
        },
        handedness: xrState?.xrInput?.handedness ?? null,
        trackingState: xrState?.xrInput?.trackingState ?? "idle",
        pointerActive: Boolean(xrState?.xrInput?.pointerActive ?? false),
        squeezeActive: Boolean(xrState?.xrInput?.squeezeActive ?? false),
        selectActive: Boolean(xrState?.xrInput?.selectActive ?? false),
      },
      arPlacement: ((xrState?.arPlacement as any) ?? {
        enabled: false,
        placed: false,
        planeTracked: false,
        anchors: 0,
        visible: false,
        x: 0,
        y: 0,
        z: 0,
        qx: 0,
        qy: 0,
        qz: 0,
        qw: 1,
      }) as any,
      locomotion: ((xrState?.locomotion as any) ?? {
        active: false,
        mode: "none",
        speed: 0,
        turnStyle: "snap",
        userX: 0,
        userY: 0,
        userZ: 0,
        moveX: 0,
        moveY: 0,
        moveZ: 0,
        turnDelta: 0,
      }) as any,
    });

    window.__URAI_UNITY_RUNTIME_PAYLOAD__ = payload;
    window.dispatchEvent(
      new CustomEvent("urai:unity-runtime-payload", {
        detail: payload,
      }),
    );
  }, [mode, selectedStarKey, xrState]);

  return null;
}

export default UnityRuntimePayloadBridge;
