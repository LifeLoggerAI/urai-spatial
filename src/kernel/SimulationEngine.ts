import { EventBus, type KernelEvent } from "./eventBus";

export type SimulationPluginContext<TState = Record<string, unknown>> = {
  tick: number;
  state: TState;
  bus: EventBus;
  emit: <TPayload = unknown>(
    type: string,
    payload?: TPayload,
    source?: string
  ) => Promise<void>;
};

export type SimulationPlugin<TState = Record<string, unknown>> = {
  name: string;
  onRegister?: (ctx: SimulationPluginContext<TState>) => void | Promise<void>;
  onEvent?: (
    event: KernelEvent,
    ctx: SimulationPluginContext<TState>
  ) => void | Promise<void>;
  onTick?: (ctx: SimulationPluginContext<TState>) => void | Promise<void>;
};

export type SimulationEngineOptions<TState = Record<string, unknown>> = {
  initialState?: TState;
  tickIntervalMs?: number;
};

export class SimulationEngine<TState = Record<string, unknown>> {
  readonly bus = new EventBus();

  private plugins: SimulationPlugin<TState>[] = [];
  private tickCount = 0;
  private state: TState;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private tickIntervalMs: number;

  constructor(options: SimulationEngineOptions<TState> = {}) {
    this.state = (options.initialState ?? ({} as TState));
    this.tickIntervalMs = options.tickIntervalMs ?? 1000;

    this.bus.on("*", async (event) => {
      await this.dispatchEvent(event);
    });
  }

  get tick() {
    return this.tickCount;
  }

  get isRunning() {
    return this.running;
  }

  getState() {
    return this.state;
  }

  setState(nextState: TState) {
    this.state = nextState;
  }

  patchState(partial: Partial<TState>) {
    this.state = {
      ...(this.state as Record<string, unknown>),
      ...(partial as Record<string, unknown>)
    } as TState;
  }

  async register(plugin: SimulationPlugin<TState>) {
    this.plugins.push(plugin);
    await plugin.onRegister?.(this.createContext());
  }

  async emit<TPayload = unknown>(type: string, payload?: TPayload, source = "simulation-engine") {
    await this.bus.emit(this.bus.createEvent(type, payload, source));
  }

  async step() {
    this.tickCount += 1;

    await this.emit("system.tick", {
      tick: this.tickCount,
      running: this.running
    });

    const ctx = this.createContext();

    for (const plugin of this.plugins) {
      await plugin.onTick?.(ctx);
    }
  }

  start(intervalMs = this.tickIntervalMs) {
    if (this.running) return;

    this.running = true;
    this.tickIntervalMs = intervalMs;

    void this.emit("system.started", {
      tick: this.tickCount,
      intervalMs
    });

    this.timer = setInterval(() => {
      void this.step();
    }, intervalMs);
  }

  stop() {
    if (!this.running) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.running = false;

    void this.emit("system.stopped", {
      tick: this.tickCount
    });
  }

  private async dispatchEvent(event: KernelEvent) {
    const ctx = this.createContext();

    for (const plugin of this.plugins) {
      await plugin.onEvent?.(event, ctx);
    }
  }

  private createContext(): SimulationPluginContext<TState> {
    return {
      tick: this.tickCount,
      state: this.state,
      bus: this.bus,
      emit: async (type, payload, source) => {
        await this.emit(type, payload, source);
      }
    };
  }
}
