// URAI Spatial - Bootstrap Entry Runtime
// Wires the full simulation → XR render pipeline together

import { XRRuntimeView } from "../xr/XRRuntimeView";
import { XRWebRenderer } from "../xr/XRWebRenderer";

// NOTE: assuming these exist in repo as previously built modules
import { SimulationState } from "../kernel/SimulationState";

/**
 * Main runtime bootstrap
 * SystemLoop → SimulationState → XRRuntimeView → XRWebRenderer
 */
export class URAIRuntime {
  private state: SimulationState;
  private xrView: XRRuntimeView;
  private renderer: XRWebRenderer;

  private running = false;

  constructor() {
    this.state = new SimulationState();
    this.xrView = new XRRuntimeView();

    // placeholder scene object (replace with Three.js scene later)
    const scene = {
      add: (obj: any) => {},
      remove: (obj: any) => {},
    };

    this.renderer = new XRWebRenderer(scene);
  }

  /**
   * Single simulation tick
   */
  tick() {
    // 1. evolve simulation state (SystemLoop responsibility)
    if (typeof (this.state as any).tick === "function") {
      (this.state as any).tick();
    }

    // 2. project state → XR frame
    const frame = this.xrView.buildFrame(this.state as any);

    // 3. render frame
    this.renderer.applyFrame(frame);
    this.renderer.render();
  }

  /**
   * Start runtime loop
   */
  start(fps = 30) {
    if (this.running) return;
    this.running = true;

    const interval = 1000 / fps;

    const loop = () => {
      if (!this.running) return;
      this.tick();
      setTimeout(loop, interval);
    };

    loop();
  }

  stop() {
    this.running = false;
  }
}

/**
 * Auto-run if executed directly
 */
const runtime = new URAIRuntime();
runtime.start(20);

console.log("[URAI] Runtime booted");
