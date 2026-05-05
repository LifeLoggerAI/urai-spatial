"use client";

import { useEffect, useMemo } from "react";
import { useEnvironmentSignal } from "../signals/environmentSignal";
import { createConsciousEnvironmentState } from "./consciousEnvironment";
import { evolveEnvironment, createEnvironmentSpeechCue } from "./environmentEvolution";
import { createCompanionPresence } from "./companionPresence";
import { createEmotionalPrediction } from "./emotionalPrediction";
import { createPerfectMomentIntervention } from "./perfectMomentIntervention";
import { createEnvironmentDirective } from "./environmentDirective";

export default function ConsciousEnvironmentBridge() {
  const env = useEnvironmentSignal();

  const state = useMemo(() => createConsciousEnvironmentState(env), [env]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const evolution = evolveEnvironment(state);
    const speech = createEnvironmentSpeechCue(state, evolution);
    const companion = createCompanionPresence(evolution, speech);
    const prediction = createEmotionalPrediction(companion, evolution, speech, state.intensity);
    const intervention = createPerfectMomentIntervention({
      companion,
      evolution,
      prediction,
      speech,
      intensity: state.intensity,
    });
    const directive = createEnvironmentDirective(intervention, prediction);

    const narratorEvent = new CustomEvent("urai:narrator", {
      detail: {
        cue: state.narratorCue,
        archetype: state.archetype,
        intensity: state.intensity,
        speech,
        evolution,
        companion,
        prediction,
        intervention,
        directive,
      },
    });

    const environmentEvent = new CustomEvent("urai:environment", {
      detail: {
        cue: state.environmentCue,
        bloom: state.shouldBloom,
        whisper: state.shouldWhisper,
        evolution,
        companion,
        prediction,
        intervention,
        directive,
      },
    });

    window.dispatchEvent(narratorEvent);
    window.dispatchEvent(environmentEvent);
  }, [state]);

  return null;
}
