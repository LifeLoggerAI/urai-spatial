export type SimulationEvent = {
  type: string;
  payload?: any;
  timestamp: number;
};

export interface SimulationPlugin {
  name: string;
  onEvent?: (event: SimulationEvent, engine: SimulationEngine) => void;
  tick?: (engine: SimulationEngine) => void;
}

export class SimulationEngine {
  private plugins: SimulationPlugin[] = [];
  private eventQueue: SimulationEvent[] = [];
  private running = false;

  registerPlugin(plugin: SimulationPlugin) {
    this.plugins.push(plugin);
  }

  emit(event: Omit<SimulationEvent, 'timestamp'>) {
    this.eventQueue.push({
      ...event,
      timestamp: Date.now(),
    });
  }

  private processEvents() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      for (const plugin of this.plugins) {
        plugin.onEvent?.(event, this);
      }
    }
  }

  private tick() {
    this.processEvents();
    for (const plugin of this.plugins) {
      plugin.tick?.(this);
    }
  }

  start(intervalMs = 1000) {
    if (this.running) return;
    this.running = true;

    setInterval(() => {
      this.tick();
    }, intervalMs);
  }

  stop() {
    this.running = false;
  }
}
