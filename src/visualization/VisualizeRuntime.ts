// URAI Spatial - Visualization Runtime Layer
// Bridges SystemLoop → XRRuntimeView → XRWebRenderer into a live render cycle

import { createSystemLoop } from "../kernel/SystemLoop";
import { XRRuntimeView } from "../xr/XRRuntimeView";
import { XRWebRenderer } from "../xr/XRWebRenderer";

/**
 * VisualizationRuntime
 * Turns simulation state into a continuously rendered spatial world
 */
export class VisualizationRuntime {
  private loop: any;
  private xrView: XRRuntimeView;
  private renderer: XRWebRenderer;
  private running = false;

  constructor() {
    this.xrView = new XRRuntimeView();

    // minimal scene stub (replace with Three.js later)
    const scene = {
      add: () => {},
      remove: () => {}
    };

    this.renderer = new XRWebRenderer(scene);
  }

  async init() {
    this.loop = await createSystemLoop({
      tickIntervalMs: 1000,
      replayLimit: 50
    });

    await this.loop.initialize();
  }

  private renderFrame(state: any) {
    const frame = this.xrView.buildFrame(state);
    this.renderer.applyFrame(frame);
    this.renderer.render();
  }

  async start(fps = 30) {
    this.running = true;

    const step = async () => {
      if (!this.running) return;

      const result = await this.loop.runOnce();

      // feed latest simulation state into XR pipeline
      this.renderFrame(result.snapshot);

      setTimeout(step, 1000 / fps);
    };

    step();
  }

  stop() {
    this.running = false;
  }
}

/**
 * Auto-run hook (optional entry)
 */
export async function bootVisualization() {
  const viz = new VisualizationRuntime();
  await viz.init();
  viz.start(20);

  console.log("URAI Visualization Runtime started");
}
