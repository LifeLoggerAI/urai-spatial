// URAI Spatial - XR Runtime View Layer
// Converts SimulationState into renderable spatial scene data

import type { SimulationState } from "../kernel/SimulationState";

export type XRFrame = {
  objects: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
    meta?: any;
  }>;
};

/**
 * XRRuntimeView is a pure projection layer:
 * SimulationState → XRFrame
 */
export class XRRuntimeView {
  /**
   * Build a renderable frame from simulation state
   */
  buildFrame(state: SimulationState): XRFrame {
    const objects = [
      ...state.xr.map((obj, i) => ({
        id: obj.id,
        type: obj.type,
        position: obj.position ?? {
          x: i * 2,
          y: 0,
          z: 0,
        },
        meta: obj.data,
      })),
      ...state.memory.slice(-5).map((m, i) => ({
        id: "memory-" + m.id,
        type: "memory-node",
        position: {
          x: i * 1.5,
          y: 2,
          z: -2,
        },
        meta: m.data,
      })),
    ];

    return { objects };
  }

  /**
   * Placeholder render hook (to be connected to Three.js / WebXR later)
   */
  render(frame: XRFrame) {
    console.log("[XRRuntimeView] frame objects:", frame.objects.length);
  }
}
