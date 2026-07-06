import type { AnalyticsEvent } from "./analyticsBridge";

export type SimulationAdjustment = {
  id: string;
  timestamp: number;
  target: "simulation.load" | "simulation.stability" | "simulation.behavior";
  action: "reduce_load" | "stabilize" | "observe";
  strength: number;
  reason: string;
  metadata?: Record<string, unknown>;
};

export class FeedbackBridge {
  private buffer: SimulationAdjustment[] = [];

  ingest(event: AnalyticsEvent) {
    const adjustment: SimulationAdjustment = {
      id: `feedback-${event.id}-${Date.now()}`,
      timestamp: Date.now(),
      target: this.selectTarget(event),
      action: this.selectAction(event),
      strength: this.computeStrength(event),
      reason: this.explain(event),
      metadata: {
        eventType: event.type,
        metrics: event.metrics
      }
    };

    this.buffer.push(adjustment);
    return adjustment;
  }

  flush(): SimulationAdjustment[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  peek(): SimulationAdjustment[] {
    return [...this.buffer];
  }

  private selectTarget(event: AnalyticsEvent): SimulationAdjustment["target"] {
    if (event.metrics.payloadSize > 5000) return "simulation.load";
    if (event.type.toLowerCase().includes("error")) return "simulation.stability";
    return "simulation.behavior";
  }

  private selectAction(event: AnalyticsEvent): SimulationAdjustment["action"] {
    if (event.metrics.payloadSize > 5000) return "reduce_load";
    if (event.type.toLowerCase().includes("error")) return "stabilize";
    return "observe";
  }

  private computeStrength(event: AnalyticsEvent): number {
    const payloadSize = event.metrics.payloadSize ?? 0;
    return Math.max(0.05, Math.min(1, payloadSize / 10000));
  }

  private explain(event: AnalyticsEvent): string {
    if (event.metrics.payloadSize > 5000) {
      return "Large payload observed; recommend reducing runtime load.";
    }

    if (event.type.toLowerCase().includes("error")) {
      return "Error-like event observed; recommend stabilizing simulation behavior.";
    }

    return "Normal event observed; recommend continued observation.";
  }
}
