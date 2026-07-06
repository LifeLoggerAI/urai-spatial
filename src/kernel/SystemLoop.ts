import { SimulationEngine } from "./SimulationEngine";
import { MemoryGraphPlugin } from "../memory/MemoryGraphPlugin";
import { ReplayEngine } from "../memory/ReplayEngine";
import { PredictionEngine, type PredictionResult } from "../prediction/PredictionEngine";
import { XRRuntime, type XRFrame } from "../xr/XRRuntime";

export type SystemLoopState = {
  startedAt: number;
  lastRunAt?: number;
  totalRuns: number;
  lastPrediction?: PredictionResult;
  lastXRFrame?: XRFrame;
};

export type SystemLoopOptions = {
  tickIntervalMs?: number;
  replayLimit?: number;
};

export class SystemLoop<TState = Record<string, unknown>> {
  readonly engine: SimulationEngine<TState>;
  readonly memory: MemoryGraphPlugin<TState>;
  readonly replay: ReplayEngine;
  readonly prediction: PredictionEngine;
  readonly xr: XRRuntime;

  private replayLimit: number;
  private loopState: SystemLoopState = {
    startedAt: Date.now(),
    totalRuns: 0
  };

  constructor(options: SystemLoopOptions = {}) {
    this.engine = new SimulationEngine<TState>({
      tickIntervalMs: options.tickIntervalMs ?? 1000
    });

    this.memory = new MemoryGraphPlugin<TState>();
    this.replay = new ReplayEngine();
    this.prediction = new PredictionEngine();
    this.xr = new XRRuntime();
    this.replayLimit = options.replayLimit ?? 50;
  }

  async initialize() {
    await this.engine.register(this.memory);

    await this.engine.emit("system.loop.initialized", {
      replayLimit: this.replayLimit
    }, "system-loop");
  }

  async runOnce() {
    await this.engine.step();

    const snapshot = this.memory.snapshot();
    const timeline = this.replay.buildTimeline(snapshot, {
      limit: this.replayLimit
    });

    const prediction = this.prediction.predict(timeline);
    await this.prediction.emitPrediction(prediction, this.engine.bus);

    const frame = this.xr.renderPrediction(prediction, this.engine.tick);
    await this.xr.emitFrame(frame, this.engine.bus);

    this.loopState = {
      ...this.loopState,
      lastRunAt: Date.now(),
      totalRuns: this.loopState.totalRuns + 1,
      lastPrediction: prediction,
      lastXRFrame: frame
    };

    await this.engine.emit("system.loop.completed", {
      tick: this.engine.tick,
      totalRuns: this.loopState.totalRuns,
      predictionId: prediction.id,
      xrFrameId: frame.id
    }, "system-loop");

    return {
      snapshot,
      timeline,
      prediction,
      frame,
      state: this.getState()
    };
  }

  start() {
    this.engine.start();
  }

  stop() {
    this.engine.stop();
  }

  getState(): SystemLoopState {
    return { ...this.loopState };
  }
}

export async function createSystemLoop(options: SystemLoopOptions = {}) {
  const loop = new SystemLoop(options);
  await loop.initialize();
  return loop;
}
