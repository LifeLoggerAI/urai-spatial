"use client";

import { useEffect } from "react";
import { buildUnityRuntimePayload } from "./buildUnityRuntimePayload";

declare global {
  interface Window {
    __URAI_UNITY_RUNTIME_PAYLOAD__?: ReturnType<typeof buildUnityRuntimePayload>;
  }
}

export default function UnityRuntimePayloadBridge() {
  useEffect(() => {
    const push = () => {
      window.__URAI_UNITY_RUNTIME_PAYLOAD__ = buildUnityRuntimePayload();
      window.dispatchEvent(new CustomEvent("urai:unity-runtime-payload", { detail: window.__URAI_UNITY_RUNTIME_PAYLOAD__ }));
    };

    push();
    const id = window.setInterval(push, 300);

    return () => window.clearInterval(id);
  }, []);

  return null;
}
