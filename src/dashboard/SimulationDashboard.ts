// URAI Spatial - Live Simulation Dashboard
// Minimal introspection layer for SystemLoop visibility

import type { EventEmitter } from "events";

export type DashboardOptions = {
  enabled?: boolean;
  logIntervalMs?: number;
};

export class SimulationDashboard {
  private engine: EventEmitter;
  private enabled: boolean;
  private logIntervalMs: number;
  private interval?: NodeJS.Timeout;

  private metrics = {
    ticks: 0,
    events: 0,
    lastMemoryNodes: 0,
    lastPredictions: 0,
    lastXRObjects: 0,
  };

  constructor(engine: EventEmitter, options: DashboardOptions = {}) {
    this.engine = engine;
    this.enabled = options.enabled ?? true;
    this.logIntervalMs = options.logIntervalMs ?? 2000;
  }

  attach() {
    if (!this.enabled) return;

    this.engine.on("*", () => {
      this.metrics.events += 1;
    });

    this.engine.on("tick", () => {
      this.metrics.ticks += 1;
    });

    this.engine.on("state.snapshot", (state: any) => {
      if (!state) return;
      this.metrics.lastMemoryNodes = state?.snapshot?.totalNodes ?? 0;
      this.metrics.lastPredictions = state?.prediction?.candidates?.length ?? 0;
      this.metrics.lastXRObjects = state?.frame?.objects?.length ?? 0;
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
    if (this.interval) clearInterval(this.interval);
  }
}