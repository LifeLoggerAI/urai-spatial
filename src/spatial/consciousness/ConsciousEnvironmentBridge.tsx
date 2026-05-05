"use client";

import { useEffect, useMemo } from "react";
import { useEnvironmentSignal } from "../signals/environmentSignal";
import { createConsciousEnvironmentState } from "./consciousEnvironment";
import { evolveEnvironment, createEnvironmentSpeechCue } from "./environmentEvolution";

export default function ConsciousEnvironmentBridge() {
  const env = useEnvironmentSignal();

  const state = useMemo(() => createConsciousEnvironmentState(env), [env]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const evolution = evolveEnvironment(state);
    const speech = createEnvironmentSpeechCue(state, evolution);

    const narratorEvent = new CustomEvent("urai:narrator", {
      detail: {
        cue: state.narratorCue,
        archetype: state.archetype,
        intensity: state.intensity,
        speech,
        evolution,
      },
    });

    const environmentEvent = new CustomEvent("urai:environment", {
      detail: {
        cue: state.environmentCue,
        bloom: state.shouldBloom,
        whisper: state.shouldWhisper,
        evolution,
      },
    });

    window.dispatchEvent(narratorEvent);
    window.dispatchEvent(environmentEvent);
  }, [state]);

  return null;
}
