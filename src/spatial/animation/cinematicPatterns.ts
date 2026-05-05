export type CinematicPatternKind = "none" | "ripple" | "threshold" | "bloom" | "focus" | "spark";

export type CinematicPattern = {
  kind: CinematicPatternKind;
  ringCount: number;
  durationMs: number;
  staggerMs: number;
  scaleFrom: number;
  scaleTo: number;
  opacityFrom: number;
  opacityTo: number;
  transition: "easeOut" | "breath" | "snap";
  reason: string;
};

export function createCinematicPattern(args: {
  directiveMode?: string;
  interventionType?: string;
  archetype?: string;
}): CinematicPattern {
  if (args.directiveMode === "stabilize" || args.interventionType === "grounding") {
    return {
      kind: "ripple",
      ringCount: 3,
      durationMs: 3800,
      staggerMs: 420,
      scaleFrom: 0.82,
      scaleTo: 1.45,
      opacityFrom: 0.34,
      opacityTo: 0,
      transition: "breath",
      reason: "grounding-ripple",
    };
  }

  if (args.directiveMode === "narrow" || args.interventionType === "focus") {
    return {
      kind: "focus",
      ringCount: 2,
      durationMs: 2600,
      staggerMs: 260,
      scaleFrom: 1.28,
      scaleTo: 0.92,
      opacityFrom: 0.24,
      opacityTo: 0.08,
      transition: "easeOut",
      reason: "focus-convergence",
    };
  }

  if (args.directiveMode === "soften" || args.interventionType === "recovery") {
    return {
      kind: "bloom",
      ringCount: 4,
      durationMs: 5200,
      staggerMs: 520,
      scaleFrom: 0.72,
      scaleTo: 1.75,
      opacityFrom: 0.26,
      opacityTo: 0,
      transition: "breath",
      reason: "recovery-bloom",
    };
  }

  if (args.directiveMode === "brighten" || args.interventionType === "celebration") {
    return {
      kind: "spark",
      ringCount: 5,
      durationMs: 2200,
      staggerMs: 120,
      scaleFrom: 0.88,
      scaleTo: 1.28,
      opacityFrom: 0.42,
      opacityTo: 0,
      transition: "snap",
      reason: "momentum-spark",
    };
  }

  if (args.archetype === "threshold") {
    return {
      kind: "threshold",
      ringCount: 3,
      durationMs: 4400,
      staggerMs: 360,
      scaleFrom: 1,
      scaleTo: 1.62,
      opacityFrom: 0.3,
      opacityTo: 0,
      transition: "easeOut",
      reason: "threshold-opening",
    };
  }

  return {
    kind: "none",
    ringCount: 0,
    durationMs: 0,
    staggerMs: 0,
    scaleFrom: 1,
    scaleTo: 1,
    opacityFrom: 0,
    opacityTo: 0,
    transition: "easeOut",
    reason: "no-pattern",
  };
}
