import type { CompanionIntervention } from "./perfectMomentIntervention";
import type { EmotionalPrediction } from "./emotionalPrediction";

export type EnvironmentDirective = {
  mode: "none" | "stabilize" | "narrow" | "soften" | "brighten";
  immediate: boolean;
  durationMs: number;
  skyShift: "none" | "dim" | "clear" | "soft" | "bright";
  orbBehavior: "none" | "anchor" | "guide" | "bloom" | "spark";
  groundBehavior: "none" | "slowPulse" | "focusRing" | "softBloom" | "lift";
  intensityMultiplier: number;
  message: string;
};

export function createEnvironmentDirective(
  intervention: CompanionIntervention,
  prediction: EmotionalPrediction
): EnvironmentDirective {
  if (!intervention.shouldIntervene) {
    return {
      mode: "none",
      immediate: false,
      durationMs: 0,
      skyShift: "none",
      orbBehavior: "none",
      groundBehavior: "none",
      intensityMultiplier: 1,
      message: prediction.message,
    };
  }

  switch (intervention.interventionType) {
    case "grounding":
      return {
        mode: "stabilize",
        immediate: true,
        durationMs: 9000,
        skyShift: "dim",
        orbBehavior: "anchor",
        groundBehavior: "slowPulse",
        intensityMultiplier: 0.72,
        message: intervention.message,
      };
    case "focus":
      return {
        mode: "narrow",
        immediate: true,
        durationMs: 7000,
        skyShift: "clear",
        orbBehavior: "guide",
        groundBehavior: "focusRing",
        intensityMultiplier: 0.86,
        message: intervention.message,
      };
    case "recovery":
      return {
        mode: "soften",
        immediate: true,
        durationMs: 12000,
        skyShift: "soft",
        orbBehavior: "bloom",
        groundBehavior: "softBloom",
        intensityMultiplier: 0.8,
        message: intervention.message,
      };
    case "celebration":
      return {
        mode: "brighten",
        immediate: true,
        durationMs: 6000,
        skyShift: "bright",
        orbBehavior: "spark",
        groundBehavior: "lift",
        intensityMultiplier: 1.12,
        message: intervention.message,
      };
    default:
      return {
        mode: "none",
        immediate: false,
        durationMs: 0,
        skyShift: "none",
        orbBehavior: "none",
        groundBehavior: "none",
        intensityMultiplier: 1,
        message: prediction.message,
      };
  }
}
