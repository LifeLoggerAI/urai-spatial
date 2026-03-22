import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { useSceneStore } from "../state/sceneStore";
import { buildUnityRuntimePayload } from "./buildUnityRuntimePayload";
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
    selectActive: false
  },
  setPresenting: (presenting) => set(() => ({ presenting }))},
  setHeadsetPose: (hasHeadsetPose) => set(() => ({ hasHeadsetPose }))},
  setInput: (patch) =>
    set((state) => ({
      xrInput: { ...state.xrInput, ...patch }
    }))})
}))});

export default function UnityRuntimePayloadBridge() {
  const mode = useSceneStore((s) => s.mode);
  const selectedStarId = useSceneStore((s) => s.selectedStarId);
  const xrState = useXrStore();

  useEffect(() => {
    const payload = buildUnityRuntimePayload(mode, selectedStarId, xrState);
    (window).__URAI_UNITY_RUNTIME_PAYLOAD__ = payload;
  }, [mode, selectedStarId, xrState]);

  return null;
}

declare global {
  interface Window {
    __URAI_UNITY_RUNTIME_PAYLOAD__?: ReturnType<typeof buildUnityRuntimePayload>;
  }
}
