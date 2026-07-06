// URAI Spatial - Simulation Engine Core
// Plugin-driven deterministic simulation loop

import type { SimulationEnginePlugin } from "../plugins/SimulationEnginePlugin";
import type { SimulationState } from "../kernel/SimulationState";

export class SimulationEngine {
  private plugins: SimulationEnginePlugin[] = [];
  private running = false;
  private lastTick = Date.now();

  constructor(private state: SimulationState) {}

  register(plugin: SimulationEnginePlugin) {
    this.plugins.push(plugin);
    plugin.onInit?.(this.state);
  }

  start(tickRateMs = 50) {
    if (this.running) return;
    this.running = true;

    const loop = () => {
      if (!this.running) return;

      const now = Date.now();
      const dt = now - this.lastTick;
      this.lastTick = now;

      for (const p of this.plugins) {
        p.beforeTick?.(this.state, dt);
      }

      this.state.tick += 1;

      for (const p of this.plugins) {
        p.afterTick?.(this.state, dt);
      }

      for (const p of this.plugins) {
        if (p.reduceState) {
          this.state = p.reduceState(this.state);
        }
      }

      setTimeout(loop, tickRateMs);
    };

    loop();
  }

  stop() {
    this.running = false;
  }

  getState() {
    return this.state;
  }
}
