"use client";

import { useEffect, useMemo } from "react";
import { useEnvironmentSignal } from "../signals/environmentSignal";
import { createConsciousEnvironmentState } from "./consciousEnvironment";

export default function ConsciousEnvironmentBridge() {
  const env = useEnvironmentSignal();

  const state = useMemo(() => createConsciousEnvironmentState(env), [env]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const narratorEvent = new CustomEvent("urai:narrator", {
      detail: {
        cue: state.narratorCue,
        archetype: state.archetype,
        intensity: state.intensity,
      },
    });

    const environmentEvent = new CustomEvent("urai:environment", {
      detail: {
        cue: state.environmentCue,
        bloom: state.shouldBloom,
        whisper: state.shouldWhisper,
      },
    });

    window.dispatchEvent(narratorEvent);
    window.dispatchEvent(environmentEvent);
  }, [state]);

  return null;
}
