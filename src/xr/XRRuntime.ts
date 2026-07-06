import type { EventBus } from "../kernel/eventBus";
import type { PredictionResult, PredictionCandidate } from "../prediction/PredictionEngine";

export type XRObject = {
  id: string;
  kind: "anchor" | "signal" | "prediction" | "memory" | "system";
  label: string;
  confidence?: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  metadata?: Record<string, unknown>;
};

export type XRFrame = {
  id: string;
  createdAt: number;
  tick: number;
  objects: XRObject[];
  dominantPrediction?: PredictionCandidate;
};

export type XRRuntimeState = {
  lastFrame?: XRFrame;
  framesRendered: number;
  activeObjects: number;
};

export class XRRuntime {
  private state: XRRuntimeState = {
    framesRendered: 0,
    activeObjects: 0
  };

  renderPrediction(result: PredictionResult, tick = 0): XRFrame {
    const objects = result.candidates.map((candidate, index) =>
      this.candidateToObject(candidate, index)
    );

    const frame: XRFrame = {
      id: `xr-frame-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      tick,
      objects,
      dominantPrediction: result.topCandidate
    };

    this.state = {
      lastFrame: frame,
      framesRendered: this.state.framesRendered + 1,
      activeObjects: objects.length
    };

    return frame;
  }

  async emitFrame(frame: XRFrame, bus: EventBus, source = "xr-runtime") {
    await bus.emit(
      bus.createEvent(
        "xr.frame.rendered",
        {
          frameId: frame.id,
          tick: frame.tick,
          objectCount: frame.objects.length,
          dominantPrediction: frame.dominantPrediction,
          objects: frame.objects
        },
        source
      )
    );
  }

  getState(): XRRuntimeState {
    return { ...this.state };
  }

  private candidateToObject(candidate: PredictionCandidate, index: number): XRObject {
    return {
      id: `xr-object-${candidate.id}`,
      kind: "prediction",
      label: candidate.predictedType,
      confidence: candidate.confidence,
      position: this.layoutPosition(index, candidate.confidence),
      metadata: {
        reason: candidate.reason,
        basedOnEventType: candidate.basedOnEventType,
        source: candidate.source,
        payload: candidate.payload
      }
    };
  }

  private layoutPosition(index: number, confidence = 0) {
    const angle = index * 0.78539816339;
    const radius = 1 + index * 0.35;

    return {
      x: Math.cos(angle) * radius,
      y: confidence * 2,
      z: Math.sin(angle) * radius
    };
  }
}
