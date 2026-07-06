// URAI Spatial - Live Simulation Dashboard
// Minimal introspection layer for the canonical SystemLoop event bus.

import type { EventBus, KernelEvent } from "../kernel/eventBus";

export type DashboardOptions = {
  enabled?: boolean;
  logIntervalMs?: number;
};

export class SimulationDashboard {
  private readonly bus: EventBus;
  private readonly enabled: boolean;
  private readonly logIntervalMs: number;
  private interval?: NodeJS.Timeout;
  private detachWildcard?: () => void;
  private detachTick?: () => void;
  private detachSnapshot?: () => void;

  private metrics = {
    ticks: 0,
    events: 0,
    lastMemoryNodes: 0,
    lastPredictions: 0,
    lastXRObjects: 0,
  };

  constructor(bus: EventBus, options: DashboardOptions = {}) {
    this.bus = bus;
    this.enabled = options.enabled ?? true;
    this.logIntervalMs = options.logIntervalMs ?? 2000;
  }

  attach() {
    if (!this.enabled) return;

    this.detachWildcard = this.bus.on("*", () => {
      this.metrics.events += 1;
    });

    this.detachTick = this.bus.on("system.tick", () => {
      this.metrics.ticks += 1;
    });

    this.detachSnapshot = this.bus.on("state.snapshot", (event: KernelEvent) => {
      const state = event.payload as
        | {
            snapshot?: { totalNodes?: number };
            prediction?: { candidates?: unknown[] };
            frame?: { objects?: unknown[] };
          }
        | undefined;

      if (!state) return;

      this.metrics.lastMemoryNodes = state.snapshot?.totalNodes ?? 0;
      this.metrics.lastPredictions = state.prediction?.candidates?.length ?? 0;
      this.metrics.lastXRObjects = state.frame?.objects?.length ?? 0;
    });

    this.interval = setInterval(() => this.render(), this.logIntervalMs);
  }

  private render() {
    const output = {
      runtime: "URAI Spatial Dashboard",
      ticks: this.metrics.ticks,
      events: this.metrics.events,
      memoryNodes: this.metrics.lastMemoryNodes,
      predictions: this.metrics.lastPredictions,
      xrObjects: this.metrics.lastXRObjects,
      timestamp: Date.now(),
    };

    console.log("\n[URAI DASHBOARD]");
    console.table(output);
  }

  stop() {
    this.detachWildcard?.();
    this.detachTick?.();
    this.detachSnapshot?.();
    this.detachWildcard = undefined;
    this.detachTick = undefined;
    this.detachSnapshot = undefined;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }
}
