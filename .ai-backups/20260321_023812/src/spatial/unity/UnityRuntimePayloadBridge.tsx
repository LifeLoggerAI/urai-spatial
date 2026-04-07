"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { buildUnityRuntimePayload } from "./buildUnityRuntimePayload";
import { useSceneStore } from "../state/sceneStore";
import type { XrState } from "../types";

type XrStore = XrState & {
  setPresenting: (presenting: boolean) => void;
  setHeadsetPose: (hasHeadsetPose: boolean) => void;
  setInput: (patch: Partial<XrState["xrInput"]>) => void;
};

export const useXrStore = create<XrStore>((set) => ({
  presenting: false,
  hasHeadsetPose: false,
  xrInput: {
    handedness: null,
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
  setPresenting: (presenting) => set({ presenting }),
  setHeadsetPose: (hasHeadsetPose) => set({ hasHeadsetPose }),
  setInput: (patch) =>
    set((state) => ({
      xrInput: { ...state.xrInput, ...patch },
    })),
}));

declare global {
  interface Window {
    __URAI_UNITY_RUNTIME_PAYLOAD__?: ReturnType<typeof buildUnityRuntimePayload>;
  }
}

export function UnityRuntimePayloadBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStar = useSceneStore((s) => s.selectedStar);
  const xrState = useXrStore();

  useEffect(() => {
    const payload = buildUnityRuntimePayload(mode, selectedStar, xrState);
    window.__URAI_UNITY_RUNTIME_PAYLOAD__ = payload;
    window.dispatchEvent(new CustomEvent("urai:unity-runtime-payload", { detail: payload }));
  }, [mode, selectedStar, xrState]);

  return null;
}

export default UnityRuntimePayloadBridge;
