import type { CompanionIntervention } from "./perfectMomentIntervention";
import type { EnvironmentDirective } from "./environmentDirective";
import type { SubconsciousRegulation } from "./subconsciousRegulation";

export type InterventionOptimizerState = {
  version: 1;
  totalOptimizations: number;
  interventionWeights: Record<CompanionIntervention["interventionType"], number>;
  lastChosenType: CompanionIntervention["interventionType"];
  updatedAt: string;
};

export type OptimizedInterventionPlan = {
  selectedType: CompanionIntervention["interventionType"];
  confidenceAdjustment: number;
  directiveIntensity: number;
  regulationStrength: number;
  reason: string;
};

const STORAGE_KEY = "urai.spatial.interventionOptimizer.v1";

const DEFAULT_STATE: InterventionOptimizerState = {
  version: 1,
  totalOptimizations: 0,
  interventionWeights: {
    none: 0.4,
    grounding: 0.72,
    focus: 0.66,
    recovery: 0.7,
    celebration: 0.58,
  },
  lastChosenType: "none",
  updatedAt: "",
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function readState(): InterventionOptimizerState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw), version: 1 };
  } catch {
    return DEFAULT_STATE;
  }
}

function writeState(state: InterventionOptimizerState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // optional persistence only
  }
}

export function optimizeIntervention(args: {
  intervention: CompanionIntervention;
  directive: EnvironmentDirective;
  regulation: SubconsciousRegulation;
}): OptimizedInterventionPlan {
  const previous = readState();
  const selectedType = args.intervention.interventionType;
  const currentWeight = previous.interventionWeights[selectedType] ?? 0.5;
  const activeBoost = args.intervention.shouldIntervene ? 0.025 : -0.01;
  const subtleBoost = args.regulation.active ? 0.015 : 0;
  const nextWeight = clamp(currentWeight + activeBoost + subtleBoost, 0.2, 0.92);

  const next: InterventionOptimizerState = {
    version: 1,
    totalOptimizations: previous.totalOptimizations + 1,
    interventionWeights: {
      ...previous.interventionWeights,
      [selectedType]: nextWeight,
    },
    lastChosenType: selectedType,
    updatedAt: new Date().toISOString(),
  };

  writeState(next);

  return {
    selectedType,
    confidenceAdjustment: clamp(nextWeight - 0.5, -0.3, 0.42),
    directiveIntensity: clamp(args.directive.intensityMultiplier * nextWeight, 0.35, 1.18),
    regulationStrength: clamp((args.regulation.motionScale + args.regulation.luminanceScale) / 2, 0.5, 1.12),
    reason: `optimizer:${selectedType}:${next.totalOptimizations}`,
  };
}
