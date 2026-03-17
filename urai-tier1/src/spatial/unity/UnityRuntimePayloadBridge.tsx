"use client";

import { useEffect, useMemo, useRef } from "react";
import { generateStars } from "@/spatial/data/stars";
import { useSceneStore } from "@/spatial/state/sceneStore";
import { buildUnityRuntimePayload } from "@/spatial/unity/buildUnityRuntimePayload";
import { useXrSessionStore } from "@/spatial/xr/xrSessionStore";
import { useXrInputStore } from "@/spatial/xr/xrInputStore";
import { useArPlacementStore } from "@/spatial/xr/arPlacementStore";
import { useXrLocomotionStore } from "@/spatial/xr/xrLocomotionStore";

type UnityPayloadWindow = Window & {
  __URAI_UNITY_RUNTIME_PAYLOAD__?: unknown;
};

export default function UnityRuntimePayloadBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);

  const presenting = useXrSessionStore((s) => s.isPresenting);
  const hasHeadsetPose = useXrSessionStore((s) => s.hasHeadsetPose);

  const controllers = useXrInputStore((s) => s.controllers);
  const hands = useXrInputStore((s) => s.hands);
  const arPlacement = useArPlacementStore((s) => s.pose);
  const locomotion = useXrLocomotionStore((s) => s.pose);

  const starCountRef = useRef<number>(generateStars().length);

  const payload = useMemo(() => {
    return buildUnityRuntimePayload({
      mode,
      selectedStar,
      presenting,
      hasHeadsetPose,
      xrInput: {
        controllers,
        hands,
      },
      arPlacement,
      locomotion,
      starCount: starCountRef.current,
    });
  }, [
    mode,
    selectedStar,
    presenting,
    hasHeadsetPose,
    controllers,
    hands,
    arPlacement,
    locomotion,
  ]);

  const sig = useMemo(() => JSON.stringify(payload), [payload]);

  useEffect(() => {
    const target = window as UnityPayloadWindow;
    target.__URAI_UNITY_RUNTIME_PAYLOAD__ = payload;
    window.dispatchEvent(
      new CustomEvent("urai:unity-runtime-payload", {
        detail: payload,
      }),
    );
  }, [payload, sig]);

  return null;
}
