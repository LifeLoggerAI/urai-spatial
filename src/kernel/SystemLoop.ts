import { SimulationEngine } from "./SimulationEngine";
import { MemoryGraphPlugin } from "../memory/MemoryGraphPlugin";
import { ReplayEngine } from "../memory/ReplayEngine";
import { PredictionEngine, type PredictionResult } from "../prediction/PredictionEngine";
import { XRRuntime, type XRFrame } from "../xr/XRRuntime";
import { CommunicationsBridge, type CommunicationPacket } from "../bridges/communicationsBridge";
import { AnalyticsBridge, type AnalyticsEvent } from "../bridges/analyticsBridge";

export type SystemLoopState = {
  startedAt: number;
  lastRunAt?: number;
  totalRuns: number;
  lastPrediction?: PredictionResult;
  lastXRFrame?: XRFrame;
  lastPackets?: CommunicationPacket[];
  lastAnalyticsEvents?: AnalyticsEvent[];
};

export type SystemLoopOptions = {
  tickIntervalMs?: number;
  replayLimit?: number;
  initialState?: Partial<SystemLoopState>;
};

export class SystemLoop<TState = Record<string, unknown>> {
  readonly engine: SimulationEngine<TState>;
  readonly memory: MemoryGraphPlugin<TState>;
  readonly replay: ReplayEngine;
  readonly prediction: PredictionEngine;
  readonly xr: XRRuntime;
  readonly communications: CommunicationsBridge;
  readonly analytics: AnalyticsBridge;

  private readonly replayLimit: number;

  private simulationState = {
    intentVector: [] as unknown[],
    predictedBias: null as number | null,
    memoryWeighting: {} as Record<string, unknown>,
  };

  private loopState: SystemLoopState;

  constructor(options: SystemLoopOptions = {}) {
    this.engine = new SimulationEngine<TState>({
      tickIntervalMs: options.tickIntervalMs ?? 1000,
    });
    this.memory = new MemoryGraphPlugin<TState>();
    this.replay = new ReplayEngine();
    this.prediction = new PredictionEngine();
    this.xr = new XRRuntime();
    this.communications = new CommunicationsBridge();
    this.analytics = new AnalyticsBridge();
    this.replayLimit = options.replayLimit ?? 50;

    this.loopState = {
      startedAt: options.initialState?.startedAt ?? Date.now(),
      totalRuns: options.initialState?.totalRuns ?? 0,
      lastRunAt: options.initialState?.lastRunAt,
      lastPrediction: options.initialState?.lastPrediction,
      lastXRFrame: options.initialState?.lastXRFrame,
      lastPackets: options.initialState?.lastPackets,
      lastAnalyticsEvents: options.initialState?.lastAnalyticsEvents,
    };
  }

  async initialize() {
    await this.engine.register(this.memory);

    this.engine.bus.on("*", (event) => {
      this.communications.push(event);
    });

    await this.engine.emit(
      "system.loop.initialized",
      {
        replayLimit: this.replayLimit,
        restoredRuns: this.loopState.totalRuns,
      },
      "system-loop"
    );
  }

  private applySimulationMutationBridge(
    state: typeof this.simulationState,
    prediction: PredictionResult,
    snapshot: ReturnType<MemoryGraphPlugin<TState>["snapshot"]>
  ) {
    return {
      ...state,
      predictedBias: prediction.confidence ?? 0.5,
      intentVector: snapshot.events.slice(-10),
      memoryWeighting: {
        ...state.memoryWeighting,
        lastConfidence: prediction.confidence ?? 0.5,
      },
    };
  }

  async runOnce() {
    await this.engine.step();

    const snapshot = this.memory.snapshot();
    const timeline = this.replay.buildTimeline(snapshot, {
      limit: this.replayLimit,
    });

    const prediction = this.prediction.predict(timeline);
    await this.prediction.emitPrediction(prediction, this.engine.bus);

    this.simulationState = this.applySimulationMutationBridge(
      this.simulationState,
      prediction,
      snapshot
    );

    const frame = this.xr.renderPrediction(prediction, this.engine.tick);
    await this.xr.emitFrame(frame, this.engine.bus);

    const packets = this.communications.flush();
    const analyticsEvents = packets.map((packet) => this.analytics.ingest(packet));

    this.loopState = {
      ...this.loopState,
      lastRunAt: Date.now(),
      totalRuns: this.loopState.totalRuns + 1,
      lastPrediction: prediction,
      lastXRFrame: frame,
      lastPackets: packets,
      lastAnalyticsEvents: analyticsEvents,
    };

    await this.engine.emit(
      "system.loop.completed",
      {
        tick: this.engine.tick,
        totalRuns: this.loopState.totalRuns,
        predictionId: prediction.id,
        xrFrameId: frame.id,
        packets: packets.length,
        analyticsEvents: analyticsEvents.length,
      },
      "system-loop"
    );

    return {
      snapshot,
      timeline,
      prediction,
      frame,
      packets,
      analyticsEvents,
      state: this.getState(),
      simulationState: this.simulationState,
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
