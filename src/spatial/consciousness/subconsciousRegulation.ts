import type { EnvironmentDirective } from "./environmentDirective";

export type SubconsciousRegulation = {
  invisible: true;
  active: boolean;
  breathScale: number;
  luminanceScale: number;
  motionScale: number;
  warmthScale: number;
  opacityShift: number;
  reason: string;
};

export function createSubconsciousRegulation(directive: EnvironmentDirective): SubconsciousRegulation {
  if (!directive.immediate || directive.mode === "none") {
    return {
      invisible: true,
      active: false,
      breathScale: 1,
      luminanceScale: 1,
      motionScale: 1,
      warmthScale: 1,
      opacityShift: 0,
      reason: "no-directive",
    };
  }

  switch (directive.mode) {
    case "stabilize":
      return {
        invisible: true,
        active: true,
        breathScale: 0.72,
        luminanceScale: 0.82,
        motionScale: 0.68,
        warmthScale: 0.94,
        opacityShift: -0.04,
        reason: "subtle-grounding",
      };
    case "narrow":
      return {
        invisible: true,
        active: true,
        breathScale: 0.84,
        luminanceScale: 0.94,
        motionScale: 0.78,
        warmthScale: 0.98,
        opacityShift: -0.015,
        reason: "subtle-focus",
      };
    case "soften":
      return {
        invisible: true,
        active: true,
        breathScale: 0.76,
        luminanceScale: 0.9,
        motionScale: 0.74,
        warmthScale: 1.08,
        opacityShift: 0.02,
        reason: "subtle-recovery",
      };
    case "brighten":
      return {
        invisible: true,
        active: true,
        breathScale: 1.04,
        luminanceScale: 1.08,
        motionScale: 1.02,
        warmthScale: 1.04,
        opacityShift: 0.025,
        reason: "subtle-momentum",
      };
    default:
      return {
        invisible: true,
        active: false,
        breathScale: 1,
        luminanceScale: 1,
        motionScale: 1,
        warmthScale: 1,
        opacityShift: 0,
        reason: "default",
      };
  }
}
